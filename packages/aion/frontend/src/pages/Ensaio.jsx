import { useState, useEffect } from 'react'
import { usePlant, useToast } from '../App.jsx'
import { api } from '../api.js'

// Mini bar showing |residual| / σ ratio
function ResidualBar({ residual, sigma }) {
  if (!sigma) return null
  const ratio = Math.abs(residual) / sigma
  const pct   = Math.min(ratio * 33.33, 100) // 3σ → 100 %
  const color  = ratio > 2 ? 'var(--danger)' : ratio > 1 ? 'var(--gold)' : 'var(--steady)'
  const label  = ratio > 2 ? '> 2σ — verificar!' : ratio > 1 ? '> 1σ' : 'dentro de 1σ'
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>
        <span>|resíduo| / σ = {ratio.toFixed(2)}</span>
        <span style={{ color }}>{label}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

export default function Ensaio({ refreshStatus }) {
  const { plantId } = usePlant()
  const toast = useToast()
  const [batches, setBatches]       = useState([])
  const [extId, setExtId]           = useState('')
  const [age, setAge]               = useState('')
  const [fc, setFc]                 = useState('')
  const [specimens, setSpecimens]   = useState('3')
  const [lab, setLab]               = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState(null)

  useEffect(() => {
    if (!plantId) return
    api.getBatches(plantId, 0, 200).then(setBatches).catch(() => {})
  }, [plantId])

  const submit = async () => {
    if (!extId || !age || !fc) return
    setSubmitting(true)
    setResult(null)
    try {
      const out = await api.postResult({
        external_id:    extId,
        age_days:       parseFloat(age),
        fc_mpa:         parseFloat(fc),
        specimen_count: parseInt(specimens) || 3,
        lab:            lab.trim(),
        notes:          notes.trim() || undefined,
      })
      setResult(out)
      toast('Ensaio registrado com sucesso!', 'success')
      refreshStatus?.()
      // keep extId for follow-up tests on same batch; clear measurements
      setAge(''); setFc(''); setLab(''); setNotes('')
    } catch (e) {
      toast(`Erro: ${e.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!plantId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⊞</div>
        <div className="empty-title">Nenhuma planta selecionada</div>
        <div className="empty-sub">Selecione uma planta no menu superior.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

      {/* ── Form ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">Registrar Resultado de Ensaio</div>

        <div className="form-group">
          <label className="form-label">Lote *</label>
          <select className="input" value={extId} onChange={e => setExtId(e.target.value)}>
            <option value="">— selecionar lote —</option>
            {batches.map(b => (
              <option key={b.id} value={b.external_id}>
                {b.external_id}
                {b.occurred_at ? ` · ${String(b.occurred_at).slice(0, 10)}` : ''}
                {b.target_fck  ? ` · fck ${b.target_fck} MPa` : ''}
              </option>
            ))}
          </select>
          {batches.length === 0 && (
            <div className="form-hint">Nenhum lote disponível — cadastre lotes na aba Lotes.</div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Idade (dias) *</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="7"
            />
            <div className="form-hint">Idades comuns: 3, 7, 14, 28 d</div>
          </div>
          <div className="form-group">
            <label className="form-label">fc medida (MPa) *</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              value={fc}
              onChange={e => setFc(e.target.value)}
              placeholder="32.5"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nº de corpos de prova</label>
            <input
              className="input"
              type="number"
              min="1"
              value={specimens}
              onChange={e => setSpecimens(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Laboratório</label>
            <input
              className="input"
              value={lab}
              onChange={e => setLab(e.target.value)}
              placeholder="Lab. Interno"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Observações</label>
          <input
            className="input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={submit}
          disabled={submitting || !extId || !age || !fc}
        >
          {submitting
            ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Registrando…</>
            : '⊞ Registrar'}
        </button>
      </div>

      {/* ── Result panel ─────────────────────────────────── */}
      {result ? (
        <div>
          <div className="result-panel">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              Resultado #{result.id} — Lote {result.batch_id}
            </div>

            <div className="result-row">
              <span className="result-key">fc medida</span>
              <span className="result-value" style={{ color: 'var(--text-primary)' }}>
                {result.fc_mpa.toFixed(2)} MPa
              </span>
            </div>
            <div className="result-row">
              <span className="result-key">fc prevista (AION)</span>
              <span className="result-value" style={{ color: 'var(--accent)' }}>
                {result.fc_predicted.toFixed(2)} MPa
              </span>
            </div>
            <div className="result-row">
              <span className="result-key">Resíduo</span>
              <span className="result-value" style={{ color: result.residual < -result.calibration.sigma * 2 ? 'var(--danger)' : result.residual < 0 ? 'var(--gold)' : 'var(--steady)' }}>
                {result.residual > 0 ? '+' : ''}{result.residual.toFixed(2)} MPa
              </span>
            </div>

            <ResidualBar residual={result.residual} sigma={result.calibration.sigma} />

            {/* Calibration summary */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                Parâmetros após calibração
              </div>
              <div className="result-row">
                <span className="result-key">σ</span>
                <span className="result-value">{result.calibration.sigma.toFixed(3)} MPa</span>
              </div>
              <div className="result-row">
                <span className="result-key">fc∞</span>
                <span className="result-value">{result.calibration.fc_inf.toFixed(2)} MPa</span>
              </div>
              <div className="result-row">
                <span className="result-key">k</span>
                <span className="result-value">{result.calibration.k.toFixed(4)} d⁻¹</span>
              </div>
              <div className="result-row" style={{ borderBottom: 'none' }}>
                <span className="result-key">Snapshot</span>
                <span className="result-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {result.calibration.snapshot_id ?? 'default'}
                  {result.calibration.calibration_updated && (
                    <span className="badge badge-steady">atualizado</span>
                  )}
                  {result.calibration.sigma_updated && (
                    <span className="badge badge-warmup">σ novo</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {result.alerts.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Alertas</div>
              {result.alerts.map((a, i) => (
                <div key={i} className="alert-row">
                  <div>
                    <div className="alert-type">{a.alert_type}</div>
                    <div className="alert-msg">
                      {a.fc_actual != null && `fc={a.fc_actual.toFixed(1)}`}
                      {a.fc_predicted != null && ` · pred=${a.fc_predicted.toFixed(1)}`}
                      {a.fc_threshold != null && ` · thr=${a.fc_threshold.toFixed(1)}`}
                    </div>
                  </div>
                  <span className={`badge badge-${a.alert_type === 'NC' ? 'nc' : 'drift'}`}>
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div className="empty-icon" style={{ fontSize: 36 }}>⊞</div>
          <div className="empty-title">Aguardando ensaio</div>
          <div className="empty-sub">
            Preencha o formulário ao lado e registre um resultado para ver a análise AION.
          </div>
        </div>
      )}
    </div>
  )
}
