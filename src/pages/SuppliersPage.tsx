import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { Search, Building2, Plus, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

type Supplier = { id: string; name: string; phone: string; balance: number }
type Purchase = { id: string; total: number; supplierId: string; createdAt: string; paymentStatus: string }

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Supplier[]>('/suppliers').catch(() => []),
      api.get<Purchase[]>('/purchases').catch(() => [])
    ]).then(([sData, pData]) => {
      setSuppliers(sData)
      setPurchases(pData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => suppliers.filter(s => `${s.name} ${s.phone}`.toLowerCase().includes(query.toLowerCase())), [suppliers, query])
  
  function openAdd() { setEditing(null); setForm({ name: '', phone: '' }); setError(''); setIsFormOpen(true) }
  function openEdit(supplier: Supplier) { setEditing(supplier); setIsFormOpen(true); setForm({ name: supplier.name, phone: supplier.phone }); setError('') }
  
  async function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault(); 
    if (form.name.trim().length < 2) return setError('Enter a supplier name.'); 
    if (!/^[+0-9 ()-]{7,}$/.test(form.phone.trim())) return setError('Enter a valid phone number.'); 
    
    try {
      if (editing) {
        const updated = await api.put<Supplier>(`/suppliers/${editing.id}`, { ...editing, name: form.name.trim(), phone: form.phone.trim() })
        setSuppliers(suppliers.map(s => s.id === editing.id ? updated : s))
        setMessage('Supplier updated successfully.')
      } else {
        const added = await api.post<Supplier>('/suppliers', { id: `supplier-${Date.now()}`, name: form.name.trim(), phone: form.phone.trim(), balance: 0 })
        setSuppliers([added, ...suppliers])
        setMessage('Supplier added successfully.')
      }
      setEditing(null); setIsFormOpen(false); setForm({ name: '', phone: '' });
    } catch(err) {
      setError('Network error saving supplier.')
    }
  }
  
  async function remove(supplier: Supplier) { 
    if (window.confirm(`Delete ${supplier.name}?`)) { 
      try {
        await api.delete(`/suppliers/${supplier.id}`)
        setSuppliers(suppliers.filter(item => item.id !== supplier.id)); 
        setMessage('Supplier deleted successfully.') 
      } catch(err) {
        alert('Failed to delete supplier.')
      }
    } 
  }

  async function payBalance(supplier: Supplier) {
    if (supplier.balance <= 0) return alert('No outstanding balance.')
    const amountStr = window.prompt(`Pay amount for ${supplier.name} (Max: ₹${supplier.balance})`, supplier.balance.toString())
    if (!amountStr) return
    const amount = Number(amountStr)
    if (isNaN(amount) || amount <= 0 || amount > supplier.balance) return alert('Invalid amount.')
    
    try {
      const updated = await api.put<Supplier>(`/suppliers/${supplier.id}`, { ...supplier, balance: supplier.balance - amount })
      setSuppliers(suppliers.map(s => s.id === supplier.id ? updated : s))
      setMessage(`Paid ₹${amount.toLocaleString('en-IN')} to ${supplier.name}.`)
    } catch(err) {
      alert('Failed to process payment.')
    }
  }
  
  function getPurchases(supplier: Supplier) { return purchases.filter(p => p.supplierId === supplier.id) }
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="customers-page"><section className="page-heading"><div><span className="section-kicker">SUPPLY CHAIN</span><h2>Suppliers</h2><p>Manage your wholesale vendors and track your accounts payable.</p></div><button className="primary-button" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={18}/> Add supplier</button></section>{message && <div className="form-success" role="status">{message}</div>}<section className="products-toolbar"><label className="search-box"><span><Search size={16} /></span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search suppliers..." aria-label="Search suppliers"/></label></section><section className="products-table-card customers-card"><div className="table-summary"><strong>Supplier directory</strong><span>{filtered.length} of {suppliers.length} suppliers</span></div><div className="table-wrap"><table><thead><tr><th>Supplier name</th><th>Phone number</th><th>Outstanding Balance</th><th>Total orders</th><th>Order history</th><th>Actions</th></tr></thead><tbody>{filtered.map(supplier => { const supplierPurchases = getPurchases(supplier); return <tr key={supplier.id}><td><div className="product-name"><span className="product-thumb orange">{supplier.name.slice(0, 1).toUpperCase()}</span><strong>{supplier.name}</strong></div></td><td>{supplier.phone}</td><td><span style={{color: supplier.balance > 0 ? 'var(--orange-dark)' : 'var(--green-main)', fontWeight:600}}>₹{supplier.balance.toLocaleString('en-IN')}</span></td><td>{supplierPurchases.length}</td><td><button className="view-invoice row-actions" style={{background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-1) var(--spacing-2)', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)'}} onClick={() => setHistorySupplier(supplier)}>View history</button></td><td><div className="row-actions">{supplier.balance > 0 && <button className="view-details" onClick={() => payBalance(supplier)} style={{ color: 'var(--orange-dark)', borderColor: 'var(--orange-main)' }}>Pay</button>}<button className="view-details" onClick={() => openEdit(supplier)}>Edit</button><button className="delete-action" onClick={() => remove(supplier)}>Delete</button></div></td></tr> })}</tbody></table></div>{filtered.length === 0 && <div className="table-empty"><span style={{ display: 'flex', justifyContent: 'center' }}><Building2 size={48} color="#94a3b8" /></span><strong>No suppliers found</strong><p>Try a different name or add a new supplier.</p></div>}</section>{isFormOpen && <SupplierForm editing={editing} form={form} error={error} setForm={setForm} onSubmit={submit} onClose={() => { setEditing(null); setIsFormOpen(false); setForm({ name: '', phone: '' }); setError('') }}/>} {historySupplier && <HistoryModal supplier={historySupplier} purchases={getPurchases(historySupplier)} onClose={() => setHistorySupplier(null)}/>}</div>
}

function SupplierForm({ editing, form, error, setForm, onSubmit, onClose }: { editing: Supplier | null; form: { name: string; phone: string }; error: string; setForm: (form: { name: string; phone: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) { return <div className="modal-backdrop"><section className="product-form-card customer-form" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">SUPPLIER DIRECTORY</span><h3>{editing ? 'Edit supplier' : 'Add supplier'}</h3><p>Save vendor details for faster purchase orders.</p></div><button className="close-button" onClick={onClose}>×</button></div><form onSubmit={onSubmit} noValidate><div className="form-grid"><label>Supplier name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Metro Wholesale" /></label><label>Phone number<input required type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="e.g. +91 98765 43210" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{editing ? 'Save changes' : 'Add supplier'}</button></div></form></section></div> }

function HistoryModal({ supplier, purchases, onClose }: { supplier: Supplier; purchases: Purchase[]; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="invoice-modal" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">ORDER HISTORY</span><h3>{supplier.name}</h3><p>{supplier.phone}</p></div><button className="close-button" onClick={onClose}>×</button></div>{purchases.length ? <div className="invoice-items">{purchases.map(purchase => <div key={purchase.id}><span>{new Date(purchase.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><strong>₹{purchase.total.toLocaleString('en-IN')}</strong><span className={`status-badge ${purchase.paymentStatus === 'Paid' ? 'in-stock' : 'out-of-stock'}`} style={{ marginLeft: 'auto' }}>{purchase.paymentStatus}</span></div>)}</div> : <div className="stock-empty">No purchase orders recorded for this supplier yet.</div>}</section></div> }
