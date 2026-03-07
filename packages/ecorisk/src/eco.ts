// ECORISK(R) — 6 Eco-indicadores
//
// E1: CO2 equivalente (kg CO2/m3)
//     CO2 = consumo_cimento × fator_co2_cimento + transporte + agregados
//     Ref: WBCSD/CSI (2018). CO2 and Energy Accounting Protocol.
//     Fator medio clinquer Portland: 0.83 kg CO2/kg clinquer (GCCA 2022)
//
// E2: Energia incorporada (MJ/m3)
//     Ref: Hammond, G. & Jones, C. (2011). ICE Database v3.0, University of Bath.
//
// E3: Consumo de clinquer (kg/m3)
//     clinquer = cimento × (1 - % adicoes no cimento)
//
// E4: Binder Index (kg cimento / MPa)
//     BI = consumo_cimento / fck28
//     Ref: Damineli, B.L. et al. (2010). Cem. Concr. Composites, 32(8), 555-562.
//
// E5: Agua total (L/m3)
//
// E6: % subprodutos no ligante

import type { EcoIndicadores } from "./types"

/** Fatores de emissao de CO2 — kg CO2 / kg material */
export const FATOR_CO2 = {
  clinquer: 0.83,
  cimento_cpv: 0.80,
  cimento_cpii: 0.60,
  cimento_cpiii: 0.35,
  cimento_cpiv: 0.45,
  escoria: 0.02,
  cinza_volante: 0.01,
  metacaulim: 0.15,
  silica_ativa: 0.03,
  filler: 0.01,
  agregado: 0.005,
  agua: 0.0003,
  aditivo_sp: 0.50,
} as const

/** Fatores de energia incorporada — MJ / kg material */
export const FATOR_ENERGIA = {
  cimento: 4.6,
  escoria: 0.8,
  cinza_volante: 0.1,
  metacaulim: 2.5,
  silica_ativa: 0.1,
  filler: 0.3,
  agregado: 0.08,
  agua: 0.005,
  aditivo_sp: 12.0,
} as const

export interface EntradaEco {
  /** Consumo de cimento — kg/m3 */
  cimentoKgM3: number
  /** Tipo de cimento para fator CO2 */
  tipoCimento: "cpv" | "cpii" | "cpiii" | "cpiv"
  /** Consumo de adicoes — kg/m3 (escoria, cinza, metacaulim, filler, silica) */
  adicoesKgM3?: Partial<Record<"escoria" | "cinza_volante" | "metacaulim" | "silica_ativa" | "filler", number>>
  /** Consumo de agregados total — kg/m3 */
  agregadosKgM3: number
  /** Agua total — L/m3 */
  aguaLM3: number
  /** Consumo de aditivo SP — kg/m3 */
  aditivoSpKgM3?: number
  /** fck28 — MPa (para Binder Index) */
  fck28: number
  /** % clinquer no cimento (default depende do tipo) */
  pctClinquer?: number
}

/** Porcentagem default de clinquer por tipo de cimento */
const PCT_CLINQUER_DEFAULT: Record<string, number> = {
  cpv: 0.95,
  cpii: 0.75,
  cpiii: 0.40,
  cpiv: 0.55,
}

/**
 * Calcula os 6 eco-indicadores ECORISK.
 */
export function calcEcoIndicadores(entrada: EntradaEco): EcoIndicadores {
  const { cimentoKgM3, tipoCimento, agregadosKgM3, aguaLM3, fck28 } = entrada
  const adicoes = entrada.adicoesKgM3 ?? {}
  const aditivoSp = entrada.aditivoSpKgM3 ?? 0
  const pctClinquer = entrada.pctClinquer ?? (PCT_CLINQUER_DEFAULT[tipoCimento] ?? 0.80)

  // E1: CO2
  const fatorCO2Cimento = FATOR_CO2[`cimento_${tipoCimento}` as keyof typeof FATOR_CO2] ?? 0.60
  let co2 = cimentoKgM3 * fatorCO2Cimento
  co2 += agregadosKgM3 * FATOR_CO2.agregado
  co2 += aguaLM3 * FATOR_CO2.agua
  co2 += aditivoSp * FATOR_CO2.aditivo_sp
  for (const [tipo, kg] of Object.entries(adicoes)) {
    const fator = FATOR_CO2[tipo as keyof typeof FATOR_CO2] ?? 0.01
    co2 += (kg ?? 0) * fator
  }

  // E2: Energia incorporada
  let energia = cimentoKgM3 * FATOR_ENERGIA.cimento
  energia += agregadosKgM3 * FATOR_ENERGIA.agregado
  energia += aguaLM3 * FATOR_ENERGIA.agua
  energia += aditivoSp * FATOR_ENERGIA.aditivo_sp
  for (const [tipo, kg] of Object.entries(adicoes)) {
    const fator = FATOR_ENERGIA[tipo as keyof typeof FATOR_ENERGIA] ?? 0.1
    energia += (kg ?? 0) * fator
  }

  // E3: Consumo de clinquer
  const clinquerKgM3 = cimentoKgM3 * pctClinquer

  // E4: Binder Index
  const binderIndex = fck28 > 0 ? cimentoKgM3 / fck28 : 0

  // E5: Agua
  const aguaTotal = aguaLM3

  // E6: % subprodutos
  const totalAdicoes = Object.values(adicoes).reduce((s, v) => s + (v ?? 0), 0)
  const totalLigante = cimentoKgM3 + totalAdicoes
  const pctSubproduto = totalLigante > 0 ? (totalAdicoes / totalLigante) * 100 : 0

  return {
    co2KgM3: round(co2, 1),
    energiaMjM3: round(energia, 0),
    clinquerKgM3: round(clinquerKgM3, 1),
    binderIndex: round(binderIndex, 2),
    aguaLM3: round(aguaTotal, 1),
    pctSubproduto: round(pctSubproduto, 1),
  }
}

function round(v: number, n: number): number {
  const f = 10 ** n
  return Math.round(v * f) / f
}
