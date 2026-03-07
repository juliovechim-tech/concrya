// NIVELIX CORE — Desempenho Acustico
//
// Calcula isolamento acustico de sistemas laje + contrapiso autonivelante,
// com ou sem manta acustica resiliente (piso flutuante).
//
// Lei da massa (ruido aereo, ISO 717-1):
//   Rw ≈ 20 × log10(m_s × f) - 47.2
//   Simplificado para 500 Hz: Rw ≈ 20 × log10(m_s) + 7
//   Onde m_s = massa superficial total (kg/m2)
//
// Ruido de impacto padrao (laje nua, EN ISO 717-2):
//   Lnw_nua ≈ 164 - 35 × log10(m_s)
//   Ref: Cremer, L. & Heckl, M. (1988). Structure-Borne Sound.
//
// Reducao por piso flutuante (manta resiliente):
//   f0 = (1/2pi) × sqrt(s' / m_s_contrapiso)
//   DeltaLw ≈ 30 × log10(f/f0) para f > f0
//   DeltaLw medio (500Hz ref) ≈ 30 × log10(500/f0)
//   Onde s' = rigidez dinamica da manta (MN/m3 = N/m3 × 10^6)
//
// Ref: NBR 15575-3:2021 — Desempenho de edificacoes — Pisos.
//      EN ISO 717-2: Avaliacao do isolamento acustico — Ruido de impacto.
//      Cremer, L. & Heckl, M. (1988). Structure-Borne Sound.
//      Hopkins, C. (2007). Sound Insulation, Butterworth-Heinemann.

import type { ParamsAcustica, ResultadoAcustica } from "./types"

/**
 * Calcula desempenho acustico do sistema laje + contrapiso.
 */
export function calcAcustica(params: ParamsAcustica): ResultadoAcustica {
  const {
    espessuraContrapisoMm,
    rhoContrapisoKgM3,
    espessuraLajeMm,
    rhoLajeKgM3 = 2400,
    comMantaAcustica,
    rigidezMantaMNm3,
    espessuraMantaMm,
  } = params

  // Massa superficial
  const msLaje = (espessuraLajeMm / 1000) * rhoLajeKgM3         // kg/m2
  const msContrapiso = (espessuraContrapisoMm / 1000) * rhoContrapisoKgM3
  const massaSuperficialKgM2 = msLaje + msContrapiso

  // Rw — isolamento aereo (lei da massa simplificada, ref 500 Hz)
  const rwEstimadoDb = Math.round(20 * Math.log10(massaSuperficialKgM2) + 7)

  // Lnw — ruido de impacto (laje nua, Cremer-Heckl)
  const lnwSemMantaDb = Math.round(164 - 35 * Math.log10(massaSuperficialKgM2))

  // Reducao por piso flutuante
  let deltaLwDb = 0
  let lnwCorrigidoDb: number | null = null

  if (comMantaAcustica && rigidezMantaMNm3 && rigidezMantaMNm3 > 0) {
    // Frequencia de ressonancia do piso flutuante
    // s' em MN/m3 = rigidez por unidade de area
    // Se espessuraMantaMm fornecida, s'_efetivo = rigidezMantaMNm3 / (espessuraMantaMm/1000)
    // Mas normalmente s' ja vem por m3, entao usamos direto
    const sPrime = rigidezMantaMNm3 * 1e6  // converter MN/m3 para N/m3
    const msFlut = msContrapiso  // massa do piso flutuante (contrapiso)

    // f0 = (1/2pi) × sqrt(s' / m_flutuante)
    const f0 = (1 / (2 * Math.PI)) * Math.sqrt(sPrime / msFlut)

    // DeltaLw medio a 500 Hz
    if (f0 > 0 && f0 < 500) {
      deltaLwDb = Math.round(30 * Math.log10(500 / f0))
      lnwCorrigidoDb = lnwSemMantaDb - deltaLwDb
    }
  }

  // Classificacao NBR 15575-3:2021
  // Sistema de pisos entre unidades autonomas:
  //   M (minimo): Lnw <= 55 dB
  //   I (intermediario): Lnw <= 50 dB
  //   S (superior): Lnw <= 45 dB
  const lnwFinal = lnwCorrigidoDb ?? lnwSemMantaDb
  const atendeNbr15575 = lnwFinal <= 55

  let classeDesempenho: ResultadoAcustica["classeDesempenho"]
  if (lnwFinal <= 45) classeDesempenho = "S"
  else if (lnwFinal <= 50) classeDesempenho = "I"
  else if (lnwFinal <= 55) classeDesempenho = "M"
  else classeDesempenho = "nao_atende"

  // Diagnostico
  let diagnostico = `Massa superficial: ${massaSuperficialKgM2.toFixed(0)} kg/m2. Rw estimado: ${rwEstimadoDb} dB.`

  if (comMantaAcustica && lnwCorrigidoDb !== null) {
    diagnostico += ` Piso flutuante: DeltaLw=${deltaLwDb} dB, Lnw corrigido=${lnwCorrigidoDb} dB.`
  } else {
    diagnostico += ` Lnw sem manta: ${lnwSemMantaDb} dB.`
  }

  if (classeDesempenho === "nao_atende") {
    diagnostico += ` NAO atende NBR 15575 (Lnw > 55 dB). Considerar manta acustica ou aumentar espessura.`
  } else {
    diagnostico += ` Atende NBR 15575 classe ${classeDesempenho} (Lnw=${lnwFinal} dB).`
  }

  if (comMantaAcustica && espessuraMantaMm) {
    diagnostico += ` Manta: ${espessuraMantaMm}mm, s'=${rigidezMantaMNm3} MN/m3.`
  }

  return {
    massaSuperficialKgM2: Math.round(massaSuperficialKgM2 * 10) / 10,
    rwEstimadoDb,
    lnwSemMantaDb,
    deltaLwDb,
    lnwCorrigidoDb,
    atendeNbr15575,
    classeDesempenho,
    diagnostico,
  }
}
