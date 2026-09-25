import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { Search, Users, Plus, Loader2, MessageCircle } from 'lucide-react'
import { api } from '../lib/api'

type Customer = { id: string; name: string; phone: string; points?: number }
type Sale = { id: string; total: number; customer?: string; createdAt: string }

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [marketingOpen, setMarketingOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Customer[]>('/customers'),
      api.get<Sale[]>('/sales'),
      api.get<any>('/settings')
    ]).then(([cData, sData, setData]) => {
      if (!cData.find(c => c.id === 'walk-in')) {
        cData = [{ id: 'walk-in', name: 'Walk-in customer', phone: '—', points: 0 }, ...cData]
      }
      setCustomers(cData)
      setSales(sData)
      setSettings(setData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => customers.filter(customer => `${customer.name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase())), [customers, query])
  
  function openAdd() { setEditing(null); setForm({ name: '', phone: '' }); setError(''); setIsFormOpen(true) }
  function openEdit(customer: Customer) { setEditing(customer); setIsFormOpen(true); setForm({ name: customer.name, phone: customer.phone === '—' ? '' : customer.phone }); setError('') }
  
  async function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault(); 
    if (form.name.trim().length < 2) return setError('Enter a customer name.'); 
    if (!/^[+0-9 ()-]{7,}$/.test(form.phone.trim())) return setError('Enter a valid phone number.'); 
    
    try {
      if (editing) {
        if (editing.id === 'walk-in') return setError('Cannot edit the walk-in customer.')
        const updated = await api.put<Customer>(`/customers/${editing.id}`, { ...editing, name: form.name.trim(), phone: form.phone.trim() })
        setCustomers(customers.map(c => c.id === editing.id ? updated : c))
        setMessage('Customer updated successfully.')
      } else {
        const added = await api.post<Customer>('/customers', { id: `customer-${Date.now()}`, name: form.name.trim(), phone: form.phone.trim(), points: 0 })
        setCustomers([added, ...customers])
        setMessage('Customer added successfully.')
      }
      setEditing(null); setIsFormOpen(false); setForm({ name: '', phone: '' });
    } catch(err) {
      setError('Network error saving customer.')
    }
  }
  
  async function remove(customer: Customer) { 
    if (customer.id === 'walk-in') return setMessage('The walk-in customer cannot be deleted.'); 
    if (window.confirm(`Delete ${customer.name}?`)) { 
      try {
        await api.delete(`/customers/${customer.id}`)
        setCustomers(customers.filter(item => item.id !== customer.id)); 
        setMessage('Customer deleted successfully.') 
      } catch(err) {
        alert('Failed to delete customer.')
      }
    } 
  }
  
  function purchases(customer: Customer) { return sales.filter(sale => sale.customer === customer.name) }
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="customers-page"><section className="page-heading"><div><span className="section-kicker">RELATIONSHIPS</span><h2>Customers</h2><p>Keep customer contacts and purchase history in one place.</p></div><div style={{ display: 'flex', gap: '8px' }}><button className="primary-button" onClick={() => setMarketingOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--primary)' }}><MessageCircle size={18}/> Marketing Hub</button><button className="primary-button" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={18}/> Add customer</button></div></section>{message && <div className="form-success" role="status">{message}</div>}<section className="products-toolbar"><label className="search-box"><span><Search size={16} /></span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search customers..." aria-label="Search customers"/></label></section><section className="products-table-card customers-card"><div className="table-summary"><strong>Customer directory</strong><span>{filtered.length} of {customers.length} customers</span></div><div className="table-wrap"><table><thead><tr><th>Customer name</th><th>Phone number</th><th>Loyalty Points</th><th>Total purchases</th><th>Purchase history</th><th>Actions</th></tr></thead><tbody>{filtered.map(customer => { const customerSales = purchases(customer); const total = customerSales.reduce((sum, sale) => sum + sale.total, 0); return <tr key={customer.id}><td><div className="product-name"><span className="product-thumb blue">{customer.name.slice(0, 1).toUpperCase()}</span><strong>{customer.name}</strong></div></td><td>{customer.phone}</td><td><span style={{color:'var(--purple-dark)', fontWeight:600}}>{customer.points || 0} pts</span></td><td className="price">₹{total.toLocaleString('en-IN')}</td><td><button className="view-invoice row-actions" style={{background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-1) var(--spacing-2)', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)'}} onClick={() => setHistoryCustomer(customer)}>View history ({customerSales.length})</button></td><td><div className="row-actions"><button className="view-details" onClick={() => openEdit(customer)}>Edit</button><button className="delete-action" onClick={() => remove(customer)}>Delete</button></div></td></tr> })}</tbody></table></div>{filtered.length === 0 && <div className="table-empty"><span style={{ display: 'flex', justifyContent: 'center' }}><Users size={48} color="#94a3b8" /></span><strong>No customers found</strong><p>Try a different name or phone number.</p></div>}</section>{isFormOpen && <CustomerForm editing={editing} form={form} error={error} setForm={setForm} onSubmit={submit} onClose={() => { setEditing(null); setIsFormOpen(false); setForm({ name: '', phone: '' }); setError('') }}/>} {historyCustomer && <HistoryModal customer={historyCustomer} sales={purchases(historyCustomer)} onClose={() => setHistoryCustomer(null)}/>} {marketingOpen && <MarketingHub customers={customers} sales={sales} settings={settings} onClose={() => setMarketingOpen(false)}/>}</div>
}
function CustomerForm({ editing, form, error, setForm, onSubmit, onClose }: { editing: Customer | null; form: { name: string; phone: string }; error: string; setForm: (form: { name: string; phone: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) { return <div className="modal-backdrop"><section className="product-form-card customer-form" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">CUSTOMER DIRECTORY</span><h3>{editing ? 'Edit customer' : 'Add customer'}</h3><p>Save a contact for faster future sales.</p></div><button className="close-button" onClick={onClose}>×</button></div><form onSubmit={onSubmit} noValidate><div className="form-grid"><label>Customer name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Priya Sharma" /></label><label>Phone number<input required type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="e.g. +91 98765 43210" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{editing ? 'Save changes' : 'Add customer'}</button></div></form></section></div> }
function HistoryModal({ customer, sales, onClose }: { customer: Customer; sales: Sale[]; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="invoice-modal" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">PURCHASE HISTORY</span><h3>{customer.name}</h3><p>{customer.phone}</p></div><button className="close-button" onClick={onClose}>×</button></div>{sales.length ? <div className="invoice-items">{sales.map(sale => <div key={sale.id}><span>{new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><strong>₹{sale.total.toLocaleString('en-IN')}</strong></div>)}</div> : <div className="stock-empty">No purchases recorded for this customer yet.</div>}</section></div> }

function MarketingHub({ customers, sales, settings, onClose }: { customers: Customer[]; sales: Sale[]; settings: any; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  if (!settings?.winbackEnabled) {
    return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="product-form-card" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">MARKETING HUB</span><h3>Win-back Campaigns</h3></div><button className="close-button" onClick={onClose}>×</button></div><div className="stock-empty">Marketing campaigns are disabled. Please enable them in Settings.</div></section></div>
  }

  const now = Date.now()
  const inactiveCustomers = customers.filter(c => c.id !== 'walk-in' && c.phone !== '—').filter(c => {
    const custSales = sales.filter(s => s.customer === c.name)
    if (custSales.length === 0) return true
    const lastSale = Math.max(...custSales.map(s => new Date(s.createdAt).getTime()))
    return (now - lastSale) > 30 * 24 * 60 * 60 * 1000
  })

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="product-form-card" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">MARKETING HUB</span><h3>Win-back Campaigns</h3><p>Automatically text customers who haven't visited in 30 days.</p></div><button className="close-button" onClick={onClose}>×</button></div>{sent ? <div className="form-success" style={{ backgroundColor: '#dcf8c6', color: '#075e54', padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle size={20} /> Successfully sent discount SMS to {inactiveCustomers.length} inactive customers!</div> : <div><div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}><strong style={{ fontSize: '1rem' }}>Inactive Customers</strong><span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)' }}>{inactiveCustomers.length}</span></div><p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>These customers have not made a purchase in over 30 days.</p></div><label style={{ display: 'block', marginBottom: '24px' }}>Message Template<textarea disabled rows={3} value={"We miss you at Kirana Fresh Mart! Show this text for 10% off your next purchase."} style={{ width: '100%', marginTop: '8px', padding: '12px' }} /></label><div className="form-actions"><button className="cancel-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => setSent(true)} disabled={inactiveCustomers.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MessageCircle size={16}/> Send Campaign</button></div></div>}</section></div>
}

