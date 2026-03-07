// ECORISK(R) — Funcoes de Desejabilidade (Derringer & Suich, 1980)
//
// Desejabilidade individual:
//   menor_melhor:  d = ((U - y) / (U - L))^s     para L <= y <= U
//   maior_melhor:  d = ((y - L) / (U - L))^s     para L <= y <= U
//   nominal_melhor: bilateral com alvo T
//     se L <= y <= T:  d = ((y - L) / (T - L))^s
//     se T <= y <= U:  d = ((U - y) / (U - T))^t
//
// Desejabilidade global ponderada:
//   Dw = (∏ di^wi)^(1/Σwi)
//
// Ref: Derringer, G. & Suich, R. (1980). J. Quality Technology, 12(4), 214-219.

import type { DesejabilidadeConfig } from "./types"

/**
 * Calcula desejabilidade individual de Derringer-Suich.
 *
 * @param valor - Valor medido/calculado do indicador
 * @param config - Configuracao do indicador (limites, tipo, expoente)
 * @returns d entre 0 (inaceitavel) e 1 (ideal)
 */
export function calcDesejabilidade(valor: number, config: DesejabilidadeConfig): number {
  const { limiteInf: L, limiteSup: U, alvo: T, expoente: s, tipo } = config

  // Epsilon minimo para evitar colapso do produto geometrico (Dw=0).
  // Harrington (1965): forma exponencial nunca atinge exatamente 0.
  // Valor 0.01 = "extremamente indesejavel, mas nao impossivel".
  const D_MIN = 0.01

  if (tipo === "menor_melhor") {
    if (valor <= L) return 1
    if (valor >= U) return D_MIN
    return Math.pow((U - valor) / (U - L), s)
  }

  if (tipo === "maior_melhor") {
    if (valor >= U) return 1
    if (valor <= L) return D_MIN
    return Math.pow((valor - L) / (U - L), s)
  }

  // nominal_melhor — bilateral
  const target = T ?? (L + U) / 2
  if (valor < L || valor > U) return D_MIN
  if (valor <= target) {
    if (Math.abs(target - L) < 1e-12) return 1
    return Math.pow((valor - L) / (target - L), s)
  }
  if (Math.abs(U - target) < 1e-12) return 1
  return Math.pow((U - valor) / (U - target), s)
}

/**
 * Calcula desejabilidade global ponderada (Dw).
 *
 * Dw = (∏ di^wi)^(1/Σwi)
 *
 * Se qualquer di = 0, Dw = 0 (produto geometrico ponderado).
 *
 * @param desejabilidades - Array de { d, peso }
 * @returns Dw entre 0 e 1
 */
export function calcDesejabilidadeGlobal(
  desejabilidades: Array<{ d: number; peso: number }>
): number {
  if (desejabilidades.length === 0) return 0

  const somaW = desejabilidades.reduce((s, item) => s + item.peso, 0)
  if (somaW <= 0) return 0

  // Se algum d <= 0, usar epsilon minimo em vez de colapsar
  // (Harrington 1965: desejabilidade nunca exatamente 0)
  if (desejabilidades.some(item => item.d <= 0)) {
    const safe = desejabilidades.map(item => ({
      d: Math.max(0.001, item.d),
      peso: item.peso,
    }))
    const sL = safe.reduce((s, i) => s + i.peso * Math.log(i.d), 0)
    return Math.exp(sL / somaW)
  }

  // ln(Dw) = (1/Σw) × Σ(wi × ln(di))
  const somaLogPonderada = desejabilidades.reduce(
    (s, item) => s + item.peso * Math.log(item.d),
    0
  )

  return Math.exp(somaLogPonderada / somaW)
}
