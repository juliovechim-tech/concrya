// @concrya/ecorisk — ECORISK(R) Framework
// Desejabilidade Global Ponderada (Derringer & Suich, 1980)
// 6 eco-indicadores + 7 dominios de risco -> Score Dw
//
// Ref: Derringer, G. & Suich, R. (1980). J. Quality Technology, 12(4), 214-219.
// Ref: Harrington, E.C. (1965). Industrial Quality Control, 21(10), 494-498.
// Adaptacao: Vechim, J. (2025). ECORISK(R) — CONCRYA Technologies.

export { calcDesejabilidade, calcDesejabilidadeGlobal } from "./desejabilidade"
export { calcEcoIndicadores } from "./eco"
export { calcDominiosRisco } from "./risco"
export { calcEcoriskScore, type EntradaEcorisk, type ResultadoEcorisk } from "./score"
export type {
  DesejabilidadeConfig,
  TipoOtimizacao,
  EcoIndicadores,
  DominiosRisco,
  ScoreDetalhe,
} from "./types"
