import { useState, type FormEvent } from 'react'
import { Store } from 'lucide-react'

export function LoginPage({ onLogin }: { onLogin: (role: 'admin' | 'cashier') => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault()
    if (!username.trim() || !password) return setError('Enter your username and password.')
    
    const user = username.trim().toLowerCase()
    if (['admin', 'admin@kirana.local'].includes(user) && password === 'admin123') {
      return onLogin('admin')
    }
    if (['cashier', 'cashier@kirana.local'].includes(user) && password === 'cashier123') {
      return onLogin('cashier')
    }
    
    return setError('Invalid credentials.') 
  }
  
  return <main className="login-page"><div className="login-glow"/><section className="login-card"><div className="login-brand" style={{ display: 'flex', justifyContent: 'center' }}><img src="/logo.png" alt="Kirana OS" style={{ width: '220px', height: 'auto', mixBlendMode: 'multiply' }} /></div><div className="login-heading"><span className="section-kicker">WORKSPACE ACCESS</span><h1>Welcome back</h1><p>Sign in to access your shop workspace.</p></div><form onSubmit={submit} noValidate><label>Username or email<input autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} placeholder="admin@kirana.local or cashier@kirana.local" /></label><label>Password<input autoComplete="current-password" required type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" /></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="primary-button login-button" type="submit">Sign in securely →</button></form><div className="login-hint"><p>Admin: <strong>admin@kirana.local</strong> · <strong>admin123</strong></p><p style={{marginTop: '4px'}}>Cashier: <strong>cashier@kirana.local</strong> · <strong>cashier123</strong></p></div></section></main>
}
