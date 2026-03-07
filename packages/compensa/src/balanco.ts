// COMPENSA CORE — Balanco CRC (Expansao vs Retracao)
//
// O objetivo do CRC e que a expansao restringida compense a retracao total:
//   ε_net = ε_expansao + ε_retracao  (retracao e negativa)
//
// Criterios de aceitacao (ACI 223R-10):
//   - ε_exp_7d restringida: 150-700 µε (ASTM C878)
//   - ε_net_28d: >= -200 µε (aceitavel)
//   - ε_net_28d: >= 0 µε (ideal — totalmente compensado)
//   - ε_exp_7d / |ε_ret_28d| >= 0.6 (taxa de compensacao minima)
//
// Ref: ACI 223R-10, Section 2.3.
//      ASTM C878: Standard Test Method for Restrained Expansion.

import { calcExpansao } from "./expansao"
import { calcRetracao } from "./retracao"
import type { ParamsExpansao, ParamsRetracao } from "./types"

export interface EntradaCRC {
  expansao: ParamsExpansao
  retracao: ParamsRetracao
}

export interface ResultadoCRC {
  /** Expansao restringida — µε (positivo) */
  expansaoUe: number
  /** Retracao total — µε (negativo) */
  retracaoUe: number
  /** Deformacao liquida — µε (positivo = compensado, negativo = fissurou) */
  netUe: number
  /** Taxa de compensacao — expansao / |retracao| */
  taxaCompensacao: number
  /** Atende criterio ACI 223R-10? */
  conforme: boolean
  /** Classificacao da compensacao */
  classificacao: "total" | "parcial" | "insuficiente" | "excessiva"
  /** Expansao aos 7 dias (referencia ASTM C878) — µε */
  expansao7dUe: number
  /** Diagnostico textual */
  diagnostico: string
}

/**
 * Calcula balanco completo de expansao vs retracao.
 */
export function calcBalancoCRC(entrada: EntradaCRC): ResultadoCRC {
  const expansaoUe = calcExpansao(entrada.expansao)
  const retracaoUe = calcRetracao(entrada.retracao)

  // Expansao aos 7d para referencia ASTM C878
  const expansao7dUe = calcExpansao({ ...entrada.expansao, idadeDias: 7 })

  const netUe = expansaoUe + retracaoUe  // retracao e negativa
  const absRetracao = Math.abs(retracaoUe)
  const taxaCompensacao = absRetracao > 0 ? expansaoUe / absRetracao : 0

  // Classificacao
  let classificacao: ResultadoCRC["classificacao"]
  if (taxaCompensacao > 1.5) classificacao = "excessiva"
  else if (taxaCompensacao >= 0.9) classificacao = "total"
  else if (taxaCompensacao >= 0.6) classificacao = "parcial"
  else classificacao = "insuficiente"

  // Conformidade ACI 223R-10
  const exp7dOk = expansao7dUe >= 150 && expansao7dUe <= 700
  const netOk = netUe >= -200
  const taxaOk = taxaCompensacao >= 0.6
  const conforme = exp7dOk && netOk && taxaOk

  // Diagnostico
  let diagnostico: string
  if (classificacao === "total") {
    diagnostico = `Compensacao total — taxa ${(taxaCompensacao * 100).toFixed(0)}%. Retracao liquida: ${netUe > 0 ? "+" : ""}${netUe.toFixed(0)} µε.`
  } else if (classificacao === "parcial") {
    diagnostico = `Compensacao parcial — taxa ${(taxaCompensacao * 100).toFixed(0)}%. Considerar aumentar dosagem AE ou reduzir a/c.`
  } else if (classificacao === "excessiva") {
    diagnostico = `Expansao excessiva — taxa ${(taxaCompensacao * 100).toFixed(0)}%. Risco de micro-fissuramento por expansao. Reduzir dosagem AE.`
  } else {
    diagnostico = `Compensacao insuficiente — taxa ${(taxaCompensacao * 100).toFixed(0)}%. Alto risco de fissuramento por retracao.`
  }

  if (!exp7dOk && expansao7dUe > 0) {
    diagnostico += ` Expansao 7d (${expansao7dUe.toFixed(0)} µε) fora da faixa ASTM C878 (150-700 µε).`
  }

  return {
    expansaoUe,
    retracaoUe,
    netUe: Math.round(netUe * 10) / 10,
    taxaCompensacao: Math.round(taxaCompensacao * 1000) / 1000,
    conforme,
    classificacao,
    expansao7dUe,
    diagnostico,
  }
}
