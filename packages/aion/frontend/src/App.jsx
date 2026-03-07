import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { api } from './api.js'
import Cockpit from './pages/Cockpit.jsx'
import Batches from './pages/Batches.jsx'
import Ensaio  from './pages/Ensaio.jsx'
import Login   from './pages/Login.jsx'
import AIONChat from './components/AIONChat.jsx'

// ── Context ───────────────────────────────────────────────────────────────────
export const PlantCtx = createContext(null)
export const ToastCtx = createContext(null)

export function usePlant() { return useContext(PlantCtx) }
export function useToast() { return useContext(ToastCtx) }

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [onDone])
  return <div className={`toast ${type}`}>{msg}</div>
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'cockpit', label: 'Cockpit',         icon: '⬡' },
  { id: 'batches', label: 'Lotes',            icon: '◫' },
  { id: 'ensaio',  label: 'Registrar Ensaio', icon: '⊞' },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">AI</div>
        <div>
          <div className="logo-text">AION CORE</div>
          <div className="logo-sub">Concrete Intelligence</div>
        </div>
      </div>
      {NAV.map(n => (
        <div
          key={n.id}
          className={`nav-item ${page === n.id ? 'active' : ''}`}
          onClick={() => setPage(n.id)}
        >
          <span className="nav-icon">{n.icon}</span>
          {n.label}
        </div>
      ))}
    </nav>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ page, plants, plantId, setPlantId, status, onLogout }) {
  const title = NAV.find(n => n.id === page)?.label ?? ''
  const phase = status?.phase ?? 'no_data'
  const phaseLabel = { steady: 'Steady-state', warmup: 'Warm-up', no_data: 'Sem dados' }[phase]

  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">
        {status && phase !== 'no_data' && (
          <div className="sigma-bar">
            σ <span className="sigma-val">{status.sigma?.toFixed(2)} MPa</span>
          </div>
        )}
        <div className={`status-pill ${phase}`}>
          <span className="dot" />
          {phaseLabel}
        </div>
        <div className="plant-select-wrap">
          <span>🏭</span>
          <select value={plantId ?? ''} onChange={e => setPlantId(e.target.value || null)}>
            <option value="">— selecionar planta —</option>
            {plants.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 8px', fontSize: 12 }}
          title="Sair"
          onClick={onLogout}
        >
          ⎋ Sair
        </button>
      </div>
    </header>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // null = verificando sessão, true = autenticado, false = não autenticado
  const [authed,  setAuthed]  = useState(null)
  const [page,    setPage]    = useState('cockpit')
  const [plants,  setPlants]  = useState([])
  const [plantId, setPlantId] = useState(() => localStorage.getItem('aion_plant_id') || null)
  const [status,  setStatus]  = useState(null)
  const [toast,   setToast]   = useState(null)
  const [aionOpen, setAionOpen] = useState(false)

  // ── Verificar sessão ativa ao carregar ────────────────────────────────────
  useEffect(() => {
    api.me()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
  }, [])

  // ── Persistir seleção de planta ───────────────────────────────────────────
  useEffect(() => {
    if (plantId) localStorage.setItem('aion_plant_id', plantId)
    else localStorage.removeItem('aion_plant_id')
  }, [plantId])

  // ── Carregar plantas após autenticação ────────────────────────────────────
  useEffect(() => {
    if (!authed) return
    api.getPlants()
      .then(list => {
        setPlants(list)
        if (!plantId && list.length > 0) setPlantId(list[0].id)
      })
      .catch(() => {})
  }, [authed])

  // ── Carregar status quando a planta muda ──────────────────────────────────
  useEffect(() => {
    if (!plantId || !authed) { setStatus(null); return }
    api.getPlantStatus(plantId).then(setStatus).catch(() => setStatus(null))
  }, [plantId, authed])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, key: Date.now() })
  }, [])

  const refreshStatus = useCallback(() => {
    if (!plantId) return
    api.getPlantStatus(plantId).then(setStatus).catch(() => {})
  }, [plantId])

  const handleLogout = useCallback(async () => {
    await api.logout().catch(() => {})
    setAuthed(false)
    setPlants([])
    setStatus(null)
  }, [])

  // ── Verificando sessão ────────────────────────────────────────────────────
  if (authed === null) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  // ── Não autenticado → tela de login ───────────────────────────────────────
  if (authed === false) {
    return <Login onLogin={() => setAuthed(true)} />
  }

  // ── App principal ─────────────────────────────────────────────────────────
  const pageEl = (() => {
    switch (page) {
      case 'cockpit': return <Cockpit status={status} refreshStatus={refreshStatus} />
      case 'batches': return <Batches />
      case 'ensaio':  return <Ensaio  refreshStatus={refreshStatus} />
      default:        return null
    }
  })()

  return (
    <ToastCtx.Provider value={showToast}>
      <PlantCtx.Provider value={{ plants, plantId, setPlantId, status, refreshStatus }}>
        <div className="layout">
          <Sidebar page={page} setPage={setPage} />
          <div className="main-area">
            <Topbar
              page={page}
              plants={plants}
              plantId={plantId}
              setPlantId={setPlantId}
              status={status}
              onLogout={handleLogout}
            />
            <main className="page-content">
              {pageEl}
            </main>
          </div>
        </div>
        {/* AION Agent FAB */}
        <button
          onClick={() => setAionOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 900,
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(0,194,203,0.2))',
            border: '1px solid rgba(201,168,76,0.4)',
            color: '#C9A84C', fontSize: 22, fontFamily: "'Cinzel', serif", fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0,194,203,0.15)',
            transition: 'all 0.2s',
          }}
          title="AION Agent"
        >A</button>
        <AIONChat
          isOpen={aionOpen}
          onClose={() => setAionOpen(false)}
          plantContext={status ? {
            id: plantId,
            name: plants.find(p => p.id === plantId)?.name || plantId,
            fc_inf: status.fc_inf ?? 50,
            k_rate: status.k ?? 0.25,
            sigma: status.sigma ?? 4.5,
            n_lots: status.n_lots ?? 0,
          } : null}
        />
        {toast && (
          <Toast
            key={toast.key}
            msg={toast.msg}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </PlantCtx.Provider>
    </ToastCtx.Provider>
  )
}
