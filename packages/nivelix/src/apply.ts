// NIVELIX CORE — Apply para ConcretePacket
//
// Quando nivelixInput tipado esta presente no packet, usa modelo
// Bingham para argamassa autonivelante (sem brita, com filler/fibra/SP/ar).
// Quando ausente, faz fallback para packet.mix (retrocompativel).
//
// Modelo Bingham para argamassa:
//   tau0 = 150 * (0.5 - ac) * (1 - 2*SP/100)  — Pa
//   mu   = 0.8 + areiaFina/2000 + filler/3000  — Pa·s
//   espalhamento = 300 * exp(-tau0 / 80)        — mm
//
// Ref: Roussel, N. (2005). Cem. Concr. Res.
//      Wallevik, O.H. (2003). Rheology as a tool in concrete science.
//      EN 13813 · NBR 15823

import type { ConcretePacket, NivelixInput } from "@concrya/schemas"
import { estimarTau0DeEspalhamento, classificarEspalhamento } from "./reologia"

/** Densidade tipica de argamassa autonivelante — kg/m3 */
const RHO_ARGAMASSA = 2100

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ── Modelo tipado: NivelixInput ──────────────────────────────

function calcReologiaNivelix(input: NivelixInput) {
  const sp = input.superplastificante ?? 0
  const filler = input.consumoFiller ?? 0

  // tau0 = 150 * (0.5 - ac) * (1 - 2*SP/100)
  const tau0Raw = 150 * (0.5 - input.ac) * (1 - 2 * sp / 100)
  const tau0 = Math.round(Math.max(0, tau0Raw) * 10) / 10

  // mu = 0.8 + areiaFina/2000 + filler/3000
  const mu = 0.8 + input.consumoAreiaFina / 2000 + filler / 3000
  const muRound = Math.round(Math.max(0.1, mu) * 10) / 10

  // espalhamento = 300 * exp(-tau0 / 80)
  const espRaw = 300 * Math.exp(-tau0 / 80)
  const espalhamento = Math.round(clamp(espRaw, 50, 350))

  return { tau0, mu: muRound, espalhamento }
}

/**
 * Modulo acustico — so faz sentido se tem fibra.
 * moduloAcustico = 3.5 * teorFibra + incorporadorAr * 120
 */
function calcModuloAcustico(input: NivelixInput): number | undefined {
  if (!input.temFibra) return undefined
  const teorFibra = input.teorFibra ?? 0
  const arIncorp = input.incorporadorAr ?? 0
  const dB = Math.round((3.5 * teorFibra + arIncorp * 120) * 10) / 10
  return dB > 0 ? dB : undefined
}

/**
 * Status NBR 15823:
 *   OK:      200-260mm E tau0 < 50 Pa
 *   RISCO:   160-199mm OU 261-300mm
 *   CRITICO: < 160mm OU > 300mm
 */
function calcStatusNivelix(espalhamento: number, tau0: number): "OK" | "RISCO" | "CRITICO" {
  if (espalhamento >= 200 && espalhamento <= 260 && tau0 < 50) return "OK"
  if (espalhamento >= 160 && espalhamento <= 300) return "RISCO"
  return "CRITICO"
}

// ── Fallback: packet.mix (retrocompativel) ───────────────────

function tau0FromSlump(slumpMm: number): number {
  if (slumpMm >= 300) return 5
  return Math.max(1, (300 - slumpMm) / 0.27)
}

function estimarViscosidadeFallback(ac: number): number {
  const mu = 8 + 120 * Math.max(0, 0.55 - ac)
  return Math.round(Math.max(2, Math.min(80, mu)) * 10) / 10
}

/**
 * Aplica o motor NIVELIX ao ConcretePacket.
 *
 * Se packet.nivelixInput presente → modelo Bingham tipado.
 * Se ausente → fallback para packet.mix.
 */
export function applyNivelix(packet: ConcretePacket): ConcretePacket {
  const nivelixIn = packet.nivelixInput

  // ── Modo tipado ─────────────────────────────────────────────
  if (nivelixIn) {
    const { tau0, mu, espalhamento } = calcReologiaNivelix(nivelixIn)
    const moduloAcustico = calcModuloAcustico(nivelixIn)
    const status = calcStatusNivelix(espalhamento, tau0)

    return {
      ...packet,
      nivelix: {
        espalhamento,
        viscosidadePlastica: mu,
        tensaoEscoamento: tau0,
        moduloAcustico,
        status,
      },
    }
  }

  // ── Fallback: packet.mix ────────────────────────────────────
  const { mix } = packet
  const tau0 = tau0FromSlump(mix.slump)
  const mu = estimarViscosidadeFallback(mix.ac)
  const isArgamassa = mix.consumoBrita < 50

  let espalhamento: number
  let tau0Final: number
  if (isArgamassa && mix.slump >= 140) {
    espalhamento = mix.slump
    tau0Final = estimarTau0DeEspalhamento(mix.slump, RHO_ARGAMASSA)
  } else {
    tau0Final = tau0
    espalhamento = mix.slump
  }

  const classe = classificarEspalhamento(espalhamento)

  // Modulo acustico fallback: massa superficial
  let moduloAcustico: number | undefined
  if (isArgamassa) {
    const massaSup = (30 / 1000) * RHO_ARGAMASSA
    const dB = Math.round(20 * Math.log10(massaSup / 100))
    moduloAcustico = dB > 0 ? dB : undefined
  }

  // Status fallback: classe de espalhamento
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
