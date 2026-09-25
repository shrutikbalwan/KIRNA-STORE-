import { useMemo, useState, useEffect, useRef } from 'react'
import { Search, ShoppingBag, CheckCircle2, Loader2, Building2 } from 'lucide-react'
import { api } from '../lib/api'

type Product = { id: string; name: string; selling: number; purchase: number; stock: number; unit: string; color: string; sku?: string; isWeighable?: boolean }
type Supplier = { id: string; name: string; phone: string; balance: number }
type PurchaseRecord = { id: string; invoiceNumber: string; items: Array<{ productId: string; product: string; quantity: number; price: number }>; total: number; paymentStatus: string; createdAt: string; supplierId: string }
type CartItem = Product & { quantity: number, customPrice: number }

export function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Credit'>('Paid')
  const [purchaseError, setPurchaseError] = useState('')
  const [invoice, setInvoice] = useState<PurchaseRecord | null>(null)
  const [weighProduct, setWeighProduct] = useState<Product | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    Promise.all([
      api.get<Product[]>('/products'),
      api.get<Supplier[]>('/suppliers').catch(() => [])
    ]).then(([pData, sData]) => {
      setProducts(pData)
      setSuppliers(sData)
      setLoading(false)
    }).catch(err => {
      setPurchaseError('Failed to load data.')
      setLoading(false)
    })
  }, [])

  const results = products.filter(product => product.name.toLowerCase().includes(query.toLowerCase()) || product.sku?.toLowerCase().includes(query.toLowerCase()))
  const total = cart.reduce((sum, item) => sum + item.customPrice * item.quantity, 0)

  async function completePurchase() {
    if (!cart.length) return
    if (!selectedSupplier) return setPurchaseError('Please select a supplier.')
    
    try {
      const now = new Date()
      const newPurchase: PurchaseRecord = {
        id: `purchase-${now.getTime()}`,
        invoiceNumber: `PO-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        items: cart.map(item => ({ productId: item.id, product: item.name, quantity: item.quantity, price: item.customPrice })),
        total,
        paymentStatus,
        createdAt: now.toISOString(),
        supplierId: selectedSupplier.id
      }
      
      const createdPurchase = await api.post<PurchaseRecord>('/purchases', newPurchase)
      
      // Update inventory stock and cost price
      const updatedProducts = await Promise.all(cart.map(async item => {
        const product = products.find(p => p.id === item.id)
        if (!product) return item
        // Optionally update the purchase price if it changed, but we'll stick to updating stock
        const updated = await api.put<Product>(`/products/${item.id}`, { ...product, stock: product.stock + item.quantity, purchase: item.customPrice })
        return updated
      }))
      
      setProducts(products.map(p => updatedProducts.find(up => up.id === p.id) || p))
      
      // Update supplier balance if on credit
      if (paymentStatus === 'Credit') {
        const updatedSupplier = await api.put<Supplier>(`/suppliers/${selectedSupplier.id}`, { ...selectedSupplier, balance: selectedSupplier.balance + total })
        setSuppliers(suppliers.map(s => s.id === selectedSupplier.id ? updatedSupplier : s))
      }
      
      setInvoice(createdPurchase)
      setCart([])
      setPurchaseError('')
    } catch (err) {
      setPurchaseError('Failed to complete purchase order.')
    }
  }

  function addToCart(product: Product) { 
    if (product.isWeighable) {
      setWeighProduct(product)
      return
    }
    setCart(current => { 
      const existing = current.find(item => item.id === product.id); 
      return existing 
        ? current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) 
        : [...current, { ...product, quantity: 1, customPrice: product.purchase }] 
    }) 
  }
  
  function confirmWeight(product: Product, weight: number) {
    setCart(current => { 
      const existing = current.find(item => item.id === product.id); 
      return existing 
        ? current.map(item => item.id === product.id ? { ...item, quantity: weight } : item) 
        : [...current, { ...product, quantity: weight, customPrice: product.purchase }] 
    })
    setWeighProduct(null)
  }
  
  function changeQuantity(id: string, amount: number) { 
    setCart(current => current.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item)) 
  }
  
  function changePrice(id: string, price: number) {
    setCart(current => current.map(item => item.id === id ? { ...item, customPrice: Math.max(0, price) } : item))
  }
  
  function removeFromCart(id: string) { setCart(current => current.filter(item => item.id !== id)) }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="sales-page"><section className="page-heading"><div><span className="section-kicker">SUPPLY CHAIN</span><h2>Purchase Order</h2><p>Restock your inventory from wholesale vendors.</p></div><span className="sale-date">Today · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span></section><section className="pos-layout"><article className="dashboard-panel product-picker"><div className="panel-heading"><div><h3>Select products</h3><p className="panel-note">Search your inventory to restock.</p></div><span className="item-count">{products.length} items</span></div><label className="search-box pos-search"><span><Search size={16} /></span><input ref={searchInputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by product name..." aria-label="Search products"/></label><div className="pos-results">{results.length ? results.map(product => <button className="pos-product" key={product.id} onClick={() => addToCart(product)}><span className={`product-thumb ${product.color}`}>{product.name.slice(0, 1)}</span><span><strong>{product.name}</strong><small>Current stock: {product.stock} {product.unit}</small></span><b>₹{product.purchase.toLocaleString('en-IN')}</b><span className="add-sign">＋</span></button>) : <div className="stock-empty">No products found. Add them in Inventory first.</div>}</div></article><article className="dashboard-panel cart-panel"><div className="panel-heading"><div><h3>Purchase cart</h3><p className="panel-note">{cart.length ? `${cart.length} product${cart.length > 1 ? 's' : ''} selected` : 'No items selected'}</p></div><span className="cart-bag"><ShoppingBag size={24} color="#64748b" /></span></div>{cart.length ? <div className="cart-list">{cart.map(item => <div className="cart-row" key={item.id} style={{ flexWrap: 'wrap' }}><div className={`product-thumb ${item.color}`}>{item.name.slice(0, 1)}</div><div className="cart-product"><strong>{item.name}</strong><div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><span>Price: ₹</span><input type="number" style={{ width: '60px', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)' }} value={item.customPrice || ''} onChange={e => changePrice(item.id, Number(e.target.value))} /><span>/ {item.unit}</span></div></div><div className="quantity-controls"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Reduce ${item.name}`}>−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Add ${item.name}`}>＋</button></div><b>₹{(item.customPrice * item.quantity).toLocaleString('en-IN')}</b><button className="remove-product" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}>×</button></div>)}</div> : <div className="cart-empty"><div className="empty-illustration" style={{display:'flex',justifyContent:'center',marginBottom:'8px'}}><Building2 size={48} color="#cbd5e1"/></div><strong>Add products to start</strong><p>Selected items will appear here.</p></div>}<div className="payment-section"><div className="customer-selection" style={{ marginBottom: '16px' }}><div className="payment-title"><h4>Supplier</h4></div><select className="search-box pos-search" style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }} value={selectedSupplier?.id || ''} onChange={e => { const supp = suppliers.find(s => s.id === e.target.value) || null; setSelectedSupplier(supp); }}><option value="">Select a vendor...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}</select></div><div className="payment-title"><h4>Payment status</h4><span>Are you paying now or buying on credit?</span></div><div className="payment-methods"><button className={paymentStatus === 'Paid' ? 'selected' : ''} onClick={() => setPaymentStatus('Paid')}>Paid (Cash/Bank)</button><button className={paymentStatus === 'Credit' ? 'selected' : ''} onClick={() => setPaymentStatus('Credit')} style={{ color: paymentStatus === 'Credit' ? 'var(--orange-dark)' : undefined }}>Credit (Udhaar)</button></div></div><div className="billing-summary"><div className="final-total"><span>Total amount</span><strong>₹{total.toLocaleString('en-IN')}</strong></div></div><button className="primary-button sale-button" onClick={completePurchase} disabled={!cart.length || !selectedSupplier}>Place Purchase Order →</button>{purchaseError && <p className="sale-error" role="alert">{purchaseError}</p>}{invoice && <div className="invoice-success" role="status"><span className="invoice-check"><CheckCircle2 size={24} color="#10b981" /></span><div><strong>Purchase recorded!</strong><span>{invoice.invoiceNumber} · Inventory stock updated</span></div></div>}</article></section>
{weighProduct && <ScalePadModal product={weighProduct} onClose={() => setWeighProduct(null)} onConfirm={(w) => confirmWeight(weighProduct, w)} />}
</div>
}

function ScalePadModal({ product, onClose, onConfirm }: { product: Product, onClose: () => void, onConfirm: (weight: number) => void }) {
  const [weightStr, setWeightStr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => { inputRef.current?.focus() }, [])
  
  function handleKey(key: string) {
    if (key === 'C') setWeightStr('')
    else if (key === '.' && weightStr.includes('.')) return
    else setWeightStr(s => s + key)
  }
  
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <section className="product-form-card" role="dialog" aria-modal="true" style={{ maxWidth: '400px' }}>
        <div className="form-heading">
          <div><span className="section-kicker">WEIGHING SCALE</span><h3>{product.name}</h3><p>Enter the exact weight ({product.unit})</p></div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <input 
            ref={inputRef}
            type="text" 
            value={weightStr} 
            onChange={e => {
              const val = e.target.value.replace(/[^0-9.]/g, '')
              if (val.split('.').length > 2) return
              setWeightStr(val)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { const w = parseFloat(weightStr); if (w > 0) onConfirm(w) }
            }}
            placeholder={`0.000 ${product.unit}`}
            style={{ fontSize: '2.5rem', textAlign: 'center', width: '100%', padding: '16px', border: '2px solid var(--primary)', borderRadius: 'var(--radius-md)', marginBottom: '24px', fontWeight: 'bold' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {['7','8','9','4','5','6','1','2','3','C','0','.'].map(k => (
              <button 
                key={k} 
                onClick={() => handleKey(k)}
                style={{ padding: '16px', fontSize: '1.5rem', fontWeight: 600, backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <button className="primary-button" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={() => { const w = parseFloat(weightStr); if (w > 0) onConfirm(w) }}>Confirm Weight</button>
      </section>
    </div>
  )
}
