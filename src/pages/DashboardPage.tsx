import { useMemo, useState, useEffect } from 'react'
import { StatCard } from '../components/ui/StatCard'
import { TrendingUp, FileText, IndianRupee, PackageOpen, AlertTriangle, PackageX, Info, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

type Product = { id: string; name: string; selling: number; purchase: number; stock: number; minimumStock: number; unit: string; color: string }
type SaleRecord = { id: string; invoiceNumber: string; items: Array<{ productId: string; product: string; quantity: number; price: number }>; subtotal: number; discount: number; total: number; profit: number; paymentMethod: string; createdAt: string; status?: 'completed' | 'refunded' }

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`

export function DashboardPage() {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    Promise.all([
      api.get<SaleRecord[]>('/sales'),
      api.get<Product[]>('/products')
    ]).then(([sData, pData]) => {
      setSales(sData)
      setProducts(pData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])
  
  const todaySales = useMemo(() => sales.filter(sale => sale.status !== 'refunded' && isToday(sale.createdAt)), [sales])
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0)
  const todayProfit = todaySales.reduce((sum, sale) => sum + (sale.profit || 0), 0)
  
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const validSales = sales.filter(s => s.status !== 'refunded')
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.minimumStock || 5))
  const deadStockProducts = products.filter(p => {
    if (p.stock === 0) return false
    const salesIn30Days = validSales.some(s => {
      const saleTime = new Date(s.createdAt).getTime()
      return saleTime >= thirtyDaysAgo && s.items.some(i => i.productId === p.id)
    })
    return !salesIn30Days
  })

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div><section className="intro"><div><span className="section-kicker">SHOP OVERVIEW</span><h2>Your daily command centre</h2><p>Track your real-time profitability and inventory health.</p></div><button className="primary-button" onClick={() => window.location.hash = '#/sales'}>Go to POS →</button></section><section className="stats-grid"><StatCard label="Today's Sales" value={money(todayTotal)} detail={`${todaySales.length} invoice${todaySales.length === 1 ? '' : 's'} today`} icon={<TrendingUp size={20}/>}/><StatCard label="Number of Sales" value={todaySales.length.toString()} detail="Saved sales today" icon={<FileText size={20}/>} tone="teal"/><StatCard label="Today's Profit" value={money(todayProfit)} detail="Net profit today" icon={<IndianRupee size={20}/>} tone="teal"/><StatCard label="Total Products" value={products.length.toString()} detail={`${products.reduce((sum, p) => sum + p.stock, 0)} items in stock`} icon={<PackageOpen size={20}/>} tone="blue"/><StatCard label="Low Stock" value={lowStockProducts.length.toString()} detail={lowStockProducts.length ? 'Needs reordering' : 'Everything looks good'} icon={<AlertTriangle size={20}/>} tone="orange"/><StatCard label="Dead Stock" value={deadStockProducts.length.toString()} detail={deadStockProducts.length ? 'No sales in 30 days' : 'Excellent turnover'} icon={<PackageX size={20}/>} tone="purple"/></section><div style={{ display: 'grid', gap: 'var(--spacing-6)', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}><section className="dashboard-panel recent-sales-dashboard"><div className="panel-heading"><div><h3>Recent Sales</h3><p className="panel-note">Latest invoices generated today</p></div><span className="item-count">{todaySales.length} total</span></div>{todaySales.length ? <div className="daily-sales-list">{todaySales.slice(0, 5).map(sale => <div className="daily-sale-card" key={sale.id}><div className="daily-sale-heading"><span>{new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {sale.invoiceNumber}</span><strong>{money(sale.total)}</strong></div>{sale.items.map((item, index) => <div className="daily-sale-line" key={`${sale.id}-${index}`}><span>{item.product}</span><span>{item.quantity} × {money(item.price)} = <strong>{money(item.quantity * item.price)}</strong></span></div>)}<div className="daily-sale-footer" style={{marginTop:'8px',paddingTop:'8px',borderTop:'1px dashed var(--border-color)',fontSize:'0.75rem',color:'var(--success)',fontWeight:600}}>+ {money(sale.profit)} profit</div></div>)}</div> : <div className="dashboard-empty-state"><span className="empty-illustration" style={{ display: 'flex', justifyContent: 'center' }}><Info size={48} color="#94a3b8" /></span><strong>No sales recorded today</strong><p>Go to the POS to make your first sale.</p></div>}</section><section className="dashboard-panel dead-stock-dashboard"><div className="panel-heading"><div><h3>Dead Stock Alerts</h3><p className="panel-note">Products with 0 sales in the last 30 days</p></div><span className="item-count" style={{ backgroundColor: 'var(--purple-light)', color: 'var(--purple-dark)' }}>{deadStockProducts.length} stagnant</span></div>{deadStockProducts.length ? <div className="daily-sales-list">{deadStockProducts.slice(0, 5).map(p => <div className="daily-sale-card" key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-3)' }}><div><strong>{p.name}</strong><div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.stock} {p.unit} taking up space</div></div><button className="cancel-button" onClick={() => window.location.hash = '#/inventory'} style={{ borderColor: 'var(--purple-primary)', color: 'var(--purple-primary)', fontSize: '0.75rem', padding: '4px 8px' }}>Discount it</button></div>)}</div> : <div className="dashboard-empty-state"><span className="empty-illustration" style={{ display: 'flex', justifyContent: 'center' }}><Info size={48} color="#94a3b8" /></span><strong>Great inventory turnover!</strong><p>No dead stock detected right now.</p></div>}</section></div></div>
}
function isToday(value: string) { const date = new Date(value); const now = new Date(); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate() }
