// Densus Engine — Motor de maturidade (Arrhenius + Nurse-Saul)
// Portado de: aion_pilot_kit/pilot_report.py (CONCRYA Technologies)

const R_GAS = 8.314462618 // J/(mol·K)

// ── Modelos de tempo equivalente ────────────────────────────────

/** Tempo equivalente pelo modelo de Arrhenius (ASTM C1074) */
export function teqArrhenius(
  age: number,
  tempC: number,
  trefC = 20.0,
  ea = 40000.0
): number {
  const T = tempC + 273.15
  const Tref = trefC + 273.15
  return age * Math.exp((ea / R_GAS) * (1.0 / Tref - 1.0 / T))
}

/** Tempo equivalente pelo modelo de Nurse-Saul */
export function teqNurseSaul(
  age: number,
  tempC: number,
  t0C = 0.0,
  trefC = 20.0
): number {
  return age * Math.max(0, tempC - t0C) / Math.max(1e-6, trefC - t0C)
}

// ── Modelo de resistencia ───────────────────────────────────────

/** fc(teq) = fcInf × (1 - exp(-k × teq))^m */
export function fcModel(teq: number, fcInf: number, k: number, m = 1.0): number {
  const base = Math.max(1e-12, 1 - Math.exp(-k * teq))
  return fcInf * Math.pow(base, m)
}

/** Previsao de resistencia dado temperatura e idade */
export function predictFc(params: {
  tempC: number
  age: number
  fcInf?: number
  k?: number
  m?: number
  ea?: number
  trefC?: number
  t0C?: number
  model?: "arrhenius" | "nurse_saul"
}): number {
  const {
    tempC, age, fcInf = 55, k = 0.25, m = 1.0,
    ea = 40000, trefC = 20, t0C = 0, model = "arrhenius",
  } = params
  const teq = model === "nurse_saul"
    ? teqNurseSaul(age, tempC, t0C, trefC)
    : teqArrhenius(age, tempC, trefC, ea)
  return fcModel(Math.max(1e-9, teq), fcInf, k, m)
}

// ── Calibracao automatica de parametros ─────────────────────────

export interface LoteEnsaio {
  externalId: string
  temperature: number   // °C
  targetFck: number     // MPa
  ageDays: number
  fcMpa: number         // resultado real
}

/**
 * Estima fcInf e k pelos dados de campo (metodo dos dois pontos por bissecao).
 */
export function estimateParams(
  records: LoteEnsaio[],
  model: "arrhenius" | "nurse_saul" = "arrhenius"
): { fcInf: number; k: number } {
  const age28 = records.filter(r => Math.abs(r.ageDays - 28) < 1)

  if (!age28.length) return { fcInf: 55, k: 0.25 }

  const tempMean = age28.reduce((s, r) => s + r.temperature, 0) / age28.length

  const teq = (age: number, t: number) =>
    model === "nurse_saul" ? teqNurseSaul(age, t) : teqArrhenius(age, t)

  const teq7m = teq(7, tempMean)
  const teq28m = teq(28, tempMean)

  const byId: Record<string, Record<number, LoteEnsaio>> = {}
  for (const r of records) {
    if (!byId[r.externalId]) byId[r.externalId] = {}
    byId[r.externalId]![r.ageDays] = r
  }
  const ratios = Object.values(byId)
    .map(pts => {
      const fc7 = Object.values(pts).find(p => Math.abs(p.ageDays - 7) < 0.6)?.fcMpa
      const fc28 = Object.values(pts).find(p => Math.abs(p.ageDays - 28) < 1)?.fcMpa
      return fc7 && fc28 && fc28 > 0 ? fc7 / fc28 : null
    })
    .filter((r): r is number => r !== null)

  let kEst = 0.12
  if (ratios.length >= 2) {
    const meanRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length
    const ratioHat = (k: number) =>
      (1 - Math.exp(-k * teq7m)) / Math.max(1e-9, 1 - Math.exp(-k * teq28m))
    let lo = 0.001
    let hi = 5.0
    const gLo = ratioHat(lo) - meanRatio
    const gHi = ratioHat(hi) - meanRatio
    if (gLo * gHi < 0) {
      let gLoLocal = gLo
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2
        if ((ratioHat(mid) - meanRatio) * gLoLocal <= 0) hi = mid
        else { lo = mid; gLoLocal = ratioHat(lo) - meanRatio }
      }
      kEst = (lo + hi) / 2
    }
  }

  const fc28Mean = age28.reduce((s, r) => s + r.fcMpa, 0) / age28.length
  const denom = Math.max(1e-9, 1 - Math.exp(-kEst * teq28m))
  const fcInfEst = fc28Mean / denom

  return {
    fcInf: Math.round(fcInfEst * 100) / 100,
    k: Math.round(Math.max(0.05, kEst) * 100000) / 100000,
  }
}

// ── Metricas de qualidade ───────────────────────────────────────

export interface ThermoMetrics {
  n: number
  mae: number
  rmse: number
  mape: number
  bias: number
}

export function calcMetrics(actual: number[], predicted: number[]): ThermoMetrics {
  const n = actual.length
  const mae = actual.reduce((s, a, i) => s + Math.abs(a - predicted[i]!), 0) / n
  const rmse = Math.sqrt(actual.reduce((s, a, i) => s + (a - predicted[i]!) ** 2, 0) / n)
  const mape = 100 * actual.reduce((s, a, i) => s + Math.abs((a - predicted[i]!) / Math.max(1e-9, a)), 0) / n
  const bias = actual.reduce((s, a, i) => s + (predicted[i]! - a), 0) / n
  return {
    n,
    mae: +mae.toFixed(2),
    rmse: +rmse.toFixed(2),
    mape: +mape.toFixed(1),
    bias: +bias.toFixed(2),
  }
}

// ── Criterio GO/NO-GO (AION Pilot) ─────────────────────────────

export function avaliarPiloto(metrics: ThermoMetrics): {
  status: "GO" | "AJUSTE" | "NO_GO"
  mensagem: string
} {
  if (metrics.mae < 3.0 && metrics.mape < 8)
    return { status: "GO", mensagem: "Pronto para piloto — MAE < 3 MPa e MAPE < 8%" }
  if (metrics.mae < 6.0)
    return { status: "AJUSTE", mensagem: "Calibrar com mais dados de campo — MAE entre 3 e 6 MPa" }
  return { status: "NO_GO", mensagem: "Revisar parametros — MAE > 6 MPa" }
}
