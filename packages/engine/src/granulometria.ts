// Densus Engine — Curvas granulométricas teóricas
//
// @ref Fuller & Thompson (1907). Proportioning Concrete.
// @ref Bolomey, J. (1935). Determination of the compressive strength of mortars and concretes.
// @ref Andreasen, A.H.M. & Andersen, J. (1930). Über die Beziehung...
// @ref Faury, J. (1958). Le béton.

/** Ponto de uma curva granulométrica */
export interface PontoGranulometrico {
  peneira: number   // mm
  cpft: number      // % passante acumulado 0..100
  metodo: string
}

/** Peneiras padrão ABNT NBR NM 248 (série completa) */
export const PENEIRAS_ABNT: number[] = [
  75, 63, 50, 37.5, 31.5, 25, 19, 12.5, 9.5,
  6.3, 4.8, 2.4, 1.2, 0.6, 0.3, 0.15, 0.075,
]

/**
 * Curva de Fuller (1907): P(D) = sqrt(D / Dmax) × 100
 * @ref Fuller & Thompson (1907)
 */
export function fuller(dmax: number, peneiras?: number[]): PontoGranulometrico[] {
  const sieves = (peneiras ?? PENEIRAS_ABNT).filter(p => p <= dmax)
  return sieves.map(p => ({
    peneira: p,
    cpft: Math.round(Math.sqrt(p / dmax) * 10000) / 100,
    metodo: "Fuller",
  }))
}

/**
 * Curva de Faury (1958): P(D) = A + (100 - A) × sqrt(D / Dmax)
 * A = coeficiente de finos (tipicamente 8-15%)
 * Quando A não fornecido, calcula automaticamente para dmin=0.075mm
 * @ref Faury, J. (1958). Le béton.
 */
export function faury(
  dmax: number,
  params?: { A?: number; dmin?: number },
  peneiras?: number[],
): PontoGranulometrico[] {
  const dmin = params?.dmin ?? 0.075
  let A = params?.A
  if (A === undefined) {
    const x = Math.sqrt(dmin / dmax)
    A = Math.round(((0 - 100 * x) / (1 - x)) * 100) / 100
    A = Math.max(0, Math.min(A, 20))
  }

  const sieves = (peneiras ?? PENEIRAS_ABNT).filter(p => p <= dmax)
  return sieves.map(p => ({
    peneira: p,
    cpft: Math.round((A + (100 - A) * Math.sqrt(p / dmax)) * 100) / 100,
    metodo: "Faury",
  }))
}

/**
 * Curva de Bolomey (1935): P(D) = A + (100 - A) × sqrt(D / Dmax)
 * Idêntica à Faury na forma, com A calibrado diferente
 * A = residual de finos (tipicamente 8-15%)
 * @ref Bolomey, J. (1935)
 */
export function bolomey(
  dmax: number,
  params?: { A?: number; dmin?: number },
  peneiras?: number[],
): PontoGranulometrico[] {
  const dmin = params?.dmin ?? 0.075
  let A = params?.A
  if (A === undefined) {
    const x = Math.sqrt(dmin / dmax)
    A = Math.round(((0 - 100 * x) / (1 - x)) * 100) / 100
    A = Math.max(0, Math.min(A, 20))
  }

  const sieves = (peneiras ?? PENEIRAS_ABNT).filter(p => p <= dmax)
  return sieves.map(p => ({
    peneira: p,
    cpft: Math.round((A + (100 - A) * Math.sqrt(p / dmax)) * 100) / 100,
    metodo: "Bolomey",
  }))
}

/**
 * Curva de Andreasen-Mulcahy (1930):
 * P(D) = [(D^q - Dmin^q) / (Dmax^q - Dmin^q)] × 100
 *
 * q = 0.50 → Fuller clássico
 * q = 0.37 → Andreasen otimizado
 * q = 0.25 → Rico em finos (concretos fluidos)
 *
 * @ref Andreasen, A.H.M. (1930)
 */
export function andreasenMulcahy(
  dmax: number,
  dmin = 0.075,
  q = 0.37,
  peneiras?: number[],
): PontoGranulometrico[] {
  const sieves = (peneiras ?? PENEIRAS_ABNT).filter(p => p <= dmax && p >= dmin)
  const dMaxQ = Math.pow(dmax, q)
  const dMinQ = Math.pow(dmin, q)
  const denominador = dMaxQ - dMinQ

  if (denominador <= 0) throw new Error("Dmax deve ser maior que Dmin")

  return sieves.map(p => ({
    peneira: p,
    cpft: Math.round(((Math.pow(p, q) - dMinQ) / denominador) * 10000) / 100,
    metodo: "Andreasen",
  }))
}
