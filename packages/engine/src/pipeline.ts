// Densus Engine — Pipeline de integracao CONCRYA
//
// Executa a cadeia completa: mix → compensa → nivelix → ecorisk → aion
// Cada etapa recebe um ConcretePacket e retorna um ConcretePacket enriquecido.
//
// Filosofia: funcoes puras — packet entra, packet sai (imutavel internamente).

import type { ConcretePacket, MixInput } from "@concrya/schemas"
import { applyCompensa } from "@concrya/compensa"
import { applyNivelix } from "@concrya/nivelix"
import { applyEcorisk } from "@concrya/ecorisk"
import { applyAion } from "@concrya/aion"
import { buildPacketFromMix } from "./packet"
import { applyDensus } from "./apply-densus"
import type { OpcoesDensus } from "./apply-densus"

/**
 * Executa o pipeline completo CONCRYA:
 * 1. Constroi ConcretePacket a partir do MixInput
 * 2. Aplica COMPENSA (expansao/retracao/balanco CRC)
 * 3. Aplica NIVELIX (reologia/espalhamento)
 * 4. Aplica ECORISK (eco-indicadores + risco → score Dw)
 * 5. Aplica AION (predicao de resistencia + drift detection)
 * 6. (Opcional) Aplica DENSUS (traco unitario, granulometria, CPM, custo)
 *
 * @param input Dados minimos do traco
 * @param opcoesDensus Opcoes para ativar o motor Densus (opcional)
 * @returns ConcretePacket v1 completo com todas as secoes preenchidas
 */
export function runPipeline(input: MixInput, opcoesDensus?: OpcoesDensus): ConcretePacket {
  const packet = buildPacketFromMix(input)
  const p1 = applyCompensa(packet)
  const p2 = applyNivelix(p1)
  const p3 = applyEcorisk(p2)
  const p4 = applyAion(p3)
  if (opcoesDensus) {
    return applyDensus(p4, opcoesDensus)
  }
  return p4
}
