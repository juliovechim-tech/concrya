import { useState } from 'react'
import { usePlant, useToast } from '../App.jsx'
import { api } from '../api.js'

function KPICard({ label, value, sub, colorClass }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorClass ?? ''}`}>{value ?? '—'}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function ParamCard({ label, value, unit }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value mono" style={{ fontSize: 22 }}>
        {value != null ? value.toFixed(value < 1 ? 4 : 2) : '—'}
        {unit && <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  )
}

export default function Cockpit({ status, refreshStatus }) {
  const { plantId } = usePlant()
  const toast = useToast()
  const [weekEnd, setWeekEnd] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - ((d.getDay() + 1) % 7 || 7))
    return d.toISOString().slice(0, 10)
  })
  const [generating, setGenerating] = useState(false)

  const generatePDF = async () => {
    if (!plantId) return
    setGenerating(true)
    try {
      const blob = await api.downloadWeeklyReport(plantId, weekEnd)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `aion_weekly_${plantId}_${weekEnd.replace(/-/g, '')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('Relatório gerado com sucesso!', 'success')
    } catch (e) {
      toast(`Erro: ${e.message}`, 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (!plantId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏭</div>
        <div className="empty-title">Nenhuma planta selecionada</div>
        <div className="empty-sub">Selecione ou crie uma planta no menu superior.</div>
      </div>
    )
  }

  const phase      = status?.phase ?? 'no_data'
  const isDefault  = status?.is_default ?? true
  const snapDate   = status?.snapshot_date ?? null
  const nPairs     = status?.n_pairs ?? 0

  const phaseLabel = {
    steady:  'Steady-state',
    warmup:  'Warm-up',
    no_data: 'Sem dados',
  }[phase]

  return (
    <div>
      {/* Status header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div className={`status-pill ${phase}`} style={{ fontSize: 14, padding: '6px 14px' }}>
          <span className="dot" />
          {phaseLabel}
        </div>
        {isDefault && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Usando parâmetros padrão — calibração ainda não iniciada
          </span>
        )}
        {!isDefault && snapDate && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Última calibração: {snapDate} · {nPairs} par(es) fc₇/fc₂₈
          </span>
        )}
        <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={refreshStatus}>
          ↻ Atualizar
        </button>
      </div>

      {/* Parâmetros vigentes */}
      <div className="section-title">Parâmetros Vigentes</div>
      <div className="param-grid" style={{ marginBottom: 28 }}>
        <ParamCard label="fc∞ (resistência assintótica)" value={status?.fc_inf} unit="MPa" />
        <ParamCard label="k (velocidade de ganho)"        value={status?.k}      unit="d⁻¹" />
        <ParamCard label="σ (desvio padrão)"              value={status?.sigma}  unit="MPa" />
      </div>

      {/* KPIs de incerteza */}
      <div className="section-title">Incerteza</div>
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <KPICard
          label="Observações σ"
          value={status?.sigma_n ?? 0}
          sub="Ensaios usados para estimar σ"
          colorClass={status?.sigma_n >= 5 ? 'steady' : 'accent'}
        />
        <KPICard
          label="Pares fc₇/fc₂₈"
          value={nPairs}
          sub="Lotes com ambas as idades"
          colorClass={nPairs >= 2 ? 'steady' : 'gold'}
        />
        <KPICard
          label="Snapshot ID"
          value={status?.snapshot_id ?? 'default'}
          sub="Identificador da calibração vigente"
          colorClass="accent"
        />
      </div>

      {/* Relatório semanal */}
      <div className="section-title">Relatório Semanal</div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="form-label">Semana até (domingo)</div>
          <input
            type="date"
            className="input"
            style={{ width: 180 }}
            value={weekEnd}
            onChange={e => setWeekEnd(e.target.value)}
          />
        </div>
        <div style={{ paddingTop: 18 }}>
          <button
            className="btn btn-primary"
            onClick={generatePDF}
            disabled={generating}
          >
            {generating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⬇'}
            {generating ? 'Gerando…' : 'Baixar PDF'}
          </button>
        </div>
        <div style={{ paddingTop: 18, color: 'var(--text-muted)', fontSize: 12 }}>
          O relatório cobre seg-dom da semana selecionada.
        </div>
      </div>

      {/* Criar planta rápida */}
      <CreatePlantCard />
    </div>
  )
}

function CreatePlantCard() {
  const { plants, setPlantId } = usePlant()
  const toast = useToast()
  const [id, setId]     = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const submit = async () => {
    if (!id.trim() || !name.trim()) return
    setLoading(true)
    try {
      await api.createPlant({ id: id.trim(), name: name.trim() })
      toast(`Planta "${name}" criada!`, 'success')
      setPlantId(id.trim())
      setId(''); setName(''); setOpen(false)
      window.location.reload()
    } catch (e) {
      toast(`Erro: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <div style={{ marginTop: 8 }}>
      <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setOpen(true)}>
        + Nova Planta
      </button>
    </div>
  )

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-title">Nova Planta</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">ID (ex: PLANTA-02)</label>
          <input className="input" value={id} onChange={e => setId(e.target.value.toUpperCase())} placeholder="PLANTA-02" />
        </div>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Filial RJ" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading || !id || !name}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Criar'}
        </button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  )
}
