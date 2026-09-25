import { useState, useEffect, type FormEvent } from 'react'
import { Home, Palette, Sun, Moon, Percent, Receipt, DownloadCloud, Loader2, MessageSquare } from 'lucide-react'
import { api } from '../lib/api'

type Settings = { shopName: string; address: string; phone: string; gstEnabled: boolean; taxRate: number; currency: string; receiptFooter: string; whatsappEnabled: boolean; whatsappApiKey: string; winbackEnabled: boolean }
const defaults: Settings = { shopName: 'Kirana Fresh Mart', address: '12 Market Road, Main Bazaar\nMumbai, Maharashtra 400001', phone: '+91 98765 43210', gstEnabled: false, taxRate: 0, currency: 'INR (₹)', receiptFooter: 'Thank you for shopping with us!', whatsappEnabled: false, whatsappApiKey: '', winbackEnabled: false }

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('kirana-theme') === 'dark' ? 'dark' : 'light')
  
  useEffect(() => {
    api.get<Settings>('/settings').then(data => {
      // Check if data is populated to handle edge case of empty DB response
      if (data && data.shopName) {
        setSettings(data)
      }
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  function update(field: keyof Settings, value: string | number | boolean) { setSettings({ ...settings, [field]: value }); setMessage('') }
  
  async function save(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault(); 
    try {
      await api.put('/settings', settings)
      localStorage.setItem('kirana-theme', theme); 
      window.dispatchEvent(new CustomEvent('kirana-theme-change', { detail: theme })); 
      setMessage('Settings saved successfully.') 
    } catch(err) {
      setMessage('Failed to save settings to network.')
    }
  }
  
  function changeTheme(next: 'light' | 'dark') { setTheme(next); localStorage.setItem('kirana-theme', next); window.dispatchEvent(new CustomEvent('kirana-theme-change', { detail: next })) }
  
  async function exportData(type: 'products' | 'sales' | 'customers') {
    try {
      const items = await api.get<any[]>(`/${type}`)
      if (!items || items.length === 0) return setMessage(`No ${type} data found to export.`)
      const keys = Object.keys(items[0])
      const csvRows = [keys.join(',')]
      for (const item of items) {
        csvRows.push(keys.map(key => {
          const val = item[key]
          if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`
          if (Array.isArray(val) || typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          return val
        }).join(','))
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `kirana-${type}-${new Date().toISOString().split('T')[0]}.csv`; a.click()
      URL.revokeObjectURL(url)
      setMessage(`${type} exported successfully.`)
    } catch(err) {
      setMessage(`Failed to export ${type}.`)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-light)' }}><Loader2 size={32} className="lucide-spin" /></div>

  return <div className="settings-page"><section className="page-heading"><div><span className="section-kicker">WORKSPACE</span><h2>Settings</h2><p>Keep your shop details and receipts up to date.</p></div></section>{message && <div className="form-success" role="status">{message}</div>}<form className="settings-form" onSubmit={save}><section className="settings-card dashboard-panel"><div className="settings-card-heading"><div><h3>Shop information</h3><p>Details shown across your workspace and invoices.</p></div><span className="settings-icon"><Home size={20} /></span></div><div className="form-grid"><label>Shop name<input required value={settings.shopName} onChange={event => update('shopName', event.target.value)} placeholder="Your shop name" /></label><label>Phone number<input required type="tel" value={settings.phone} onChange={event => update('phone', event.target.value)} placeholder="+91 98765 43210" /></label><label className="settings-wide">Shop address<textarea required rows={3} value={settings.address} onChange={event => update('address', event.target.value)} placeholder="Street, area, city" /></label></div></section><section className="settings-card dashboard-panel"><div className="settings-card-heading"><div><h3>Appearance</h3><p>Choose a comfortable workspace theme.</p></div><span className="settings-icon"><Palette size={20} /></span></div><div className="theme-options"><button type="button" className={theme === 'light' ? 'selected' : ''} onClick={() => changeTheme('light')}><span className="theme-preview light-preview"><Sun size={24} /></span><span><strong>Light mode</strong><small>Bright and airy</small></span></button><button type="button" className={theme === 'dark' ? 'selected' : ''} onClick={() => changeTheme('dark')}><span className="theme-preview dark-preview"><Moon size={24} /></span><span><strong>Dark mode</strong><small>Easy on the eyes</small></span></button></div></section><section className="settings-card dashboard-panel"><div className="settings-card-heading"><div><h3>GST and tax</h3><p>Configure tax preferences for future billing.</p></div><span className="settings-icon"><Percent size={20} /></span></div><div className="tax-setting"><div><strong>Enable GST / tax</strong><span>Save your tax preference for billing and reports.</span></div><button type="button" className={`toggle ${settings.gstEnabled ? 'on' : ''}`} onClick={() => update('gstEnabled', !settings.gstEnabled)} aria-pressed={settings.gstEnabled}><span /></button></div>{settings.gstEnabled && <label className="tax-rate">Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={settings.taxRate} onChange={event => update('taxRate', Number(event.target.value))}/></label>}</section><section className="settings-card dashboard-panel"><div className="settings-card-heading"><div><h3>Currency and receipt</h3><p>Choose how printed receipts should look.</p></div><span className="settings-icon"><Receipt size={20} /></span></div><div className="form-grid"><label>Currency<select value={settings.currency} onChange={event => update('currency', event.target.value)}><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option></select></label><label className="settings-wide">Receipt footer<textarea rows={3} value={settings.receiptFooter} onChange={event => update('receiptFooter', event.target.value)} placeholder="Thank you for shopping with us!" /></label></div></section><section className="settings-card dashboard-panel"><div className="settings-card-heading"><div><h3>Marketing & SMS</h3><p>Automate WhatsApp receipts and win-back campaigns.</p></div><span className="settings-icon"><MessageSquare size={20} /></span></div><div className="tax-setting"><div><strong>Auto-send Digital Receipts</strong><span>Send receipts via WhatsApp instantly on checkout.</span></div><button type="button" className={`toggle ${settings.whatsappEnabled ? 'on' : ''}`} onClick={() => update('whatsappEnabled', !settings.whatsappEnabled)} aria-pressed={settings.whatsappEnabled}><span /></button></div>{settings.whatsappEnabled && <div className="form-grid"><label className="settings-wide">WhatsApp / Twilio API Key<input type="password" value={settings.whatsappApiKey ?? ''} onChange={event => update('whatsappApiKey', event.target.value)} placeholder="sk_live_... (Simulated)"/></label></div>}<div className="tax-setting" style={{ marginTop: 'var(--spacing-4)' }}><div><strong>Enable Win-back Marketing</strong><span>Allow scanning inactive customers for SMS campaigns.</span></div><button type="button" className={`toggle ${settings.winbackEnabled ? 'on' : ''}`} onClick={() => update('winbackEnabled', !settings.winbackEnabled)} aria-pressed={settings.winbackEnabled}><span /></button></div></section><section className="settings-card dashboard-panel"><div className="settings-card-heading"><div><h3>Data export & backup</h3><p>Download your records as CSV files.</p></div><span className="settings-icon"><DownloadCloud size={20} /></span></div><div style={{ display: 'flex', gap: 'var(--spacing-3)' }}><button type="button" onClick={() => exportData('products')}>Export Products</button><button type="button" onClick={() => exportData('sales')}>Export Sales</button><button type="button" onClick={() => exportData('customers')}>Export Customers</button></div></section><div className="settings-actions"><button className="primary-button" type="submit">Save settings</button></div></form></div>
}
