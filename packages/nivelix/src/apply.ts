// NIVELIX CORE — Apply para ConcretePacket
//
// Recebe um ConcretePacket, estima reologia (espalhamento, viscosidade,
// tensao de escoamento) e retorna o packet com secao `nivelix` preenchida.
//
// Para argamassas autonivelantes, usa modelo de Roussel (2005) com mini-cone.
// Para concretos convencionais (CCV), estima tau0 a partir do slump (Roussel 2006)
// e espalhamento via modelo de Roussel & Coussot (2005) com cone de Abrams.
// Para CAA (slump >= 550mm), usa modelo de flow direto.
//
// Ref: Roussel, N. (2006). Cem. Concr. Res. 36(10), 1797-1806.
//      Roussel, N. & Coussot, P. (2005). J. Rheol. 49(3), 705-718.
//      Wallevik, O.H. (2003). Rheology as a tool in concrete science.

import type { ConcretePacket } from "@concrya/schemas"
import { estimarEspalhamento, estimarTau0DeEspalhamento, classificarEspalhamento } from "./reologia"

/** Densidade tipica de argamassa autonivelante — kg/m3 */
const RHO_ARGAMASSA = 2100

/** Densidade tipica de concreto fresco — kg/m3 */
const RHO_CONCRETO = 2400

/**
 * Estima tau0 a partir do slump do concreto (Roussel, 2006).
 * tau0 ≈ (300 - slump_mm) / 0.27  para CCV
 */
function tau0FromSlump(slumpMm: number): number {
  if (slumpMm >= 300) return 5  // ultra-fluido
  return Math.max(1, (300 - slumpMm) / 0.27)
}

/**
 * Estima viscosidade plastica a partir de a/c (Wallevik, 2003).
 * mu_p ≈ 8 + 120 * (0.55 - a/c) para a/c entre 0.30-0.60
 */
function estimarViscosidade(ac: number): number {
  const mu = 8 + 120 * Math.max(0, 0.55 - ac)
  return Math.round(Math.max(2, Math.min(80, mu)) * 10) / 10
}

/**
 * Para concreto (com brita), o espalhamento e derivado do slump.
 * CCV: espalhamento ≈ slump + 80mm (correlacao empirica, Tattersall 1991)
 * CAA: espalhamento = slump direto (ja e slump flow)
 *
 * Ref: Tattersall, G.H. & Banfill, P.F.G. (1983). Rheology of Fresh Concrete.
 */
function espalhamentoFromSlump(slumpMm: number): number {
  if (slumpMm >= 500) return slumpMm  // CAA: slump = slump flow direto
  // CCV: correlacao empirica — espalhamento ≈ slump (mm)
  // O "espalhamento" para CCV nao e de flow test,
  // mas sim o slump como indicador de trabalhabilidade
  return slumpMm
}

/**
 * Aplica o motor NIVELIX ao ConcretePacket.
 * Estima parametros reologicos a partir dos dados do mix.
 * Retorna novo packet com secao `nivelix` preenchida.
 */
export function applyNivelix(packet: ConcretePacket): ConcretePacket {
  const { mix } = packet

  // Estimar tau0 e viscosidade a partir do slump
  const tau0 = tau0FromSlump(mix.slump)
  const mu = estimarViscosidade(mix.ac)

  // Decidir se e argamassa ou concreto pela presenca de brita
  const isArgamassa = mix.consumoBrita < 50
  const rho = isArgamassa ? RHO_ARGAMASSA : RHO_CONCRETO

  // Espalhamento estimado
  let espalhamento: number
  let tau0Final: number
  if (isArgamassa) {
    // Argamassa autonivelante: o campo slump do packet ja pode representar
    // o espalhamento do mini-cone (EN 12706), nao o slump Abrams.
    // Se slump >= 140mm, interpretar como espalhamento direto e calcular tau0 reverso.
    // Abaixo de 140mm, usar tau0FromSlump como fallback.
    if (mix.slump >= 140) {
      // Slump = espalhamento medido com mini-cone
      espalhamento = mix.slump
      tau0Final = estimarTau0DeEspalhamento(mix.slump, rho)
    } else {
      tau0Final = tau0FromSlump(mix.slump)
      espalhamento = estimarEspalhamento(tau0Final, rho)
    }
  } else {
    // Concreto: usar slump como indicador direto de trabalhabilidade
    tau0Final = tau0
    espalhamento = espalhamentoFromSlump(mix.slump)
  }
  const classe = classificarEspalhamento(espalhamento)

  // Modulo acustico: so faz sentido para argamassa de contrapiso
  // Estimativa simplificada: deltaLw ≈ 20*log10(massa_superficial/100)
  // Assume camada de 30mm como referencia
  let moduloAcustico: number | undefined
  if (isArgamassa) {
    const massaSup = (30 / 1000) * rho  // 30mm de espessura — kg/m2
    moduloAcustico = Math.round(20 * Math.log10(massaSup / 100))
  }

  // Status baseado na classe de espalhamento
  let status: "OK" | "RISCO" | "CRITICO"
  if (classe === "F3" || classe === "F4") {
    status = "OK"
  } else if (classe === "F2") {
    status = "RISCO"
  } else {
    status = "CRITICO"
  }

  return {
    ...packet,
    nivelix: {
      espalhamento,
      viscosidadePlastica: mu,
      tensaoEscoamento: Math.round(tau0Final * 10) / 10,
      moduloAcustico,
      status,
    },
  }
}
