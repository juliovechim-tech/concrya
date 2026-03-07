// COMPENSA CORE — Apply para ConcretePacket
//
// Recebe um ConcretePacket, calcula expansao/retracao/balanco CRC
// e retorna o packet com a secao `compensa` preenchida.

import type { ConcretePacket } from "@concrya/schemas"
import { calcExpansao } from "./expansao"
import { calcRetracao } from "./retracao"
import { calcBalancoCRC } from "./balanco"
import type { TipoAE } from "./types"

/** Mapeamento simplificado de nomes de AE para TipoAE */
const AE_MAP: Record<string, TipoAE> = {
  csa: "tipo_k",
  tipo_k: "tipo_k",
  cao: "tipo_m",
  tipo_m: "tipo_m",
  mgo: "tipo_s",
  tipo_s: "tipo_s",
  combinado: "tipo_g",
  tipo_g: "tipo_g",
}

/**
 * Aplica o motor COMPENSA ao ConcretePacket.
 * Usa dados do mix para estimar expansao e retracao.
 * Retorna novo packet com secao `compensa` preenchida.
 */
export function applyCompensa(packet: ConcretePacket): ConcretePacket {
  const { mix } = packet

  // Determinar tipo de AE e dosagem a partir de adicoes
  // Convencao: adicoes["agente_expansivo"] = kg/m3 do AE
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
      cimentoKgM3: mix.consumoCimento,
      tempCuraC: 25,         // default temperatura ambiente
      grauRestricao: 0.5,    // restricao media (piso sobre base)
      idadeDias: 28,
    },
    retracao: {
      ac: mix.ac,
      cimentoKgM3: mix.consumoCimento,
      volumePastaLM3: mix.consumoAgua + mix.consumoCimento / 3.1, // estimativa
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
