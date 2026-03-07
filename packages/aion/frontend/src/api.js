/**
 * AION API client
 *
 * Autenticação via cookie HttpOnly (aion_session).
 * O browser envia o cookie automaticamente; o frontend nunca lê ou armazena
 * nenhuma chave secreta.  Todas as requests usam credentials: "include".
 */

async function req(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const e   = new Error(err.detail || `HTTP ${res.status}`)
    e.status  = res.status
    throw e
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Auth
  login:  (username, password) => req('POST', '/auth/login',  { username, password }),
  logout: ()                   => req('POST', '/auth/logout'),
  me:     ()                   => req('GET',  '/auth/me'),

  // Plants
  getPlants:      ()        => req('GET',  '/api/v1/plants'),
  createPlant:    (data)    => req('POST', '/api/v1/plants', data),
  getPlantStatus: (plantId) => req('GET',  `/api/v1/plants/${encodeURIComponent(plantId)}/status`),

  // Batches
  getBatches: (plantId, skip = 0, limit = 50) => {
    const qs = new URLSearchParams({ skip, limit })
    if (plantId) qs.set('plant_id', plantId)
    return req('GET', `/api/v1/batches?${qs}`)
  },
  createBatch: (data) => req('POST', '/api/v1/batches', data),
  importBatchesCsv: async (file, plantId) => {
    const form = new FormData()
    form.append('file', file)
    const qs  = plantId ? `?plant_id=${encodeURIComponent(plantId)}` : ''
    const res = await fetch(`/api/v1/batches/import/csv${qs}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      const e   = new Error(err.detail || `HTTP ${res.status}`)
      e.status  = res.status
      throw e
    }
    return res.json()
  },

  // Results
  postResult: (data) => req('POST', '/api/v1/results/strength', data),

  // Reports — returns a Blob for download
  downloadWeeklyReport: async (plantId, weekEnd) => {
    const qs = new URLSearchParams({ plant_id: plantId })
    if (weekEnd) qs.set('week_end', weekEnd)
    const res = await fetch(`/api/v1/reports/weekly?${qs}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.blob()
  },

  // Health (público)
  health: () => fetch('/health').then(r => r.json()),
}
