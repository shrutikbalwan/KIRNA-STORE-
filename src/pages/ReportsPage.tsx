import { useMemo, useState, useEffect } from 'react'
import { StatCard } from '../components/ui/StatCard'
import { api } from '../lib/api'
import { Loader2 } from 'lucide-react'

type SaleItem = { productId: string; product: string; quantity: number; price: number }
type Sale = { total: number; profit: number; createdAt: string; items?: SaleItem[]; status?: string; invoiceNumber?: string; taxAmount?: number }
type Product = { id: string; name: string; stock: number; minimumStock: number; unit: string }
const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

export function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'>('weekly')
  
  useEffect(() => {
    Promise.all([
      api.get<Sale[]>('/sales'),
      api.get<Product[]>('/products')
    ]).then(([sData, pData]) => {
      setSales(sData.filter(s => s.status !== 'refunded'))
      setProducts(pData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); const week=today-((now.getDay()+6)%7)*86400000; const month=new Date(now.getFullYear(),now.getMonth(),1).getTime(); const start=period==='daily'?today:period==='weekly'?week:month; const current=sales.filter(sale=>new Date(sale.createdAt).getTime()>=start); const revenue=current.reduce((sum,sale)=>sum+sale.total,0); const profit=current.reduce((sum,sale)=>sum+sale.profit,0); const margin=revenue>0?((profit/revenue)*100).toFixed(1):'0.0'; const rankings=getRankings(sales); const lowStock=products.filter(product=>product.stock<=product.minimumStock); const daily=getDayTotals(sales);

  function exportToCSV() {
    const header = ['Date', 'Invoice No', 'Taxable Amount (Rs)', 'Tax Amount (Rs)', 'Grand Total (Rs)'];
    const rows = current.map(sale => {
      const date = new Date(sale.createdAt).toLocaleDateString('en-IN');
      const inv = sale.invoiceNumber || 'N/A';
      const total = sale.total || 0;
      const tax = sale.taxAmount || 0;
      const taxable = total - tax;
      return [date, inv, taxable.toFixed(2), tax.toFixed(2), total.toFixed(2)];
    });
    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Kirana_Tax_Export_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="reports-page"><section className="page-heading"><div><span className="section-kicker">INSIGHTS</span><h2>Reports</h2><p>Understand your shop performance at a glance.</p></div><div className="period-switcher">{(['daily','weekly','monthly'] as const).map(item=><button className={period===item?'active':''} key={item} onClick={()=>setPeriod(item)}>{item[0].toUpperCase()+item.slice(1)}</button>)}</div></section><section className="report-stats"><StatCard label="Daily sales" value={money(getRangeTotal(sales,today))} detail="Sales recorded today" icon="◷" tone="blue"/><StatCard label="Weekly sales" value={money(getRangeTotal(sales,week))} detail="Since Monday" icon="↗" tone="green"/><StatCard label="Monthly sales" value={money(getRangeTotal(sales,month))} detail="This calendar month" icon="▥" tone="teal"/><StatCard label="Revenue" value={money(revenue)} detail={`${period[0].toUpperCase()+period.slice(1)} period`} icon="₹" tone="orange"/><StatCard label="Net Profit" value={money(profit)} detail="After discounts" icon="✦" tone="purple"/><StatCard label="Profit Margin" value={`${margin}%`} detail="Profit / Revenue" icon="◫" tone="blue"/></section><section className="analytics-grid"><AnalyticsList title="Best-selling products" hint="By units sold" items={rankings.units.map(item=>`${item.name}|||${item.quantity} units`)} icon="rank"/><AnalyticsList title="Highest revenue products" hint="By sales value" items={rankings.revenue.map(item=>`${item.name}|||${money(item.revenue)}`)} icon="revenue"/></section><section className="dashboard-panel" style={{ marginBottom: 'var(--spacing-8)' }}><div className="panel-heading"><div><h3>Accounting & Tax Export (GST)</h3><p className="panel-note">Generate a CA-ready Excel/CSV file for the selected {period} period.</p></div><button className="primary-button" onClick={exportToCSV}>Download CSV</button></div></section><section className="report-main-grid"><article className="dashboard-panel report-chart-panel"><div className="panel-heading"><div><h3>Sales & Profit trends</h3><p className="panel-note">Last 7 days (Purple indicates profit)</p></div><strong className="report-total">{money(daily.reduce((sum,value)=>sum+value.revenue,0))}</strong></div><div className="report-bars">{daily.map((value,index)=><div className="report-bar-wrap" key={index}><span>{value.revenue?money(value.revenue):'₹0'}</span><div className="report-bar" style={{height:`${Math.max(value.revenue?value.revenue/Math.max(...daily.map(d=>d.revenue),1)*100:4,4)}%`, position: 'relative'}}><div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'var(--purple-primary)', height: `${value.revenue ? (value.profit / value.revenue) * 100 : 0}%`, borderRadius: 'inherit' }} title={`Profit: ${money(value.profit)}`} /></div><small>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index]}</small></div>)}</div></article><article className="dashboard-panel analytics-low-stock"><div className="panel-heading"><div><h3>Low-stock products</h3><p className="panel-note">Items that need attention</p></div><a href="#/inventory">View inventory →</a></div>{lowStock.length?lowStock.slice(0,5).map(product=><div className="ranking-row" key={product.id}><span className="stock-alert">!</span><strong>{product.name}</strong><span className="outstanding-value">{product.stock} {product.unit} left</span></div>):<div className="stock-empty">All products are above minimum stock.</div>}</article></section></div>
}
function AnalyticsList({title,hint,items,icon}:{title:string;hint:string;items:string[];icon:'rank'|'revenue'}){return <article className="dashboard-panel analytics-panel"><div className="panel-heading"><div><h3>{title}</h3><p className="panel-note">{hint}</p></div></div>{items.length?items.slice(0,4).map((item,index)=>{const [name,value]=item.split('|||');return <div className="ranking-row" key={name}><span className={icon==='rank'?'rank-number':'revenue-dot'}>{icon==='rank'?`0${index+1}`:'₹'}</span><strong>{name}</strong><span>{value}</span></div>}):<div className="stock-empty">Sales data will populate this list.</div>}</article>}
function getRangeTotal(sales:Sale[],start:number){return sales.filter(sale=>new Date(sale.createdAt).getTime()>=start).reduce((sum,sale)=>sum+sale.total,0)}
function getRankings(sales:Sale[]){const map=new Map<string,{name:string;quantity:number;revenue:number}>();sales.forEach(sale=>sale.items?.forEach(item=>{const old=map.get(item.productId)??{name:item.product,quantity:0,revenue:0};map.set(item.productId,{name:old.name,quantity:old.quantity+item.quantity,revenue:old.revenue+item.quantity*item.price})}));const values=[...map.values()];return{units:[...values].sort((a,b)=>b.quantity-a.quantity),revenue:[...values].sort((a,b)=>b.revenue-a.revenue)}}
function getDayTotals(sales:Sale[]){const today=new Date();const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()-6);return Array.from({length:7},(_,index)=>{const day=new Date(start.getFullYear(),start.getMonth(),start.getDate()+index);const daySales=sales.filter(sale=>{const created=new Date(sale.createdAt);return created.toDateString()===day.toDateString()}); return { revenue: daySales.reduce((sum,sale)=>sum+sale.total,0), profit: daySales.reduce((sum,sale)=>sum+sale.profit,0) }})}
