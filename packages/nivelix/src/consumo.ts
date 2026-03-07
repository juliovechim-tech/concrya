// NIVELIX CORE — Calculo de Consumo por m2
//
// Calcula consumo de argamassa autonivelante para uma area dada,
// considerando espessura, irregularidade do substrato e perdas.
//
// Consumo = area * espessura_efetiva * massa_unitaria * (1 + perda)
//
// Espessura efetiva = espessura_nominal + irregularidade_media
//
// Ref: Chimica Edile — Manual tecnico de argamassas autonivelantes.
//      NBR 14827: Pisos — Argamassa para regularizacao (preparo e aplicacao).

import type { ParamsConsumo, ResultadoConsumo } from "./types"

/**
 * Calcula consumo de argamassa autonivelante.
 */
export function calcConsumo(params: ParamsConsumo): ResultadoConsumo {
  const {
    espessuraMm,
    massaUnitariaKgM3,
    areaM2,
    perdaPct = 5,
    irregularidadeMm = 0,
  } = params

  const espessuraEfetivaMm = espessuraMm + irregularidadeMm
  const espessuraM = espessuraEfetivaMm / 1000
  const fatorPerda = 1 + perdaPct / 100

  // Volume total
  const volumeTotalM3 = areaM2 * espessuraM * fatorPerda
  const volumeTotalL = volumeTotalM3 * 1000

  // Massa total
  const massaTotalKg = volumeTotalM3 * massaUnitariaKgM3

  // Consumo por m2
  const consumoKgM2 = massaTotalKg / areaM2
  const consumoLM2 = volumeTotalL / areaM2

  // Sacos
  const sacos25kg = Math.ceil(massaTotalKg / 25)
  const sacos50kg = Math.ceil(massaTotalKg / 50)

  return {
    espessuraEfetivaMm: Math.round(espessuraEfetivaMm * 10) / 10,
    volumeTotalL: Math.round(volumeTotalL * 10) / 10,
    massaTotalKg: Math.round(massaTotalKg * 10) / 10,
    consumoKgM2: Math.round(consumoKgM2 * 100) / 100,
    consumoLM2: Math.round(consumoLM2 * 100) / 100,
    sacos25kg,
    sacos50kg,
  }
}
