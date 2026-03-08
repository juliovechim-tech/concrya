// AION CORE — Predicao de resistencia via Abrams + correcoes
//
// Modelo local (sem API externa): Lei de Abrams parametrizada por tipo de
// cimento, com fatores de correcao por adicoes minerais e penalizacao de
// confianca baseada nos status dos demais modulos (compensa, nivelix, ecorisk).
//
// Ref: Abrams, D.A. (1918). Design of Concrete Mixtures. Bulletin 1, PCA.
//      Mehta, P.K. & Monteiro, P.J.M. (2014). Concrete, 4th ed.

import type { ConcretePacket } from "@concrya/schemas"

/** Parametros de Abrams por tipo de cimento */
interface AbramsPar { k1: number; k2: number }

const ABRAMS_PARAMS: Record<string, AbramsPar> = {
  "CP V ARI": { k1: 120, k2: 14 },
  "CP IV":    { k1: 100, k2: 14 },
  "CP III":   { k1: 95,  k2: 14 },
  "CP II-E":  { k1: 105, k2: 14 },
  "CP II-F":  { k1: 108, k2: 14 },
  "CP II-Z":  { k1: 102, k2: 14 },
  "CP I":     { k1: 90,  k2: 14 },
}

const DEFAULT_PARAMS: AbramsPar = { k1: 105, k2: 14 }

/** Fatores de correcao por adicoes minerais */
const ADICAO_FATORES: Record<string, number> = {
  silica_ativa:  1.15,
  metacaulim:    1.10,
  escoria:       0.95,
  cinza_volante: 0.90,
}

/**
 * Aplica o motor AION ao ConcretePacket.
 * Prediz fc28 via Abrams, ajusta por adicoes, calcula confianca e drift.
 * Retorna novo packet com secao `aion` preenchida.
 */
export function applyAion(packet: ConcretePacket): ConcretePacket {
  const { mix } = packet

  // Selecionar parametros de Abrams
  const params = ABRAMS_PARAMS[mix.cimentoType] ?? DEFAULT_PARAMS

  // fc base = k1 / (k2 ^ ac)
  let fc = params.k1 / Math.pow(params.k2, mix.ac)

  // Correcao por adicoes minerais
  if (mix.adicoes) {
    for (const [tipo, _quantidade] of Object.entries(mix.adicoes)) {
      const fator = ADICAO_FATORES[tipo]
      if (fator !== undefined) {
        fc *= fator
      }
    }
  }

  const fcPredito = Math.round(fc * 10) / 10

  // Confianca base
  let confianca = 0.82

  // Penalizacoes por status dos outros modulos
  if (packet.compensa?.status === "CRITICO") {
    confianca -= 0.15
  }
  if (packet.nivelix?.status === "RISCO") {
    confianca -= 0.08
  }
  if (packet.ecorisk && packet.ecorisk.score > 65) {
    confianca -= 0.10
  }

  // Clamp
  confianca = Math.round(Math.max(0.40, Math.min(0.98, confianca)) * 100) / 100

  // Drift detection
  const drift =
    fcPredito < mix.fck * 0.85 ||
    mix.ac > 0.65 ||
    (packet.ecorisk !== undefined && packet.ecorisk.score > 75)

  return {
    ...packet,
    aion: {
      fcPredito,
      confianca,
      drift,
      modelo: "abrams-v1",
    },
  }
}
