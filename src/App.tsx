import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(module => ({ default: module.ProductsPage })))
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(module => ({ default: module.InventoryPage })))
const SalesPage = lazy(() => import('./pages/SalesPage').then(module => ({ default: module.SalesPage })))
const SalesHistoryPage = lazy(() => import('./pages/SalesHistoryPage').then(module => ({ default: module.SalesHistoryPage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(module => ({ default: module.CustomersPage })))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then(module => ({ default: module.SuppliersPage })))
const PurchasesPage = lazy(() => import('./pages/PurchasesPage').then(module => ({ default: module.PurchasesPage })))
const CreditPage = lazy(() => import('./pages/CreditPage').then(module => ({ default: module.CreditPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(module => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })))
import { LoginPage } from './pages/LoginPage'
import { routes, routeDefinitions, type RoutePath } from './router'
import type { Language } from './lib/i18n'

export function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('kirana-authenticated') === 'true')
  const [role, setRole] = useState<'admin' | 'cashier'>(() => (localStorage.getItem('kirana-role') as 'admin' | 'cashier') || 'admin')
  const [path, setPath] = useState<RoutePath>(() => routes.resolve(window.location.hash))
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('kirana-theme') === 'dark' ? 'dark' : 'light')
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('kirana-lang') as Language) || 'en')
  
  useEffect(() => { document.documentElement.dataset.theme = theme; const onTheme = (event: Event) => setTheme((event as CustomEvent<'light' | 'dark'>).detail); window.addEventListener('kirana-theme-change', onTheme); return () => window.removeEventListener('kirana-theme-change', onTheme) }, [theme])
  
  const handleLanguageChange = (newLang: Language) => {
    localStorage.setItem('kirana-lang', newLang)
    setLanguage(newLang)
  }
  
  useEffect(() => { 
    const onHash = () => {
      const resolved = routes.resolve(window.location.hash)
      setPath(resolved)
    }
    window.addEventListener('hashchange', onHash); 
    return () => window.removeEventListener('hashchange', onHash) 
  }, [])

  useEffect(() => {
    if (authenticated && role === 'cashier') {
      const currentRoute = routeDefinitions.find(r => r.path === path)
      if (currentRoute?.adminOnly) {
        window.location.hash = '#/sales'
      }
    }
  }, [path, role, authenticated])

  if (!authenticated) return <LoginPage onLogin={(newRole) => { 
    localStorage.setItem('kirana-authenticated', 'true')
    localStorage.setItem('kirana-role', newRole)
    setRole(newRole)
    setAuthenticated(true)
    if (newRole === 'cashier') window.location.hash = '#/sales'
  }} />
  
  const page = path === '/' ? <DashboardPage /> : path === '/inventory' ? <InventoryPage /> : path === '/products' ? <ProductsPage /> : path === '/sales' ? <SalesPage /> : path === '/sales-history' ? <SalesHistoryPage /> : path === '/customers' ? <CustomersPage /> : path === '/suppliers' ? <SuppliersPage /> : path === '/purchases' ? <PurchasesPage /> : path === '/credit' ? <CreditPage /> : path === '/reports' ? <ReportsPage /> : path === '/settings' ? <SettingsPage /> : <PlaceholderPage path={path} />
  
  return <AppShell activePath={path} role={role} language={language} onLanguageChange={handleLanguageChange} onLogout={() => { localStorage.removeItem('kirana-authenticated'); localStorage.removeItem('kirana-role'); setAuthenticated(false) }}><Suspense fallback={<div className="route-loading">Loading workspace…</div>}>{page}</Suspense></AppShell>
}
