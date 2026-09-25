import type { ReactNode } from 'react'
import { routeDefinitions, type RoutePath } from '../../router'
import { LayoutDashboard, Package, Tag, TrendingUp, History, Users, CreditCard, BarChart3, Settings, Bell, Plus, Store, Building2, Truck } from 'lucide-react'
import { LanguageToggle } from './LanguageToggle'
import { type Language, t } from '../../lib/i18n'

type Props = { activePath: RoutePath; children: ReactNode; onLogout: () => void; role?: 'admin' | 'cashier'; language?: Language; onLanguageChange?: (lang: Language) => void }

const iconMap: Record<string, React.ReactNode> = {
  '/': <LayoutDashboard size={20} />,
  '/inventory': <Package size={20} />,
  '/products': <Tag size={20} />,
  '/sales': <TrendingUp size={20} />,
  '/sales-history': <History size={20} />,
  '/customers': <Users size={20} />,
  '/suppliers': <Building2 size={20} />,
  '/purchases': <Truck size={20} />,
  '/credit': <CreditCard size={20} />,
  '/reports': <BarChart3 size={20} />,
  '/settings': <Settings size={20} />
}

const routeKeyMap: Record<string, string> = {
  '/': 'nav.dashboard',
  '/inventory': 'nav.inventory',
  '/products': 'nav.products',
  '/sales': 'nav.sales',
  '/sales-history': 'nav.history',
  '/customers': 'nav.customers',
  '/suppliers': 'Suppliers',
  '/purchases': 'Purchases',
  '/credit': 'nav.credit',
  '/reports': 'nav.reports',
  '/settings': 'nav.settings'
}

export function AppShell({ activePath, children, onLogout, role = 'admin', language = 'en', onLanguageChange }: Props) {
  const visibleRoutes = routeDefinitions.filter(route => role === 'admin' || !route.adminOnly)
  
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/logo.png" alt="Kirana OS" style={{ width: '100%', maxWidth: '150px', height: 'auto', mixBlendMode: 'multiply' }} /></div>
      <p className="sidebar-label">Workspace</p>
      <nav aria-label="Main navigation">{visibleRoutes.map(route => <a className={`nav-item ${route.path === activePath ? 'active' : ''}`} href={`#${route.path}`} key={route.path}><span className="nav-icon">{iconMap[route.path]}</span>{t(language, routeKeyMap[route.path]) || route.label}</a>)}</nav>
      <div className="sidebar-footer"><span className="status-dot" /> All systems ready</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="topbar-title"><p className="eyebrow">Good morning <span className="sparkle">✦</span></p><h1>Welcome back, {role === 'admin' ? 'Admin' : 'Cashier'}</h1></div><div className="topbar-actions">{onLanguageChange && <LanguageToggle language={language} onLanguageChange={onLanguageChange} />}<button className="icon-button" aria-label="Notifications"><Bell size={20} /><span className="notification-dot" /></button><div className="profile"><span className="avatar">{role === 'admin' ? 'SK' : 'CH'}</span><span className="profile-name">{role === 'admin' ? 'Shop Admin' : 'Cashier'}</span><button className="logout-button" onClick={onLogout}>{t(language, 'app.logout')}</button></div></div></header>
      <div className="page-content">{children}</div>
      <button className="add-sale-fab" aria-label="Add Sale" onClick={() => window.location.hash = '#/sales'}><Plus size={24} /></button>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{visibleRoutes.slice(0,4).map(route => <a className={route.path === activePath ? 'active' : ''} href={`#${route.path}`} key={route.path}><span>{iconMap[route.path]}</span>{t(language, routeKeyMap[route.path]) || route.label}</a>)}</nav>
  </div>
}
