import { useMemo, useState, type FormEvent, useEffect } from 'react'
import { Search, PackageOpen, Plus, Loader2, Printer } from 'lucide-react'
import Barcode from 'react-barcode'
import { api } from '../lib/api'

type Product = { id: string; name: string; category: string; selling: number; purchase: number; stock: number; minimumStock: number; unit: string; sku: string; color: string; taxRate: number; isWeighable?: boolean }
type FormValues = Omit<Product, 'id' | 'color'>

const blankForm: FormValues = { name: '', category: '', selling: 0, purchase: 0, stock: 0, minimumStock: 5, unit: '', sku: '', taxRate: 0, isWeighable: false }
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`

export function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [form, setForm] = useState<FormValues>(blankForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    api.get<Product[]>('/products').then(data => {
      setItems(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setError('Failed to load products.')
      setLoading(false)
    })
  }, [])

  const categories = ['All categories', ...new Set(items.map(product => product.category))]
  const filteredProducts = useMemo(() => items.filter(product => product.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All categories' || product.category === category)), [items, query, category])

  function toggleSelect(id: string) { setSelectedIds(curr => curr.includes(id) ? curr.filter(i => i !== id) : [...curr, id]) }
  function toggleSelectAll() { setSelectedIds(selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? [] : filteredProducts.map(p => p.id)) }

  function openAdd() { setEditingId(null); setForm(blankForm); setError(''); setSaved(''); setIsFormOpen(true) }
  function openEdit(product: Product) { setEditingId(product.id); setForm({ name: product.name, category: product.category, selling: product.selling, purchase: product.purchase, stock: product.stock, minimumStock: product.minimumStock, unit: product.unit, sku: product.sku, taxRate: product.taxRate || 0, isWeighable: product.isWeighable || false }); setError(''); setSaved(''); setIsFormOpen(true) }
  
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.category || !form.unit) return setError('Name, category, and unit are required.')
    if (form.purchase < 0 || form.selling < 0 || form.stock < 0 || form.minimumStock < 0) return setError('Prices and stock values cannot be negative.')
    if (form.selling < form.purchase) return setError('Selling price should be equal to or higher than purchase price.')
    
    const color = editingId ? items.find(item => item.id === editingId)?.color ?? 'green' : ['gold', 'blue', 'orange', 'teal', 'pink'][items.length % 5]
    const product: Product = { ...form, id: editingId ?? `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, color }
    
    try {
      if (editingId) {
        const updated = await api.put<Product>(`/products/${editingId}`, product)
        setItems(items.map(item => item.id === editingId ? updated : item))
        setSaved('Product updated successfully.')
      } else {
        const added = await api.post<Product>('/products', product)
        setItems([added, ...items])
        setSaved('Product added successfully.')
      }
      setIsFormOpen(false)
    } catch (err) {
      setError('Failed to save product to database.')
    }
  }
  
  async function deleteProduct(product: Product) { 
    if (window.confirm(`Delete ${product.name}?`)) { 
      try {
        await api.delete(`/products/${product.id}`)
        setItems(items.filter(item => item.id !== product.id))
        setSaved('Product deleted successfully.')
      } catch (err) {
        alert('Failed to delete product.')
      }
    } 
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="products-page"><section className="page-heading"><div><span className="section-kicker">INVENTORY</span><h2>Products</h2><p>Manage your catalogue, pricing, and stock at a glance.</p></div><button className="primary-button" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={18}/> Add product</button></section>{saved && <div className="form-success" role="status">{saved}</div>}<section className="products-toolbar"><label className="search-box"><span><Search size={16} /></span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products..." aria-label="Search products"/></label><label className="filter-box"><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter by category">{categories.map(item => <option key={item}>{item}</option>)}</select></label>{selectedIds.length > 0 && <button className="primary-button" onClick={() => { const qs: Record<string, number> = {}; selectedIds.forEach(id => qs[id] = 1); setPrintQuantities(qs); setPrintModalOpen(true) }} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}><Printer size={16}/> Print Barcodes ({selectedIds.length})</button>}</section><section className="products-table-card"><div className="table-summary"><strong>All products</strong><span>{filteredProducts.length} of {items.length} products</span></div><div className="table-wrap"><table><thead><tr><th style={{ width: '40px' }}><input type="checkbox" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} aria-label="Select all products" style={{ width: '16px', height: '16px' }} /></th><th>Product name</th><th>Category</th><th>Tax Slab</th><th>Selling price</th><th>Purchase price</th><th>Stock</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredProducts.map(product => { const status = product.stock === 0 ? 'Out of stock' : product.stock <= product.minimumStock ? 'Low stock' : 'In stock'; return <tr key={product.id}><td><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleSelect(product.id)} aria-label={`Select ${product.name}`} style={{ width: '16px', height: '16px' }} /></td><td><div className="product-name"><span className={`product-thumb ${product.color}`}>{product.name.slice(0, 1)}</span><strong>{product.name}</strong></div></td><td>{product.category}</td><td>{product.taxRate || 0}%</td><td className="price">{money(product.selling)}</td><td>{money(product.purchase)}</td><td className="stock-value">{product.stock}</td><td>{product.unit}</td><td><span className={`status-badge ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></td><td><div className="row-actions"><button onClick={() => openEdit(product)}>Edit</button><button className="delete-action" onClick={() => deleteProduct(product)}>Delete</button></div></td></tr> })}</tbody></table></div>{filteredProducts.length === 0 && <div className="table-empty"><span style={{ display: 'flex', justifyContent: 'center' }}><PackageOpen size={48} color="#94a3b8"/></span><strong>No products found</strong><p>Try a different search or category.</p></div>}</section>{isFormOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setIsFormOpen(false) }}><section className="product-form-card" role="dialog" aria-modal="true" aria-labelledby="product-form-title"><div className="form-heading"><div><span className="section-kicker">INVENTORY SETUP</span><h3 id="product-form-title">{editingId ? 'Edit Product' : 'Add Product'}</h3><p>Keep your catalogue details accurate and up to date.</p></div><button className="close-button" onClick={() => setIsFormOpen(false)} aria-label="Close form">×</button></div><form onSubmit={handleSubmit} noValidate><div className="form-grid"><FormField label="Product name" value={form.name} onChange={value => setForm({ ...form, name: value })} placeholder="e.g. Toor Dal"/><label>Category<select required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option value="">Select category</option>{categories.slice(1).map(item => <option key={item}>{item}</option>)}<option>Other</option></select></label><label>Tax Slab (GST)<select required value={form.taxRate} onChange={event => setForm({ ...form, taxRate: Number(event.target.value) })}><option value="0">0% (Exempt)</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></label><NumberField label="Purchase price" value={form.purchase} onChange={value => setForm({ ...form, purchase: value })}/><NumberField label="Selling price" value={form.selling} onChange={value => setForm({ ...form, selling: value })}/><NumberField label="Stock" value={form.stock} onChange={value => setForm({ ...form, stock: value })}/><NumberField label="Minimum stock" value={form.minimumStock} onChange={value => setForm({ ...form, minimumStock: value })}/><label>Unit<select required value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })}><option value="">Select unit</option><option>kg</option><option>L</option><option>pkt</option><option>pcs</option><option>box</option></select></label><label className="checkbox-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: 'auto', marginBottom: '8px' }}><input type="checkbox" checked={form.isWeighable || false} onChange={e => setForm({ ...form, isWeighable: e.target.checked })} style={{ width: '16px', height: '16px', margin: 0 }} /><span style={{ fontSize: '0.875rem' }}>Sold by weight (loose items)</span></label><FormField label="Barcode / SKU" value={form.sku} onChange={value => setForm({ ...form, sku: value })} placeholder="Optional code"/><label className="image-field">Product image<input accept="image/*" type="file" name="image" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="cancel-button" onClick={() => setIsFormOpen(false)}>Cancel</button><button type="submit" className="primary-button">{editingId ? 'Save changes' : 'Save product'}</button></div></form></section></div>}{printModalOpen && <PrintModal products={items.filter(p => selectedIds.includes(p.id))} quantities={printQuantities} setQuantities={setPrintQuantities} onClose={() => setPrintModalOpen(false)} onPrint={() => { setTimeout(() => window.print(), 100); setPrintModalOpen(false); setSelectedIds([]) }} />} <BarcodeSheet products={items.filter(p => selectedIds.includes(p.id))} quantities={printQuantities} /></div>
}

function PrintModal({ products, quantities, setQuantities, onClose, onPrint }: { products: Product[], quantities: Record<string, number>, setQuantities: (qs: Record<string, number>) => void, onClose: () => void, onPrint: () => void }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="product-form-card" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">LABEL PRINTING</span><h3>Print Barcodes</h3><p>Specify how many labels you need for each product.</p></div><button className="close-button" onClick={onClose}>×</button></div><div className="form-grid" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>{products.map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}><div><strong style={{ display: 'block', fontSize: '0.875rem' }}>{p.name}</strong><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.sku || p.id}</span></div><label style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '0.75rem' }}>Qty:</span><input type="number" min="1" value={quantities[p.id] || 1} onChange={e => setQuantities({ ...quantities, [p.id]: Math.max(1, parseInt(e.target.value) || 1) })} style={{ width: '80px', padding: '6px' }} /></label></div>)}</div><div className="form-actions"><button className="cancel-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={onPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Printer size={16}/> Print Labels</button></div></section></div> }

function BarcodeSheet({ products, quantities }: { products: Product[], quantities: Record<string, number> }) {
  const stickers = []
  for (const p of products) {
    const qty = quantities[p.id] || 0
    for (let i = 0; i < qty; i++) stickers.push(p)
  }
  return <div className="barcode-sheet">{stickers.map((p, idx) => <div key={`${p.id}-${idx}`} className="barcode-sticker"><span className="sticker-brand">Kirana Fresh Mart</span><span className="sticker-name">{p.name}</span><span className="sticker-price">₹{p.selling.toLocaleString('en-IN')}</span><Barcode value={p.sku || p.id} width={1.5} height={40} fontSize={12} margin={0} displayValue={true} /><span className="sticker-date">Packed: {new Date().toLocaleDateString('en-IN')}</span></div>)}</div>
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label>{label}<input required value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}/></label> }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label>{label}<input required min="0" step="0.01" type="number" value={value} onChange={event => onChange(Number(event.target.value))}/></label> }
