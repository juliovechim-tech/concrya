// @concrya/compensa — COMPENSA CORE
// Motor de dosagem para Concreto de Retracao Compensada (CRC)
// Parceria: Chimica Edile (IT/US/BR/AR) + LIVELLARE
//
// Fundamentacao:
//   ACI 223R-10: Guide for the Use of Shrinkage-Compensating Concrete
//   ASTM C845: Standard Specification for Expansive Hydraulic Cement
//   Klein, A. (1966). U.S. Patent 3,251,701 — Expansive cement
//   Mehta, P.K. (1973). Mechanism of expansion associated with ettringite formation
//   Collepardi, M. (2006). The New Concrete, Tintoretto
//
// Principio: o agente expansivo (AE) gera etringita primaria controlada
// durante as primeiras 1-7 dias, compensando a retracao por secagem.
// Balanco: expansao_restringida >= retracao_total → ε_net <= 0

export { calcExpansao, AGENTES_EXPANSIVOS } from "./expansao"
export { calcRetracao } from "./retracao"
export { calcBalancoCRC, type EntradaCRC, type ResultadoCRC } from "./balanco"
export type { AgenteExpansivo, TipoAE, ParamsExpansao, ParamsRetracao } from "./types"
