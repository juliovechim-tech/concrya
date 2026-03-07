// ECORISK(R) — Tipos do framework

/**
 * Tipo de otimizacao para funcao desejabilidade:
 * - "menor_melhor": d = ((U - y) / (U - L))^s  para L <= y <= U
 * - "maior_melhor": d = ((y - L) / (U - L))^s  para L <= y <= U
 * - "nominal_melhor": bilateral com alvo T
 */
export type TipoOtimizacao = "menor_melhor" | "maior_melhor" | "nominal_melhor"

/** Configuracao de um indicador para funcao desejabilidade */
export interface DesejabilidadeConfig {
  /** Limite inferior (L) */
  limiteInf: number
  /** Limite superior (U) */
  limiteSup: number
  /** Alvo (T) — obrigatorio para nominal_melhor */
  alvo?: number
  /** Expoente de forma (s ou t). s=1 linear, s>1 penaliza, s<1 tolerante */
  expoente: number
  /** Tipo de otimizacao */
  tipo: TipoOtimizacao
  /** Peso relativo wi (0 a 1) */
  peso: number
}

// ── 6 Eco-indicadores ───────────────────────────────────────────

export interface EcoIndicadores {
  /** E1: CO2 equivalente — kg CO2/m3 */
  co2KgM3: number
  /** E2: Energia incorporada — MJ/m3 */
  energiaMjM3: number
  /** E3: Consumo de clinquer — kg/m3 */
  clinquerKgM3: number
  /** E4: Indice de Binder — kg cimento / MPa */
  binderIndex: number
  /** E5: Agua total — L/m3 */
  aguaLM3: number
  /** E6: % de residuos/subprodutos no ligante (pozolana, escoria, cinza) */
  pctSubproduto: number
}

// ── 7 Dominios de Risco ─────────────────────────────────────────

export interface DominiosRisco {
  /** R1: Resistencia mecanica — risco de nao atingir fck */
  resistencia: number
  /** R2: Durabilidade — carbonatacao + cloretos */
  durabilidade: number
  /** R3: Reologia — risco de perda de trabalhabilidade */
  reologia: number
  /** R4: Retracao — risco de fissurar (µε) */
  retracao: number
  /** R5: Termico — risco de DEF ou fissuramento termico */
  termico: number
  /** R6: Compatibilidade quimica — cimento × aditivo × adicao */
  compatibilidade: number
  /** R7: Variabilidade de materiais — CV dos agregados/cimento */
  variabilidade: number
}

/** Detalhe de um indicador no resultado */
export interface ScoreDetalhe {
  nome: string
  valor: number
  desejabilidade: number
  peso: number
  config: DesejabilidadeConfig
}
