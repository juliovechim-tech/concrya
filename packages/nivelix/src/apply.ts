// NIVELIX CORE — Apply para ConcretePacket
//
// Recebe um ConcretePacket, estima reologia (espalhamento, viscosidade,
// tensao de escoamento) e retorna o packet com secao `nivelix` preenchida.
//
// Para argamassas autonivelantes, usa correlacoes de Roussel (2005).
// Para concretos convencionais, estima tau0 a partir do slump (Roussel 2006).

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
 * Estima viscosidade plastica a partir de a/c e consumo de cimento.
 * Correlacao empirica simplificada (Wallevik, 2003).
 * mu_p ≈ 8 + 120 * (0.55 - a/c) para a/c entre 0.30-0.60
 */
function estimarViscosidade(ac: number): number {
  const mu = 8 + 120 * Math.max(0, 0.55 - ac)
  return Math.round(Math.max(2, Math.min(80, mu)) * 10) / 10
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
  const espalhamento = estimarEspalhamento(tau0, rho)
  const classe = classificarEspalhamento(espalhamento)

  // Modulo acustico: so faz sentido para argamassa de contrapiso
  // Estimativa simplificada: deltaLw ≈ 20*log10(massa_superficial/100)
  // Assume camada de 30mm como referencia
  let moduloAcustico: number | undefined
  if (isArgamassa) {
    const massaSup = (30 / 1000) * rho  // 30mm de espessura
    moduloAcustico = Math.round(20 * Math.log10(massaSup / 100))
  }

  // Status
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
      tensaoEscoamento: Math.round(tau0 * 10) / 10,
      moduloAcustico,
      status,
    },
  }
}
