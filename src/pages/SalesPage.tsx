import { useMemo, useState, useEffect, useRef } from 'react'
import { Search, ShoppingBag, Banknote, Smartphone, CreditCard, CheckCircle2, Loader2, MessageCircle } from 'lucide-react'
import { api } from '../lib/api'

type Product = { id: string; name: string; selling: number; purchase: number; stock: number; unit: string; color: string; sku?: string; taxRate?: number; isWeighable?: boolean }
type Customer = { id: string; name: string; phone: string; points?: number }
type SaleRecord = { id: string; invoiceNumber: string; items: Array<{ productId: string; product: string; quantity: number; price: number }>; subtotal: number; discount: number; total: number; profit: number; paymentMethod: string; createdAt: string; customerId?: string; pointsEarned?: number; pointsRedeemed?: number; taxAmount?: number }
type CartItem = Product & { quantity: number }

export function SalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [redeemPoints, setRedeemPoints] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash')
  const [cashReceived, setCashReceived] = useState(0)
  const [saleError, setSaleError] = useState('')
  const [invoice, setInvoice] = useState<SaleRecord | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [whatsappToast, setWhatsappToast] = useState('')
  const [weighProduct, setWeighProduct] = useState<Product | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    Promise.all([
      api.get<Product[]>('/products'),
      api.get<Customer[]>('/customers'),
      api.get<any>('/settings')
    ]).then(([pData, cData, sData]) => {
      setProducts(pData)
      setCustomers(cData)
      setSettings(sData)
      setLoading(false)
    }).catch(err => {
      setSaleError('Failed to load data.')
      setLoading(false)
    })
  }, [])

  const results = products.filter(product => product.stock > 0 && (product.name.toLowerCase().includes(query.toLowerCase()) || product.sku?.toLowerCase().includes(query.toLowerCase())))
  const subtotal = cart.reduce((sum, item) => sum + item.selling * item.quantity, 0)
  const pointsDiscount = (redeemPoints && selectedCustomer) ? Math.min(selectedCustomer.points || 0, Math.max(0, subtotal - discount)) : 0
  const finalTotal = Math.max(0, subtotal - Math.min(discount, subtotal) - pointsDiscount)
  const pointsEarned = Math.floor(finalTotal / 100)

  const stateRef = useRef({ cart, paymentMethod, cashReceived, discount, finalTotal, subtotal, products, selectedCustomer, redeemPoints, pointsDiscount, pointsEarned, settings, weighProduct })
  useEffect(() => { stateRef.current = { cart, paymentMethod, cashReceived, discount, finalTotal, subtotal, products, selectedCustomer, redeemPoints, pointsDiscount, pointsEarned, settings, weighProduct } }, [cart, paymentMethod, cashReceived, discount, finalTotal, subtotal, products, selectedCustomer, redeemPoints, pointsDiscount, pointsEarned, settings, weighProduct])

  useEffect(() => {
    let barcode = ''; let lastTime = Date.now()
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); return }
      if (e.key === 'F4' || e.key === 'F9') { e.preventDefault(); completeSaleRef(); return }
      if (e.key === 'Escape') { e.preventDefault(); setCart([]); return }
      
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      
      const now = Date.now(); if (now - lastTime > 50) barcode = ''; lastTime = now
      if (e.key === 'Enter') {
        if (barcode.length > 2) {
          const pList = stateRef.current.products
          const product = pList.find(p => p.sku === barcode || p.id === barcode)
          if (product && product.stock > 0) addToCartRef(product)
        } else if (stateRef.current.cart.length > 0 && document.activeElement === document.body) {
           completeSaleRef()
        }
        barcode = ''
      } else if (e.key.length === 1) { barcode += e.key }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function completeSaleRef() {
    const s = stateRef.current
    if (!s.cart.length) return setSaleError('Add at least one product to complete the sale.')
    if (s.paymentMethod === 'Cash' && s.cashReceived < s.finalTotal) return setSaleError('Cash received must cover the final total.')
    
    const hasShortage = s.cart.some(item => { const current = s.products.find(product => product.id === item.id); return !current || current.stock < item.quantity })
    if (hasShortage) return setSaleError('One or more products no longer have enough stock.')
    
    const now = new Date(); const id = `sale-${now.getTime()}`
    const totalTax = s.cart.reduce((sum, item) => { const tr = item.taxRate || 0; return sum + ((item.selling - (item.selling / (1 + tr / 100))) * item.quantity); }, 0)
    const record: SaleRecord = { id, invoiceNumber: `INV-${now.getFullYear()}${String(now.getTime()).slice(-6)}`, items: s.cart.map(item => ({ productId: item.id, product: item.name, quantity: item.quantity, price: item.selling })), subtotal: s.subtotal, discount: s.discount + s.pointsDiscount, total: s.finalTotal, profit: s.cart.reduce((sum, item) => sum + (item.selling - item.purchase) * item.quantity, 0) - s.discount - s.pointsDiscount, paymentMethod: s.paymentMethod, createdAt: now.toISOString(), customerId: s.selectedCustomer?.id, pointsEarned: s.pointsEarned, pointsRedeemed: s.pointsDiscount, taxAmount: totalTax }
    
    try {
      await api.post('/sales', record)
      for (const item of s.cart) {
        const product = s.products.find(p => p.id === item.id)
        if (product) {
          const updated = { ...product, stock: Math.max(0, product.stock - item.quantity) }
          await api.put(`/products/${product.id}`, updated)
        }
      }
      
      if (s.selectedCustomer && s.selectedCustomer.id !== 'walk-in') {
        const newBalance = (s.selectedCustomer.points || 0) - s.pointsDiscount + s.pointsEarned
        await api.put(`/customers/${s.selectedCustomer.id}`, { ...s.selectedCustomer, points: newBalance })
        const updatedCustomers = await api.get<Customer[]>('/customers')
        setCustomers(updatedCustomers)
      }
      
      const updatedProducts = await api.get<Product[]>('/products')
      setProducts(updatedProducts)
      setInvoice(record); setCart([]); setDiscount(0); setCashReceived(0); setSaleError(''); setSelectedCustomer(null); setRedeemPoints(false)
      
      if (s.settings?.whatsappEnabled && s.selectedCustomer?.phone && s.selectedCustomer.id !== 'walk-in') {
        setWhatsappToast(`Digital Receipt sent to ${s.selectedCustomer.phone} on WhatsApp!`)
        setTimeout(() => setWhatsappToast(''), 5000)
      }
    } catch(err) {
      setSaleError('Failed to complete sale due to network error.')
    }
  }

  function addToCartRef(product: Product) { 
    if (product.isWeighable) {
      setWeighProduct(product)
      return
    }
    setCart(current => { const existing = current.find(item => item.id === product.id); return existing ? current.map(item => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item) : [...current, { ...product, quantity: 1 }] }) 
  }
  function addToCart(product: Product) { addToCartRef(product) }
  function confirmWeight(product: Product, weight: number) { setCart(current => { const existing = current.find(item => item.id === product.id); return existing ? current.map(item => item.id === product.id ? { ...item, quantity: weight } : item) : [...current, { ...product, quantity: weight }] }); setWeighProduct(null) }
  function changeQuantity(id: string, amount: number) { setCart(current => current.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(item.stock, item.quantity + amount)) } : item)) }
  function removeFromCart(id: string) { setCart(current => current.filter(item => item.id !== id)) }
  function completeSale() { completeSaleRef() }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="sales-page"><section className="page-heading"><div><span className="section-kicker">POINT OF SALE</span><h2>New sale</h2><p>Find products and build a customer order in seconds. (Hotkeys: F2 Search, F4 Checkout, Esc Clear)</p></div><span className="sale-date">Today · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span></section>{whatsappToast && <div className="form-success" style={{ backgroundColor: '#dcf8c6', color: '#075e54', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle size={20} /> {whatsappToast}</div>}<section className="pos-layout"><article className="dashboard-panel product-picker"><div className="panel-heading"><div><h3>Select products</h3><p className="panel-note">Search your available inventory.</p></div><span className="item-count">{products.length} items</span></div><label className="search-box pos-search"><span><Search size={16} /></span><input ref={searchInputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by product name... (F2)" aria-label="Search sale products"/></label><div className="pos-results">{results.length ? results.map(product => <button className="pos-product" key={product.id} onClick={() => addToCart(product)}><span className={`product-thumb ${product.color}`}>{product.name.slice(0, 1)}</span><span><strong>{product.name}</strong><small>{product.stock} {product.unit} available</small></span><b>₹{product.selling.toLocaleString('en-IN')}</b><span className="add-sign">＋</span></button>) : <div className="stock-empty">No available products match your search.</div>}</div></article><article className="dashboard-panel cart-panel"><div className="panel-heading"><div><h3>Shopping cart</h3><p className="panel-note">{cart.length ? `${cart.length} product${cart.length > 1 ? 's' : ''} selected` : 'Your cart is empty'}</p></div><span className="cart-bag"><ShoppingBag size={24} color="#64748b" /></span></div>{cart.length ? <div className="cart-list">{cart.map(item => <div className="cart-row" key={item.id}><div className={`product-thumb ${item.color}`}>{item.name.slice(0, 1)}</div><div className="cart-product"><strong>{item.name}</strong><span>₹{item.selling.toLocaleString('en-IN')} / {item.unit}</span></div><div className="quantity-controls"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Reduce ${item.name}`}>−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label={`Add ${item.name}`}>＋</button></div><b>₹{(item.selling * item.quantity).toLocaleString('en-IN')}</b><button className="remove-product" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}>×</button></div>)}</div> : <div className="cart-empty"><div className="empty-illustration" style={{display:'flex',justifyContent:'center',marginBottom:'8px'}}><ShoppingBag size={48} color="#cbd5e1"/></div><strong>Add products to start</strong><p>Selected items will appear here.</p></div>}<div className="payment-section"><div className="customer-selection" style={{ marginBottom: '16px' }}><div className="payment-title"><h4>Customer (Optional)</h4></div><select className="search-box pos-search" style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }} value={selectedCustomer?.id || ''} onChange={e => { const cust = customers.find(c => c.id === e.target.value) || null; setSelectedCustomer(cust); setRedeemPoints(false) }}><option value="">Walk-in (No loyalty points)</option>{customers.filter(c => c.id !== 'walk-in').map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone}) - {c.points || 0} pts</option>)}</select>{selectedCustomer && (selectedCustomer.points || 0) > 0 && <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '0.85rem', color: 'var(--purple-dark)', cursor: 'pointer' }}><input type="checkbox" checked={redeemPoints} onChange={e => setRedeemPoints(e.target.checked)} /> Redeem points for ₹{Math.min(selectedCustomer.points || 0, Math.max(0, subtotal - discount)).toLocaleString('en-IN')} off</label>}</div><div className="payment-title"><h4>Payment method</h4><span>Choose at checkout</span></div><div className="payment-methods">{(['Cash', 'UPI', 'Card'] as const).map(method => <button className={paymentMethod === method ? 'selected' : ''} key={method} onClick={() => setPaymentMethod(method)}><span>{method === 'Cash' ? <Banknote size={24}/> : method === 'UPI' ? <Smartphone size={24}/> : <CreditCard size={24}/>}</span>{method}</button>)}</div>{paymentMethod === 'Cash' && <div className="cash-details"><label>Amount received<div className="discount-input cash-input"><span>₹</span><input type="number" min="0" value={cashReceived || ''} onChange={event => setCashReceived(Math.max(0, Number(event.target.value)))} placeholder="0" aria-label="Cash amount received"/></div></label><div className="change-due"><span>Change due</span><strong>₹{Math.max(0, cashReceived - finalTotal).toLocaleString('en-IN')}</strong></div></div>}</div><div className="billing-summary"><div><span>Subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div><label><span>Discount</span><div className="discount-input"><span>₹</span><input type="number" min="0" max={subtotal} value={discount || ''} onChange={event => setDiscount(Math.max(0, Number(event.target.value)))} placeholder="0" aria-label="Discount amount"/></div></label>{pointsDiscount > 0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem',color:'var(--purple-dark)'}}><span>Points Redeemed</span><strong>− ₹{pointsDiscount.toLocaleString('en-IN')}</strong></div>}<div className="final-total"><span>Final total</span><strong>₹{finalTotal.toLocaleString('en-IN')}</strong></div>{selectedCustomer && <div style={{display:'flex',justifyContent:'center',fontSize:'0.75rem',color:'var(--success)',marginTop:'-8px'}}>+ {pointsEarned} loyalty points earned</div>}</div><button className="primary-button sale-button" onClick={completeSale} disabled={!cart.length}>Complete sale (F4) →</button>{saleError && <p className="sale-error" role="alert">{saleError}</p>}{invoice && <div className="invoice-success" role="status"><span className="invoice-check"><CheckCircle2 size={24} color="#10b981" /></span><div><strong>Sale completed</strong><span>{invoice.invoiceNumber} · {invoice.pointsEarned ? `Earned ${invoice.pointsEarned} pts` : ''}</span></div><button onClick={() => window.print()}>Print invoice</button></div>}</article></section>{invoice && <section className="receipt" aria-label="Printable receipt"><div className="receipt-header"><div><span className="receipt-logo">K</span><h3>{settings?.shopName || 'Kirana Fresh Mart'}</h3><p style={{whiteSpace:'pre-wrap'}}>{settings?.address || '12 Market Road, Main Bazaar\nMumbai, Maharashtra 400001'}</p><p>{settings?.phone || '+91 98765 43210'}</p></div><div className="receipt-meta"><strong>{invoice.invoiceNumber}</strong><span>{new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><span>{new Date(invoice.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div></div><div className="receipt-rule"/><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>{invoice.items.map(item => <tr key={item.productId}><td>{item.product}</td><td>{item.quantity}</td><td>₹{item.price.toLocaleString('en-IN')}</td><td>₹{(item.price * item.quantity).toLocaleString('en-IN')}</td></tr>)}</tbody></table><div className="receipt-totals"><div><span>Subtotal</span><strong>₹{invoice.subtotal.toLocaleString('en-IN')}</strong></div><div><span>Discount</span><strong>− ₹{invoice.discount.toLocaleString('en-IN')}</strong></div><div className="receipt-grand-total"><span>Total</span><strong>₹{invoice.total.toLocaleString('en-IN')}</strong></div><div><span>Payment method</span><strong>{invoice.paymentMethod}</strong></div></div><div className="receipt-footer"><span>{settings?.receiptFooter || 'Thank you for shopping with us!'}</span><button className="primary-button receipt-print" onClick={() => window.print()}>Print receipt</button></div></section>}
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
