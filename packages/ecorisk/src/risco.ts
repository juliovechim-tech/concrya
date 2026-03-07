// ECORISK(R) — 7 Dominios de Risco
//
// Cada dominio retorna um score normalizado 0-1:
//   0 = risco minimo (situacao ideal)
//   1 = risco maximo (situacao critica)
//
// A conversao em desejabilidade e feita na camada score.ts,
// onde risco alto = desejabilidade baixa (menor_melhor).

import type { DominiosRisco } from "./types"

export interface EntradaRisco {
  /** a/c adotado */
  ac: number
  /** fck alvo — MPa */
  fckAlvo: number
  /** fck previsto — MPa */
  fckPrevisto: number
  /** Consumo de cimento — kg/m3 */
  cimentoKgM3: number
  /** Classe de agressividade ambiental (I-IV) */
  classeAgressividade: "I" | "II" | "III" | "IV"
  /** Slump ou flow — mm */
  slumpMm?: number
  /** Retracao prevista — µε (microdeformacao) */
  retracaoUe?: number
  /** Temperatura maxima prevista no nucleo — °C */
  tempMaxC?: number
  /** Espessura da peca — m */
  espessuraM?: number
  /** C3A do cimento — % (risco de compatibilidade) */
  c3aPct?: number
  /** Dosagem de aditivo SP — % sobre cimento */
  dosSpPct?: number
  /** Coeficiente de variacao do fck — % (variabilidade) */
  cvFckPct?: number
  /** Coeficiente de variacao do MF areia — % */
  cvMfPct?: number
}

/** a/c maximo por classe — NBR 6118:2023 */
const AC_MAX: Record<string, number> = { I: 0.65, II: 0.60, III: 0.55, IV: 0.45 }

/**
 * Calcula os 7 dominios de risco normalizados (0-1).
 */
export function calcDominiosRisco(e: EntradaRisco): DominiosRisco {
  return {
    resistencia: calcR1Resistencia(e),
    durabilidade: calcR2Durabilidade(e),
    reologia: calcR3Reologia(e),
    retracao: calcR4Retracao(e),
    termico: calcR5Termico(e),
    compatibilidade: calcR6Compatibilidade(e),
    variabilidade: calcR7Variabilidade(e),
  }
}

/** R1: Risco de resistencia — margem fck previsto vs alvo */
function calcR1Resistencia(e: EntradaRisco): number {
  if (e.fckAlvo <= 0) return 0
  const margem = (e.fckPrevisto - e.fckAlvo) / e.fckAlvo
  // margem >= 0.20 (20% acima) = risco 0
  // margem <= -0.05 (5% abaixo) = risco 1
  return clamp01(1 - (margem + 0.05) / 0.25)
}

/** R2: Risco de durabilidade — a/c vs limite NBR 6118 */
function calcR2Durabilidade(e: EntradaRisco): number {
  const acMax = AC_MAX[e.classeAgressividade] ?? 0.65
  if (e.ac <= acMax * 0.85) return 0     // folga >= 15%
  if (e.ac >= acMax * 1.10) return 1     // ultrapassou 10%
  return clamp01((e.ac - acMax * 0.85) / (acMax * 0.25))
}

/** R3: Risco reologico — base no slump */
function calcR3Reologia(e: EntradaRisco): number {
  if (e.slumpMm === undefined) return 0.5  // sem dado = incerteza media
  // CCV: slump < 80 = risco alto (dificil de adensar)
  // CCV: slump > 200 = risco de segregacao
  // CAA: flow < 550 = insuficiente, flow > 800 = risco segregacao
  if (e.slumpMm < 80) return clamp01((80 - e.slumpMm) / 80)
  if (e.slumpMm > 800) return clamp01((e.slumpMm - 800) / 200)
  if (e.slumpMm > 200 && e.slumpMm < 550) return 0  // zona ok
  return 0
}

/** R4: Risco de retracao — limite 400 µε (NBR 15530 pisos) */
function calcR4Retracao(e: EntradaRisco): number {
  if (e.retracaoUe === undefined) return 0.3  // sem dado
  // < 300 µε = risco 0, > 600 µε = risco 1
  return clamp01((e.retracaoUe - 300) / 300)
}

/** R5: Risco termico — limite ACI 207 + NBR 6118 */
function calcR5Termico(e: EntradaRisco): number {
  if (e.tempMaxC === undefined || e.espessuraM === undefined) {
    // Estimativa grosseira por consumo de cimento + espessura
    if (e.cimentoKgM3 > 350 && (e.espessuraM ?? 0) > 0.8) return 0.6
    return 0.2
  }
  // T max > 70°C = risco alto (NBR 6118)
  // T max > 65°C com espessura > 1m = risco medio
  let risco = 0
  if (e.tempMaxC > 70) risco = clamp01((e.tempMaxC - 70) / 15)
  else if (e.tempMaxC > 60) risco = clamp01((e.tempMaxC - 60) / 20)
  return risco
}

/** R6: Risco de compatibilidade quimica — C3A vs SP */
function calcR6Compatibilidade(e: EntradaRisco): number {
  if (e.c3aPct === undefined || e.dosSpPct === undefined) return 0.2
  // C3A > 8% com SP PCE > 1.0% = risco medio-alto
  // C3A > 10% = risco alto independente
  let risco = 0
  if (e.c3aPct > 10) risco = 0.8
  else if (e.c3aPct > 8 && e.dosSpPct > 1.0) risco = 0.5
  else if (e.c3aPct > 7 && e.dosSpPct > 1.2) risco = 0.4
  return risco
}

/** R7: Risco de variabilidade dos materiais */
function calcR7Variabilidade(e: EntradaRisco): number {
  const cvFck = e.cvFckPct ?? 10  // default 10% = controle razoavel
  const cvMf = e.cvMfPct ?? 5     // default 5%
  // CV fck: < 8% = bom, > 15% = ruim
  const riscoFck = clamp01((cvFck - 8) / 7)
  // CV MF: < 4% = bom, > 10% = ruim
  const riscoMf = clamp01((cvMf - 4) / 6)
  return 0.6 * riscoFck + 0.4 * riscoMf
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
