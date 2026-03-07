// Densus Engine — ConcretePacket Builder
//
// Constroi um ConcretePacket v1 a partir dos dados minimos de um traco.

import type { ConcretePacket, MixInput } from "@concrya/schemas"

let _counter = 0

/**
 * Gera um id unico simples (sem dependencia de crypto/uuid).
 * Formato: timestamp hex + contador + random hex.
 */
function generateId(): string {
  _counter = (_counter + 1) % 0xffff
  const ts = Date.now().toString(16)
  const cnt = _counter.toString(16).padStart(4, "0")
  const rnd = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0")
  return `${ts}-${cnt}-${rnd}`
}

/**
 * Constroi um ConcretePacket v1 a partir de um MixInput.
 * Apenas preenche a secao `mix` — as demais secoes sao adicionadas
 * pelos respectivos pacotes via apply*.
 */
export function buildPacketFromMix(input: MixInput): ConcretePacket {
  return {
    version: "1.0",
    id: generateId(),
    timestamp: new Date().toISOString(),
    project: input.project,
    mix: {
      cimentoType: input.cimentoType,
      fck: input.fck,
      ac: input.ac,
      slump: input.slump,
      consumoCimento: input.consumoCimento,
      consumoAgua: input.consumoAgua,
      consumoAreia: input.consumoAreia,
      consumoBrita: input.consumoBrita,
      adicoes: input.adicoes,
    },
  }
}
