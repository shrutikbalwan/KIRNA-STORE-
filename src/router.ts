export const routeDefinitions = [
  { path: '/', label: 'Overview', icon: '⌂', adminOnly: true },
  { path: '/inventory', label: 'Inventory', icon: '▦', adminOnly: true },
  { path: '/products', label: 'Products', icon: '◈', adminOnly: true },
  { path: '/suppliers', label: 'Suppliers', icon: '♜', adminOnly: true },
  { path: '/purchases', label: 'Purchases', icon: '⇘', adminOnly: true },
  { path: '/sales', label: 'Sales', icon: '↗' },
  { path: '/sales-history', label: 'Sales history', icon: '▤', adminOnly: true },
  { path: '/customers', label: 'Customers', icon: '♙', adminOnly: true },
  { path: '/credit', label: 'Udhaar', icon: '₹' },
  { path: '/reports', label: 'Reports', icon: '▥', adminOnly: true },
  { path: '/settings', label: 'Settings', icon: '⚙', adminOnly: true }
] as const
export type RoutePath = (typeof routeDefinitions)[number]['path']
export const routes = { resolve(hash: string): RoutePath { const path = hash.replace(/^#/, '') || '/'; return routeDefinitions.some(route => route.path === path) ? path as RoutePath : '/' } }
