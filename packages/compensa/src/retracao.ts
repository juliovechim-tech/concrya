// COMPENSA CORE — Modelo de Retracao
//
// Retracao total = autogena + por secagem
//
// Retracao autogena (fib MC2010, Eq. 5.1-57):
//   ε_ca(t) = ε_ca_inf × β_as(t)
//   ε_ca_inf = -2.5 × (fck - 10) × 10^-6    para fck em MPa
//   β_as(t) = 1 - exp(-0.2 × √t)            t em dias
//
// Retracao por secagem (fib MC2010, Eq. 5.1-61):
//   ε_cd(t) = ε_cd_inf × β_ds(t, h0)
//   ε_cd_inf = f(fck, RH)                    tabela 5.1-10
//   β_ds(t, h0) = (t - ts) / [(t - ts) + 0.04 × √(h0^3)]
//   h0 = 2 × Ac / u  (espessura equivalente, mm)
//
// Retracao total:
//   ε_cs(t) = ε_ca(t) + ε_cd(t)
//
// Ref: fib Model Code 2010, Cap. 5.1.10.
//      ACI 209R-92: Prediction of Creep, Shrinkage and Temperature Effects.
//      Neville, A.M. (2016). Properties of Concrete, 5th ed.

import type { ParamsRetracao } from "./types"

/**
 * Calcula retracao total (autogena + secagem) em µε.
 * Valor retornado e negativo (contracao).
 */
export function calcRetracao(params: ParamsRetracao): number {
  const { ac, cimentoKgM3, umidadeRelPct, espessuraEqMm, idadeDias } = params

  // Estimativa de fck a partir de a/c (Abrams simplificado, referencia)
  const fckEst = 80 / Math.pow(1.5, ac)

  // ── Retracao autogena ─────────────────────────────────────────
  const ecaInf = -2.5 * (fckEst - 10) * 1e-6 * 1e6  // em µε
  const betaAs = 1 - Math.exp(-0.2 * Math.sqrt(idadeDias))
  const eca = ecaInf * betaAs

  // ── Retracao por secagem ──────────────────────────────────────
  // ε_cd_inf depende de fck e RH (simplificado do fib MC2010)
  const ecdInf = calcEcdInf(fckEst, umidadeRelPct)
  const ts = 1  // inicio secagem apos 1 dia
  const dt = Math.max(0, idadeDias - ts)
  const h0 = espessuraEqMm
  const betaDs = dt > 0 ? dt / (dt + 0.04 * Math.sqrt(h0 * h0 * h0)) : 0
  const ecd = ecdInf * betaDs

  // ── Modificadores ─────────────────────────────────────────────
  let fatorMod = 1.0
  if (params.comFibras) fatorMod *= 0.80       // fibras reduzem ~20%
  if (params.curaUmidaProlongada) fatorMod *= 0.85  // cura > 7d reduz ~15%

  // Volume de pasta alto = mais retracao
  const vpRef = 300  // L/m3 referencia
  const fatorVp = Math.max(0.7, Math.min(1.4, (params.volumePastaLM3 ?? vpRef) / vpRef))

  const retracaoTotal = (eca + ecd) * fatorMod * fatorVp

  // Retorna negativo (contracao)
  return Math.round(retracaoTotal * 10) / 10
}

/**
 * ε_cd_inf simplificado do fib MC2010 (µε).
 * Interpolacao linear entre pontos tabelados.
 */
function calcEcdInf(fck: number, rh: number): number {
  // Tabela simplificada fib MC2010 Tab. 5.1-10 (valores tipicos)
  // RH=40%: fck20=-800, fck40=-600, fck60=-450
  // RH=60%: fck20=-600, fck40=-450, fck60=-340
  // RH=80%: fck20=-350, fck40=-260, fck60=-200
  // RH=100%: 0

  if (rh >= 99) return 0

  // Fator RH: β_RH = 1.55 × [1 - (RH/100)^3]  (fib MC2010)
  const betaRH = 1.55 * (1 - Math.pow(rh / 100, 3))

  // Fator fck: ε_s_base diminui com fck
  // Base para fck=20: -550 µε, escala com [220 + 10×fck]
  const epsBase = -550 * (220 + 10 * 20) / (220 + 10 * Math.max(20, Math.min(80, fck)))

  return epsBase * betaRH
}
