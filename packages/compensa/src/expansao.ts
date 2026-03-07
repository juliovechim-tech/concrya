// COMPENSA CORE — Modelo de Expansao
//
// Expansao restringida do agente expansivo (AE) ao longo do tempo.
//
// Modelo cinetico (baseado em Chatterji, 1995 + ACI 223R-10):
//   ε_exp(t) = ε_max × [1 - exp(-(t/τ)^β)]
//
// Onde:
//   ε_max = expansao maxima restringida (depende de dosagem, tipo AE, restricao)
//   τ     = constante de tempo (depende de tipo AE e temperatura)
//   β     = expoente de forma (~1.2 para tipo K, ~0.8 para tipo M)
//
// Efeito da temperatura (Arrhenius simplificado):
//   τ(T) = τ_ref × exp[Ea/R × (1/T - 1/T_ref)]
//   Ea ≈ 45 kJ/mol para formacao de etringita (Damidot & Glasser, 1993)
//
// Efeito da restricao:
//   ε_rest = ε_livre × kr
//   kr = 0 (livre) a 1 (rigido)
//   Tipicamente kr = 0.15-0.30 para pisos sobre base, 0.50-0.80 para vigas armadas
//
// Ref: ACI 223R-10. Guide for the Use of Shrinkage-Compensating Concrete.
//      Chatterji, S. (1995). Cem. Concr. Res. 25(1), 51-56.
//      Damidot, D. & Glasser, F.P. (1993). Cem. Concr. Res. 23, 221-238.

import type { AgenteExpansivo, TipoAE, ParamsExpansao } from "./types"

const R_GAS = 8.314  // J/(mol·K)

/** Banco de agentes expansivos de referencia */
export const AGENTES_EXPANSIVOS: AgenteExpansivo[] = [
  {
    codigo: "AE-K1",
    nome: "Denka CSA #20",
    fabricante: "Denka (Chimica Edile)",
    tipo: "tipo_k",
    rho: 2.90,
    dosMinPct: 6,
    dosMaxPct: 15,
    dosRefPct: 10,
    expansao7dUe: 250,
    expansao28dUe: 300,
    tempMaxCuraC: 38,
  },
  {
    codigo: "AE-K2",
    nome: "Mapecure SRA + Expancrete",
    fabricante: "Mapei",
    tipo: "tipo_k",
    rho: 2.85,
    dosMinPct: 5,
    dosMaxPct: 12,
    dosRefPct: 8,
    expansao7dUe: 200,
    expansao28dUe: 250,
    tempMaxCuraC: 35,
  },
  {
    codigo: "AE-M1",
    nome: "CaO Livre Moido #200",
    fabricante: "Generico",
    tipo: "tipo_m",
    rho: 3.30,
    dosMinPct: 3,
    dosMaxPct: 8,
    dosRefPct: 5,
    expansao7dUe: 350,
    expansao28dUe: 400,
    tempMaxCuraC: 40,
  },
  {
    codigo: "AE-S1",
    nome: "MgO Reativo #325",
    fabricante: "Generico",
    tipo: "tipo_s",
    rho: 3.58,
    dosMinPct: 4,
    dosMaxPct: 10,
    dosRefPct: 6,
    expansao7dUe: 150,
    expansao28dUe: 350,
    tempMaxCuraC: 45,
  },
]

/** Parametros cineticos por tipo de AE (calibrados) */
const CINETICA_AE: Record<TipoAE, { tauRef: number; beta: number; eaKj: number; eMaxRef: number }> = {
  tipo_k: { tauRef: 2.5, beta: 1.2, eaKj: 45, eMaxRef: 350 },   // etringita rapida
  tipo_m: { tauRef: 1.5, beta: 0.8, eaKj: 35, eMaxRef: 500 },   // CaO muito rapido
  tipo_g: { tauRef: 2.0, beta: 1.0, eaKj: 40, eMaxRef: 400 },   // combinado
  tipo_s: { tauRef: 8.0, beta: 1.5, eaKj: 55, eMaxRef: 400 },   // MgO lento
}

/**
 * Calcula expansao restringida do AE ao longo do tempo.
 *
 * @returns Expansao restringida — µε (microdeformacao)
 */
export function calcExpansao(params: ParamsExpansao): number {
  const { tipoAE, dosAePct, cimentoKgM3, tempCuraC, grauRestricao, idadeDias } = params
  const cin = CINETICA_AE[tipoAE]

  // Consumo de AE em kg/m3
  const aeKgM3 = cimentoKgM3 * (dosAePct / 100)

  // Expansao maxima livre (proporcional a dosagem vs referencia 10%)
  const dosRef = 10 // % referencia
  const fatorDos = dosAePct / dosRef
  const eMaxLivre = cin.eMaxRef * fatorDos

  // Efeito da restricao
  const eMax = eMaxLivre * Math.max(0.05, 1 - grauRestricao * 0.7)

  // Efeito da temperatura no tau (Arrhenius)
  const T = tempCuraC + 273.15
  const Tref = 293.15 // 20°C
  const tau = cin.tauRef * Math.exp((cin.eaKj * 1000 / R_GAS) * (1 / T - 1 / Tref))

  // Cinetica: ε(t) = ε_max × [1 - exp(-(t/τ)^β)]
  const tNorm = Math.max(0, idadeDias) / tau
  const expansao = eMax * (1 - Math.exp(-Math.pow(tNorm, cin.beta)))

  return Math.round(expansao * 10) / 10
}
