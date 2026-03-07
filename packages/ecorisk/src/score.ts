// ECORISK(R) — Score Dw (Desejabilidade Global Ponderada)
//
// Combina 6 eco-indicadores + 7 dominios de risco em um unico score 0-1.
// Dw proximo de 1 = formulacao ideal (sustentavel + baixo risco).
// Dw proximo de 0 = formulacao inaceitavel.
//
// Ref: Derringer, G. & Suich, R. (1980). J. Quality Technology, 12(4), 214-219.

import { calcDesejabilidade, calcDesejabilidadeGlobal } from "./desejabilidade"
import type { DesejabilidadeConfig, EcoIndicadores, DominiosRisco, ScoreDetalhe } from "./types"

export interface EntradaEcorisk {
  eco: EcoIndicadores
  risco: DominiosRisco
  /** Override dos configs default (opcional) */
  configOverrides?: Partial<Record<string, DesejabilidadeConfig>>
}

export interface ResultadoEcorisk {
  /** Score global Dw — 0 a 1 */
  dw: number
  /** Score parcial eco — 0 a 1 */
  dwEco: number
  /** Score parcial risco — 0 a 1 */
  dwRisco: number
  /** Classificacao qualitativa */
  classificacao: "A" | "B" | "C" | "D" | "E"
  /** Detalhes por indicador */
  detalhes: ScoreDetalhe[]
}

// ── Configs default dos eco-indicadores ─────────────────────────
// Baseados em faixas tipicas de concretos brasileiros (CCV 25-40 MPa)

const ECO_CONFIGS: Record<keyof EcoIndicadores, DesejabilidadeConfig> = {
  co2KgM3: {
    tipo: "menor_melhor",
    limiteInf: 150,    // concreto com alta substituicao
    limiteSup: 450,    // concreto alto consumo CP V
    expoente: 1,
    peso: 0.25,
  },
  energiaMjM3: {
    tipo: "menor_melhor",
    limiteInf: 800,
    limiteSup: 2500,
    expoente: 1,
    peso: 0.15,
  },
  clinquerKgM3: {
    tipo: "menor_melhor",
    limiteInf: 100,
    limiteSup: 400,
    expoente: 1,
    peso: 0.20,
  },
  binderIndex: {
    tipo: "menor_melhor",
    limiteInf: 5,      // 5 kg/MPa = excelente
    limiteSup: 15,     // 15 kg/MPa = ineficiente
    expoente: 1,
    peso: 0.20,
  },
  aguaLM3: {
    tipo: "menor_melhor",
    limiteInf: 140,
    limiteSup: 220,
    expoente: 1,
    peso: 0.10,
  },
  pctSubproduto: {
    tipo: "maior_melhor",
    limiteInf: 0,
    limiteSup: 60,     // 60% substituicao = excelente
    expoente: 1,
    peso: 0.10,
  },
}

// ── Configs default dos dominios de risco ────────────────────────
// Todos sao "menor_melhor" (risco 0 = ideal, risco 1 = critico)

const RISCO_CONFIGS: Record<keyof DominiosRisco, DesejabilidadeConfig> = {
  resistencia: {
    tipo: "menor_melhor", limiteInf: 0, limiteSup: 1, expoente: 1.5, peso: 0.25,
  },
  durabilidade: {
    tipo: "menor_melhor", limiteInf: 0, limiteSup: 1, expoente: 1.5, peso: 0.20,
  },
  reologia: {
    tipo: "menor_melhor", limiteInf: 0, limiteSup: 1, expoente: 1, peso: 0.10,
  },
  retracao: {
    tipo: "menor_melhor", limiteInf: 0, limiteSup: 1, expoente: 1.2, peso: 0.15,
  },
  termico: {
    tipo: "menor_melhor", limiteInf: 0, limiteSup: 1, expoente: 1, peso: 0.10,
  },
  compatibilidade: {
    tipo: "menor_melhor", limiteInf: 0, limiteSup: 1, expoente: 1, peso: 0.10,
  },
  variabilidade: {
    tipo: "menor_melhor", limiteInf: 0, limiteSup: 1, expoente: 1, peso: 0.10,
  },
}

/**
 * Calcula o Score ECORISK(R) completo.
 *
 * Dw = (∏ di^wi)^(1/Σwi) — media geometrica ponderada
 * de todos os 13 indicadores (6 eco + 7 risco).
 */
export function calcEcoriskScore(entrada: EntradaEcorisk): ResultadoEcorisk {
  const overrides = entrada.configOverrides ?? {}
  const detalhes: ScoreDetalhe[] = []

  // Eco-indicadores
  const ecoEntries = Object.entries(entrada.eco) as [keyof EcoIndicadores, number][]
  for (const [chave, valor] of ecoEntries) {
    const config = overrides[chave] ?? ECO_CONFIGS[chave]
    const d = calcDesejabilidade(valor, config)
    detalhes.push({ nome: `eco.${chave}`, valor, desejabilidade: d, peso: config.peso, config })
  }

  // Dominios de risco
  const riscoEntries = Object.entries(entrada.risco) as [keyof DominiosRisco, number][]
  for (const [chave, valor] of riscoEntries) {
    const config = overrides[chave] ?? RISCO_CONFIGS[chave]
    const d = calcDesejabilidade(valor, config)
    detalhes.push({ nome: `risco.${chave}`, valor, desejabilidade: d, peso: config.peso, config })
  }

  // Score parcial eco
  const ecoItems = detalhes.filter(d => d.nome.startsWith("eco."))
  const dwEco = calcDesejabilidadeGlobal(ecoItems.map(d => ({ d: d.desejabilidade, peso: d.peso })))

  // Score parcial risco
  const riscoItems = detalhes.filter(d => d.nome.startsWith("risco."))
  const dwRisco = calcDesejabilidadeGlobal(riscoItems.map(d => ({ d: d.desejabilidade, peso: d.peso })))

  // Score global
  const dw = calcDesejabilidadeGlobal(detalhes.map(d => ({ d: d.desejabilidade, peso: d.peso })))

  // Classificacao: A >= 0.80, B >= 0.60, C >= 0.40, D >= 0.20, E < 0.20
  let classificacao: "A" | "B" | "C" | "D" | "E"
  if (dw >= 0.80) classificacao = "A"
  else if (dw >= 0.60) classificacao = "B"
  else if (dw >= 0.40) classificacao = "C"
  else if (dw >= 0.20) classificacao = "D"
  else classificacao = "E"

  return {
    dw: round4(dw),
    dwEco: round4(dwEco),
    dwRisco: round4(dwRisco),
    classificacao,
    detalhes,
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000
}
