import { useState, useEffect, useMemo } from 'react'
import { StatCard } from '../components/ui/StatCard'
import { api } from '../lib/api'
import { Loader2 } from 'lucide-react'

type Product = { id: string; name: string; purchase: number; stock: number; minimumStock: number; unit: string; color: string }
type Movement = { id: string; product: string; quantity: number; action: 'Added' | 'Reduced' | 'Updated'; date: string; time: string }
type SaleItem = { productId: string; product: string; quantity: number; price: number }
type Sale = { id: string; createdAt: string; items: SaleItem[]; status?: string }

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'restock' | 'dead'>('all')

  useEffect(() => {
    Promise.all([
      api.get<Product[]>('/products'),
      api.get<Movement[]>('/movements').catch(() => []),
      api.get<Sale[]>('/sales').catch(() => [])
    ]).then(([pData, mData, sData]) => {
      setProducts(pData)
      setMovements(mData)
      setSales(sData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const totalStock = products.reduce((sum, product) => sum + product.stock, 0)
  const stockValue = products.reduce((sum, product) => sum + product.stock * product.purchase, 0)
  const outOfStock = products.filter(product => product.stock === 0)

  const { productStats, restockCount, deadCount } = useMemo(() => {
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000

    const validSales = sales.filter(s => s.status !== 'refunded')
    const stats: Record<string, { totalSold: number, sold7: number, soldPrev7: number }> = {}
    products.forEach(p => stats[p.id] = { totalSold: 0, sold7: 0, soldPrev7: 0 })
    
    validSales.forEach(sale => {
      const saleTime = new Date(sale.createdAt).getTime()
      if (saleTime >= thirtyDaysAgo) {
        sale.items?.forEach(item => {
          if (stats[item.productId]) {
            stats[item.productId].totalSold += item.quantity
            if (saleTime >= sevenDaysAgo) {
              stats[item.productId].sold7 += item.quantity
            } else if (saleTime >= fourteenDaysAgo) {
              stats[item.productId].soldPrev7 += item.quantity
            }
          }
        })
      }
    })
    
    const result: Record<string, { velocity: number, daysLeft: number, isDead: boolean, isRestockAlert: boolean, isTrendingUp: boolean, isTrendingDown: boolean, recommendedRestock: number }> = {}
    let rCount = 0
    let dCount = 0
    products.forEach(p => {
      const s = stats[p.id]
      const velocity = s.totalSold / 30 // units per day
      const velocity7 = s.sold7 / 7
      const velocityPrev7 = s.soldPrev7 / 7
      
      const daysLeft = velocity > 0 ? p.stock / velocity : Infinity
      const isDead = p.stock > 0 && s.totalSold === 0
      const isRestockAlert = velocity > 0 && daysLeft < 7 && p.stock > 0
      
      const isTrendingUp = velocity7 > 1.5 * velocityPrev7 && velocity7 > 0.5
      const isTrendingDown = velocity7 < 0.5 * velocityPrev7 && velocityPrev7 > 0.5
      const targetStockFor30Days = velocity * 30
      const recommendedRestock = Math.max(0, Math.ceil(targetStockFor30Days - p.stock))

      if (isRestockAlert) rCount++
      if (isDead) dCount++
      result[p.id] = { velocity, daysLeft, isDead, isRestockAlert, isTrendingUp, isTrendingDown, recommendedRestock }
    })
    return { productStats: result, restockCount: rCount, deadCount: dCount }
  }, [products, sales])

  async function updateStock(id: string, mode: 'add' | 'reduce' | 'update') {
    const amount = Number(amounts[id])
    if (!Number.isFinite(amount) || amount < 0 || (mode !== 'update' && amount === 0)) return setMessage('Enter a valid stock quantity before updating.')
    
    const product = products.find(item => item.id === id)!
    const stock = mode === 'add' ? product.stock + amount : mode === 'reduce' ? Math.max(0, product.stock - amount) : amount; 
    
    try {
      const updatedProduct = await api.put<Product>(`/products/${id}`, { ...product, stock })
      setProducts(products.map(p => p.id === id ? updatedProduct : p))
      
      const now = new Date()
      const movement: Movement = { id: `${id}-${now.getTime()}`, product: product.name, quantity: amount, action: mode === 'add' ? 'Added' : mode === 'reduce' ? 'Reduced' : 'Updated', date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
      
      const addedMovement = await api.post<Movement>('/movements', movement).catch(() => movement) 
      setMovements([addedMovement, ...movements])
      
      setAmounts({ ...amounts, [id]: '' }); 
      setMessage('Stock updated successfully.')
    } catch(err) {
      setMessage('Failed to update stock.')
    }
  }

  const displayedProducts = products.filter(p => {
    if (filter === 'all') return true
    if (filter === 'restock') return productStats[p.id]?.isRestockAlert
    if (filter === 'dead') return productStats[p.id]?.isDead
    return true
  })

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="inventory-page"><section className="page-heading"><div><span className="section-kicker">INVENTORY</span><h2>Stock overview</h2><p>Stay ahead of replenishment and keep your shelves ready.</p></div><a className="primary-button" href="#/products">Manage products →</a></section>{message && <div className="form-success" role="status">{message}</div>}<section className="inventory-stats"><StatCard label="Total stock" value={totalStock.toLocaleString('en-IN')} detail="Units across your shop" icon="▦" tone="blue"/><StatCard label="Stock value" value={`₹${stockValue.toLocaleString('en-IN')}`} detail="Based on purchase price" icon="₹" tone="green"/><StatCard label="Predictive Restock" value={restockCount.toString()} detail="Running out < 7 days" icon="⚠" tone="orange"/><StatCard label="Dead Stock" value={deadCount.toString()} detail="No sales in 30 days" icon="×" tone="purple"/></section><section className="dashboard-panel" style={{ marginBottom: 'var(--spacing-8)' }}><div className="panel-heading"><div><h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI Demand Forecasting</h3><p className="panel-note">Smart insights based on your recent sales velocity.</p></div></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Sales Velocity (30d)</th><th>Trend (vs last week)</th><th>Days Left</th><th>AI Recommended Restock</th></tr></thead><tbody>{products.filter(p => productStats[p.id]?.isRestockAlert || productStats[p.id]?.isTrendingUp || productStats[p.id]?.recommendedRestock > 0).slice(0, 8).map(product => { const stat = productStats[product.id]; return <tr key={product.id}><td><strong className="product-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className={`product-thumb ${product.color}`} style={{ width: 24, height: 24, fontSize: '10px' }}>{product.name.slice(0,1)}</span>{product.name}</strong></td><td>{stat.velocity.toFixed(1)} / day</td><td>{stat.isTrendingUp ? <span style={{ color: 'var(--green-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>↑ Trending Up</span> : stat.isTrendingDown ? <span style={{ color: 'var(--orange-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>↓ Trending Down</span> : <span style={{ color: 'var(--text-light)' }}>Stable</span>}</td><td>{stat.daysLeft === Infinity ? '∞' : stat.daysLeft > 99 ? '99+' : Math.floor(stat.daysLeft)} days</td><td>{stat.recommendedRestock > 0 ? <strong style={{ color: 'var(--purple-main)' }}>Buy {stat.recommendedRestock} {product.unit}</strong> : <span style={{ color: 'var(--text-light)' }}>Stock OK</span>}</td></tr> })}</tbody></table>{products.filter(p => productStats[p.id]?.isRestockAlert || productStats[p.id]?.isTrendingUp || productStats[p.id]?.recommendedRestock > 0).length === 0 && <div className="stock-empty" style={{ padding: '24px' }}>No active trends or restock recommendations right now.</div>}</div></section><section className="stock-manager dashboard-panel"><div className="panel-heading" style={{ borderBottom: 'none', paddingBottom: 0 }}><div><h3>Update stock</h3><p className="panel-note">Choose a product, enter a quantity, and apply an action.</p></div><div className="period-switcher"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All Items</button><button className={filter === 'restock' ? 'active' : ''} onClick={() => setFilter('restock')}>Restock Alerts</button><button className={filter === 'dead' ? 'active' : ''} onClick={() => setFilter('dead')}>Dead Stock</button></div></div><div style={{ padding: 'var(--spacing-4)', paddingTop: 0 }}>{displayedProducts.length === 0 ? <div className="stock-empty">No products match this filter.</div> : displayedProducts.map(product => { const stat = productStats[product.id]; return <div className="manager-row" key={product.id}><div className={`product-thumb ${product.color}`}>{product.name.slice(0, 1)}</div><div className="manager-product"><strong>{product.name}</strong><span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>Current stock: {product.stock} {product.unit} {stat?.isRestockAlert && <span className="status-badge" style={{ backgroundColor: 'var(--orange-light)', color: 'var(--orange-dark)' }}>{Math.floor(stat.daysLeft)} days left</span>} {stat?.isDead && <span className="status-badge" style={{ backgroundColor: 'var(--purple-light)', color: 'var(--purple-dark)' }}>Stagnant 30d</span>}</span></div><input aria-label={`Quantity for ${product.name}`} type="number" min="0" value={amounts[product.id] ?? ''} onChange={event => setAmounts({ ...amounts, [product.id]: event.target.value })} placeholder="Qty"/><div className="stock-actions"><button onClick={() => updateStock(product.id, 'add')}>＋ Add</button><button onClick={() => updateStock(product.id, 'reduce')}>− Reduce</button><button onClick={() => updateStock(product.id, 'update')}>Update</button></div></div>})}</div></section><section className="movement-history dashboard-panel"><div className="panel-heading"><div><h3>Stock movement history</h3><p className="panel-note">A record of every stock adjustment made in this workspace.</p></div><span className="movement-count">{movements.length} movements</span></div>{movements.length === 0 ? <div className="stock-empty">No stock movements recorded yet.</div> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>Quantity</th><th>Action</th><th>Date</th><th>Time</th></tr></thead><tbody>{movements.map(movement => <tr key={movement.id}><td><strong className="movement-product">{movement.product}</strong></td><td>{movement.quantity}</td><td><span className={`movement-badge ${movement.action.toLowerCase()}`}>{movement.action}</span></td><td>{movement.date}</td><td>{movement.time}</td></tr>)}</tbody></table></div>}</section></div>
}

