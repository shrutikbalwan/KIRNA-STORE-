import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

type Customer = { id: string; name: string; phone: string }
type Payment = { id: string; amount: number; date: string }
type CreditAccount = { id: string; customerId: string; customer: string; totalCredit: number; amountPaid: number; payments: Payment[] }

export function CreditPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [accounts, setAccounts] = useState<CreditAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [paymentFor, setPaymentFor] = useState<CreditAccount | null>(null)
  const [selected, setSelected] = useState<CreditAccount | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Customer[]>('/customers'),
      api.get<CreditAccount[]>('/credit-accounts')
    ]).then(([cData, aData]) => {
      setCustomers(cData)
      setAccounts(aData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const outstanding = accounts.reduce((sum, account) => sum + account.totalCredit - account.amountPaid, 0)
  const filtered = accounts.filter(account => account.customer.toLowerCase().includes(search.toLowerCase()))
  
  async function addCredit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault(); 
    const amount = Number(creditAmount); 
    const customer = customers.find(item => item.id === customerId); 
    if (!customer) return setError('Select a customer.'); 
    if (!amount || amount <= 0) return setError('Enter a credit amount greater than zero.'); 
    
    const existing = accounts.find(account => account.customerId === customer.id); 
    try {
      if (existing) {
        const updated = await api.put<CreditAccount>(`/credit-accounts/${existing.id}`, { ...existing, totalCredit: existing.totalCredit + amount })
        setAccounts(accounts.map(account => account.id === existing.id ? updated : account))
      } else {
        const added = await api.post<CreditAccount>('/credit-accounts', { id: `credit-${Date.now()}`, customerId: customer.id, customer: customer.name, totalCredit: amount, amountPaid: 0, payments: [] })
        setAccounts([added, ...accounts])
      }
      setFormOpen(false); setCustomerId(''); setCreditAmount(''); setError('')
    } catch(err) {
      setError('Network error saving credit.')
    }
  }
  
  async function addPayment(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault(); 
    if (!paymentFor) return; 
    const amount = Number(paymentAmount); 
    const remaining = paymentFor.totalCredit - paymentFor.amountPaid; 
    if (!amount || amount <= 0 || amount > remaining) return setError(`Enter an amount up to ₹${remaining.toLocaleString('en-IN')}.`); 
    
    const payment: Payment = { id: `payment-${Date.now()}`, amount, date: new Date().toISOString() }; 
    const updatedAccount = { ...paymentFor, amountPaid: paymentFor.amountPaid + amount, payments: [payment, ...paymentFor.payments] }
    
    try {
      const saved = await api.put<CreditAccount>(`/credit-accounts/${paymentFor.id}`, updatedAccount)
      setAccounts(accounts.map(account => account.id === paymentFor.id ? saved : account))
      setPaymentFor(null); setPaymentAmount(''); setError('')
    } catch (err) {
      setError('Network error saving payment.')
    }
  }

  function sendReminder(account: CreditAccount, remaining: number) {
    const customer = customers.find(c => c.id === account.customerId);
    if (!customer || !customer.phone) {
      alert('This customer does not have a phone number recorded.');
      return;
    }
    const message = `Hello ${customer.name}, this is a reminder from Kirana OS that you have an outstanding balance of ₹${remaining.toLocaleString('en-IN')}. Please settle your account at your earliest convenience. Thank you!`;
    const url = `https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="credit-page"><section className="page-heading"><div><span className="section-kicker">OPTIONAL CREDIT</span><h2>Udhaar / Credit</h2><p>Track customer balances and collect payments with confidence.</p></div><button className="primary-button" onClick={() => { setFormOpen(true); setError('') }}>＋ Add credit</button></section><section className="credit-summary"><div className="credit-highlight"><span className="summary-icon">₹</span><div><p>Total outstanding credit</p><strong>₹{outstanding.toLocaleString('en-IN')}</strong><span>Amount yet to be collected</span></div></div><div className="credit-note"><strong>Keep it clear</strong><span>Record every payment to keep balances accurate.</span></div></section><section className="products-toolbar"><label className="search-box"><span><Search size={16}/></span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customers..." aria-label="Search credit customers"/></label></section><section className="products-table-card credit-table"><div className="table-summary"><strong>Credit accounts</strong><span>{filtered.length} accounts</span></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Total credit</th><th>Amount paid</th><th>Remaining amount</th><th>Payment history</th><th>Actions</th></tr></thead><tbody>{filtered.map(account => { const remaining = account.totalCredit - account.amountPaid; return <tr key={account.id}><td><div className="product-name"><span className="product-thumb blue">{account.customer.slice(0, 1).toUpperCase()}</span><strong>{account.customer}</strong></div></td><td>₹{account.totalCredit.toLocaleString('en-IN')}</td><td className="profit-value">₹{account.amountPaid.toLocaleString('en-IN')}</td><td><strong className={remaining ? 'outstanding-value' : 'paid-value'}>₹{remaining.toLocaleString('en-IN')}</strong>{remaining > 0 && <span className="outstanding-label">Outstanding</span>}</td><td><button className="view-invoice row-actions" style={{background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-1) var(--spacing-2)', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)'}} onClick={() => setSelected(account)}>View history ({account.payments.length})</button></td><td><div className="row-actions" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><button className="view-details" disabled={!remaining} onClick={() => { setPaymentFor(account); setError('') }}>Record payment</button>{remaining > 0 && <button className="cancel-button" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#25D366', color: '#25D366' }} onClick={() => sendReminder(account, remaining)}>WhatsApp Reminder</button>}</div></td></tr> })}</tbody></table></div>{filtered.length === 0 && <div className="table-empty"><span>₹</span><strong>No credit accounts</strong><p>Add credit to a customer to begin tracking.</p></div>}</section>{formOpen && <div className="modal-backdrop"><section className="product-form-card customer-form" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">CREDIT ENTRY</span><h3>Add credit</h3><p>Record an amount owed by a customer.</p></div><button className="close-button" onClick={() => setFormOpen(false)}>×</button></div><form onSubmit={addCredit}><div className="form-grid"><label>Customer<select required value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Select customer</option>{customers.map(customer => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label><label>Credit amount<div className="input-with-prefix"><span>₹</span><input required min="1" type="number" value={creditAmount} onChange={event => setCreditAmount(event.target.value)} placeholder="0"/></div></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="cancel-button" onClick={() => setFormOpen(false)}>Cancel</button><button className="primary-button">Save credit</button></div></form></section></div>}{paymentFor && <div className="modal-backdrop"><section className="product-form-card customer-form" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">PAYMENT ENTRY</span><h3>Record payment</h3><p>{paymentFor.customer} · ₹{(paymentFor.totalCredit - paymentFor.amountPaid).toLocaleString('en-IN')} outstanding</p></div><button className="close-button" onClick={() => setPaymentFor(null)}>×</button></div><form onSubmit={addPayment}><label className="payment-form-label">Amount paid<div className="input-with-prefix"><span>₹</span><input required min="1" type="number" value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} placeholder="0"/></div></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="cancel-button" onClick={() => setPaymentFor(null)}>Cancel</button><button className="primary-button">Save payment</button></div></form></section></div>}{selected && <div className="modal-backdrop"><section className="invoice-modal" role="dialog" aria-modal="true"><div className="form-heading"><div><span className="section-kicker">PAYMENT HISTORY</span><h3>{selected.customer}</h3><p>Credit account activity</p></div><button className="close-button" onClick={() => setSelected(null)}>×</button></div>{selected.payments.length ? <div className="invoice-items">{selected.payments.map(payment => <div key={payment.id}><span>{new Date(payment.date).toLocaleDateString('en-IN')}</span><strong>₹{payment.amount.toLocaleString('en-IN')}</strong></div>)}</div> : <div className="stock-empty">No payments recorded yet.</div>}</section></div>}</div>
}
