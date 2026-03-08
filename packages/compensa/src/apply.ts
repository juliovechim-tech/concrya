// COMPENSA CORE — Apply para ConcretePacket
//
// Recebe um ConcretePacket, calcula expansao/retracao/balanco CRC
// e retorna o packet com a secao `compensa` preenchida.

import type { ConcretePacket, CompensaInput } from "@concrya/schemas"
import { calcExpansao } from "./expansao"
import { calcRetracao } from "./retracao"
import { calcBalancoCRC } from "./balanco"
import type { TipoAE } from "./types"

/** Mapeamento simplificado de nomes de AE para TipoAE */
const AE_MAP: Record<string, TipoAE> = {
  csa: "tipo_k",
  "CSA-K": "tipo_k",
  "CSA-G": "tipo_g",
  tipo_k: "tipo_k",
  cao: "tipo_m",
  tipo_m: "tipo_m",
  mgo: "tipo_s",
  tipo_s: "tipo_s",
  combinado: "tipo_g",
  ETTRINGITA: "tipo_k",
  tipo_g: "tipo_g",
}

/** Extrai tipoAE, aeKgM3 e consumoCimento a partir de CompensaInput tipado */
function extractFromTypedInput(input: CompensaInput): { tipoAE: TipoAE; aeKgM3: number; dosAePct: number; consumoCimento: number; ac: number; consumoAgua: number } {
  const tipoAE = AE_MAP[input.agenteExpansivo] ?? "tipo_k"
  const aeKgM3 = input.teorAgente
  const dosAePct = input.consumoCimento > 0 ? (aeKgM3 / input.consumoCimento) * 100 : 0
  return { tipoAE, aeKgM3, dosAePct, consumoCimento: input.consumoCimento, ac: input.ac, consumoAgua: input.consumoAgua }
}

/** Extrai tipoAE, aeKgM3 e consumoCimento a partir de packet.mix (fallback) */
function extractFromMix(mix: ConcretePacket["mix"]): { tipoAE: TipoAE; aeKgM3: number; dosAePct: number; consumoCimento: number; ac: number; consumoAgua: number } {
  const aeKgM3 = mix.adicoes?.["agente_expansivo"] ?? mix.adicoes?.["ae"] ?? 0
  const aeNome = Object.keys(mix.adicoes ?? {}).find(k =>
    k.toLowerCase().includes("csa") ||
    k.toLowerCase().includes("cao") ||
    k.toLowerCase().includes("mgo") ||
    k.toLowerCase().includes("ae") ||
    k.toLowerCase().includes("expansivo")
  ) ?? "csa"
  const tipoAE = AE_MAP[aeNome.toLowerCase()] ?? "tipo_k"
  const dosAePct = mix.consumoCimento > 0 ? (aeKgM3 / mix.consumoCimento) * 100 : 0
  return { tipoAE, aeKgM3, dosAePct, consumoCimento: mix.consumoCimento, ac: mix.ac, consumoAgua: mix.consumoAgua }
}

/**
 * Aplica o motor COMPENSA ao ConcretePacket.
 *
 * Se packet.compensaInput presente → usa input tipado (direto, sem heuristica).
 * Se ausente → fallback para packet.mix (retrocompativel).
 *
 * Retorna novo packet com secao `compensa` preenchida.
 */
export function applyCompensa(packet: ConcretePacket): ConcretePacket {
  const { tipoAE, aeKgM3, dosAePct, consumoCimento, ac, consumoAgua } =
    packet.compensaInput
      ? extractFromTypedInput(packet.compensaInput)
      : extractFromMix(packet.mix)

  // Se nao ha AE, preencher com zeros e status CRITICO
  if (dosAePct <= 0) {
    return {
      ...packet,
      compensa: {
        expansaoEsperada: 0,
        retracaoEstimada: 0,
        balancoCRC: 0,
        agenteExpansivo: "nenhum",
        teorAgente: 0,
        status: "CRITICO",
      },
    }
  }

  const resultado = calcBalancoCRC({
    expansao: {
      tipoAE,
      dosAePct,
      cimentoKgM3: consumoCimento,
      tempCuraC: 25,         // default temperatura ambiente
      grauRestricao: 0.5,    // restricao media (piso sobre base)
      idadeDias: 28,
    },
    retracao: {
      ac,
      cimentoKgM3: consumoCimento,
      volumePastaLM3: consumoAgua + consumoCimento / 3.1, // estimativa
      umidadeRelPct: 60,     // default Brasil
      espessuraEqMm: 200,    // default contrapiso/piso
      idadeDias: 28,
    },
  })

  let status: "OK" | "RISCO" | "CRITICO"
  if (resultado.classificacao === "total") status = "OK"
  else if (resultado.classificacao === "parcial") status = "RISCO"
  else status = "CRITICO"

  return {
    ...packet,
    compensa: {
      expansaoEsperada: resultado.expansaoUe,
      retracaoEstimada: resultado.retracaoUe,
      balancoCRC: resultado.netUe,
      agenteExpansivo: tipoAE,
      teorAgente: Math.round(aeKgM3 * 10) / 10,
      status,
    },
  }
}
