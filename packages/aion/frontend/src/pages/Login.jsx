import { useState } from 'react'
import { api } from '../api.js'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      await api.login(username, password)
      onLogin()
    } catch (err) {
      setError(err.message || 'Erro ao autenticar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{ width: 340 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56, height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent-dim) 0%, var(--accent) 100%)',
            fontSize: 22, fontWeight: 800, color: '#000',
            marginBottom: 12,
          }}>
            AI
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>AION CORE</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Concrete Intelligence</div>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}>Entrar</div>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Usuário</label>
              <input
                className="input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && submit(e)}
              />
            </div>

            {error && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
                fontSize: 13,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading || !username || !password}
            >
              {loading
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Entrando…</>
                : 'Entrar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          CONCRYA AION CORE 1.0
        </div>
      </div>
    </div>
  )
}
