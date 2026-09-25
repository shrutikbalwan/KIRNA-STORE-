import { useMemo, useState, useEffect } from 'react'
import { Search, Receipt, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

type SaleItem = { productId: string; product: string; quantity: number; price: number }
type Sale = { id: string; invoiceNumber: string; items: SaleItem[]; subtotal: number; discount: number; total: number; profit: number; paymentMethod: string; createdAt: string; customer?: string; status?: 'completed' | 'refunded' }

export function SalesHistoryPage() {
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [selected, setSelected] = useState<Sale | null>(null)
  const [view, setView] = useState<'invoice' | 'details'>('invoice')
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Sale[]>('/sales').then(data => {
      setSales(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  async function processRefund(sale: Sale) {
    if (!window.confirm(`Are you sure you want to refund invoice ${sale.invoiceNumber}? This will restock the items and update profits.`)) return
    try {
      await api.patch(`/sales/${sale.id}`, { status: 'refunded' })
      const allProducts = await api.get<any[]>('/products')
      for (const item of sale.items) {
        const product = allProducts.find(p => p.id === item.productId)
        if (product) {
          await api.patch(`/products/${product.id}`, { stock: product.stock + item.quantity })
        }
      }
      setSales(current => current.map(s => s.id === sale.id ? { ...s, status: 'refunded' } : s))
      setSelected(current => current?.id === sale.id ? { ...current, status: 'refunded' } : current)
    } catch (err) {
      alert('Failed to process refund. Check network.')
    }
  }

  const filteredSales = useMemo(() => sales.filter(sale => { const search = query.toLowerCase(); const matchesSearch = sale.invoiceNumber.toLowerCase().includes(search) || (sale.customer ?? 'Walk-in customer').toLowerCase().includes(search); const matchesDate = !date || sale.createdAt.slice(0, 10) === date; return matchesSearch && matchesDate }), [sales, query, date])
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="history-page"><section className="page-heading"><div><span className="section-kicker">REPORTING</span><h2>Sales history</h2><p>Review completed transactions, invoices, and process refunds.</p></div><a className="primary-button" href="#/sales">＋ New sale</a></section><section className="history-toolbar"><label className="search-box"><span><Search size={16}/></span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search invoice or customer..." aria-label="Search sales history"/></label><label className="date-filter"><span>Date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} aria-label="Filter sales by date"/></label>{date && <button className="clear-filter" onClick={() => setDate('')}>Clear</button>}</section><section className="products-table-card history-card"><div className="table-summary"><strong>Completed sales</strong><span>{filteredSales.length} of {sales.length} invoices</span></div><div className="table-wrap"><table><thead><tr><th>Invoice number</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment method</th><th>Profit</th><th>Invoice</th></tr></thead><tbody>{filteredSales.map(sale => <tr key={sale.id}><td><strong className="invoice-number">{sale.invoiceNumber}</strong></td><td>{new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td>{sale.customer ?? 'Walk-in customer'}</td><td className="price">{sale.status === 'refunded' ? <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>₹{sale.total.toLocaleString('en-IN')}</span> : `₹${sale.total.toLocaleString('en-IN')}`}{sale.status === 'refunded' && <span className="status-badge out-of-stock" style={{ marginLeft: '8px' }}>Refunded</span>}</td><td><span className="payment-label">{sale.paymentMethod}</span></td><td className="profit-value">{sale.status === 'refunded' ? '-' : `₹${sale.profit.toLocaleString('en-IN')}`}</td><td><div className="row-actions"><button className="view-invoice" onClick={() => { setView('invoice'); setSelected(sale) }}>View invoice</button><button className="view-details" onClick={() => { setView('details'); setSelected(sale) }}>Details</button></div></td></tr>)}</tbody></table></div>{filteredSales.length === 0 && <div className="table-empty"><span style={{ display: 'flex', justifyContent: 'center' }}><Receipt size={48} color="#94a3b8" /></span><strong>No sales found</strong><p>Completed sales will appear here.</p></div>}</section>{selected && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}><section className={`invoice-modal ${view === 'details' ? 'details-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="invoice-title"><div className="form-heading"><div><span className="section-kicker">{view === 'invoice' ? 'INVOICE' : 'SALE DETAILS'}</span><h3 id="invoice-title">{selected.invoiceNumber}</h3><p>{new Date(selected.createdAt).toLocaleString('en-IN')}</p>{selected.status === 'refunded' && <span className="status-badge out-of-stock" style={{ marginTop: '8px' }}>Refunded</span>}</div><button className="close-button" onClick={() => setSelected(null)} aria-label="Close details">×</button></div><div className="invoice-items">{selected.items.map(item => <div key={item.productId}><span>{item.product} × {item.quantity}</span><strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong></div>)}</div><div className="invoice-detail-grid"><span>Customer<strong>{selected.customer ?? 'Walk-in customer'}</strong></span><span>Payment<strong>{selected.paymentMethod}</strong></span><span>Subtotal<strong>₹{selected.subtotal.toLocaleString('en-IN')}</strong></span><span>Discount<strong>₹{selected.discount.toLocaleString('en-IN')}</strong></span><span>Profit<strong>₹{selected.profit.toLocaleString('en-IN')}</strong></span><span>Final total<strong>₹{selected.total.toLocaleString('en-IN')}</strong></span></div>{view === 'invoice' && <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>{selected.status !== 'refunded' && <button className="cancel-button" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => processRefund(selected)}>Process Refund</button>}<button className="primary-button" onClick={() => window.print()}>Print invoice</button></div>}</section></div>}</div>
}
