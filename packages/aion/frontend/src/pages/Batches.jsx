import { useState, useEffect, useRef } from 'react'
import { usePlant, useToast } from '../App.jsx'
import { api } from '../api.js'

export default function Batches() {
  const { plantId } = usePlant()
  const toast = useToast()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const fileRef = useRef(null)

  // New-batch form state
  const [extId, setExtId]     = useState('')
  const [fck, setFck]         = useState('')
  const [temp, setTemp]       = useState('')
  const [date, setDate]       = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    if (!plantId) return
    setLoading(true)
    try {
      const list = await api.getBatches(plantId, 0, 100)
      setBatches(list)
    } catch (e) {
      toast(`Erro ao carregar lotes: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [plantId])

  const submit = async () => {
    if (!extId.trim() || !temp) return
    setSaving(true)
    try {
      await api.createBatch({
        plant_id:    plantId,
        external_id: extId.trim(),
        target_fck:  fck  ? parseFloat(fck)  : 0,
        temperature: parseFloat(temp),
        occurred_at: `${date}T00:00:00`,
      })
      toast(`Lote "${extId}" criado!`, 'success')
      setExtId(''); setFck(''); setTemp(''); setShowForm(false)
      load()
    } catch (e) {
      toast(`Erro: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const importCsv = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvLoading(true)
    try {
      const res = await api.importBatchesCsv(file, plantId)
      toast(`CSV: ${res.created} criados, ${res.skipped_existing} ignorados`, 'success')
      if (res.errors?.length) toast(`Avisos: ${res.errors.slice(0, 3).join('; ')}`, 'error')
      load()
    } catch (e) {
      toast(`Erro CSV: ${e.message}`, 'error')
    } finally {
      setCsvLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!plantId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">◫</div>
        <div className="empty-title">Nenhuma planta selecionada</div>
        <div className="empty-sub">Selecione uma planta no menu superior.</div>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancelar' : '+ Novo Lote'}
        </button>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          {csvLoading
            ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Importando…</>
            : '⬆ Importar CSV'}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={importCsv}
          />
        </label>
        <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={load}>
          ↻ Atualizar
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {batches.length} lote{batches.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Novo Lote</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ID Externo *</label>
              <input
                className="input"
                value={extId}
                onChange={e => setExtId(e.target.value)}
                placeholder="BET-2026-001"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Concretagem</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">fck nominal (MPa)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.5"
                value={fck}
                onChange={e => setFck(e.target.value)}
                placeholder="35"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Temperatura média (°C) *</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.5"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                placeholder="23"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={saving || !extId.trim() || !temp}
            >
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Criar'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Batch table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <span className="spinner" />
        </div>
      ) : batches.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 0' }}>
          <div className="empty-icon">◫</div>
          <div className="empty-title">Nenhum lote cadastrado</div>
          <div className="empty-sub">Crie um lote manualmente ou importe via CSV.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Externo</th>
                <th>Data</th>
                <th>fck (MPa)</th>
                <th>Temp (°C)</th>
                <th>Slump (mm)</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id}>
                  <td><span className="mono">{b.external_id}</span></td>
                  <td>{b.occurred_at ? String(b.occurred_at).slice(0, 10) : '—'}</td>
                  <td>{b.target_fck != null ? b.target_fck : '—'}</td>
                  <td>{b.temperature != null ? b.temperature : '—'}</td>
                  <td>{b.slump_measured ?? b.target_slump ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{b.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
