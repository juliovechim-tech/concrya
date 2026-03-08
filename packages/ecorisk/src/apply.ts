// ECORISK — Apply para ConcretePacket
//
// Recebe um ConcretePacket, calcula eco-indicadores e dominios de risco
// e retorna o packet com secao `ecorisk`.
//
// Se packet.ecoriskInput presente → usa input tipado.
// Se ausente → fallback para packet.mix (retrocompativel).

import type { ConcretePacket, EcoriskInput } from "@concrya/schemas"
import { calcEcoIndicadores, type EntradaEco } from "./eco"
import { calcDominiosRisco, type EntradaRisco } from "./risco"
import { calcEcoriskScore } from "./score"

/**
 * Mapeia tipo de cimento do packet para o formato do ecorisk.
 */
function mapTipoCimento(tipo: string): EntradaEco["tipoCimento"] {
  const t = tipo.toLowerCase()
  if (t.includes("v") || t.includes("ari")) return "cpv"
  if (t.includes("iii")) return "cpiii"
  if (t.includes("iv")) return "cpiv"
  return "cpii"
}

/** Dados normalizados que ambos os paths produzem */
interface EcoriskParams {
  cimentoType: string
  fck: number
  ac: number
  slumpMm: number
  consumoCimento: number
  consumoAgua: number
  consumoAreia: number
  consumoBrita: number
  adicoes?: Record<string, number>
}

function extractFromTypedInput(input: EcoriskInput): EcoriskParams {
  return {
    cimentoType: input.cimentoType,
    fck: input.fck,
    ac: input.ac,
    slumpMm: input.slump ?? input.espalhamento ?? 200,
    consumoCimento: input.consumoCimento,
    consumoAgua: input.consumoAgua,
    consumoAreia: input.consumoAreia,
    consumoBrita: input.consumoBrita,
    adicoes: input.adicoes,
  }
}

function extractFromMix(mix: ConcretePacket["mix"]): EcoriskParams {
  return {
    cimentoType: mix.cimentoType,
    fck: mix.fck,
    ac: mix.ac,
    slumpMm: mix.slump,
    consumoCimento: mix.consumoCimento,
    consumoAgua: mix.consumoAgua,
    consumoAreia: mix.consumoAreia,
    consumoBrita: mix.consumoBrita,
    adicoes: mix.adicoes,
  }
}

/**
 * Aplica o framework ECORISK ao ConcretePacket.
 *
 * Se packet.ecoriskInput presente → usa input tipado.
 * Se ausente → fallback para packet.mix (retrocompativel).
 *
 * Calcula eco-indicadores + dominios de risco → score Dw.
 * Retorna novo packet com secao `ecorisk` preenchida.
 */
export function applyEcorisk(packet: ConcretePacket): ConcretePacket {
  const params = packet.ecoriskInput
    ? extractFromTypedInput(packet.ecoriskInput)
    : extractFromMix(packet.mix)

  // Montar entrada eco
  const tipoCimento = mapTipoCimento(params.cimentoType)
  const agregadosKgM3 = params.consumoAreia + params.consumoBrita

  // Converter adicoes para formato ecorisk
  const adicoesEco: EntradaEco["adicoesKgM3"] = {}
  if (params.adicoes) {
    for (const [chave, valor] of Object.entries(params.adicoes)) {
      const k = chave.toLowerCase()
      if (k.includes("escoria")) adicoesEco.escoria = valor
      else if (k.includes("cinza")) adicoesEco.cinza_volante = valor
      else if (k.includes("metacaulim")) adicoesEco.metacaulim = valor
      else if (k.includes("silica")) adicoesEco.silica_ativa = valor
      else if (k.includes("filler")) adicoesEco.filler = valor
    }
  }

  const eco = calcEcoIndicadores({
    cimentoKgM3: params.consumoCimento,
    tipoCimento,
    adicoesKgM3: adicoesEco,
    agregadosKgM3,
    aguaLM3: params.consumoAgua,
    fck28: params.fck,
  })

  // Montar entrada risco (estimativas a partir do mix)
  const fckPrevisto = params.fck * 1.10  // margem de 10% estimada
  const risco = calcDominiosRisco({
    ac: params.ac,
    fckAlvo: params.fck,
    fckPrevisto,
    cimentoKgM3: params.consumoCimento,
    classeAgressividade: "II",  // default conservador
    slumpMm: params.slumpMm,
  })

  const resultado = calcEcoriskScore({ eco, risco })

  // Score 0-1 → 0-100
  const score100 = Math.round(resultado.dw * 100)

  // Nivel
  let nivel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO"
  if (resultado.classificacao === "A" || resultado.classificacao === "B") nivel = "BAIXO"
  else if (resultado.classificacao === "C") nivel = "MEDIO"
  else if (resultado.classificacao === "D") nivel = "ALTO"
  else nivel = "CRITICO"

  // Fatores de risco relevantes (d < 0.5 = atencao)
  const fatores = resultado.detalhes
    .filter(d => d.desejabilidade < 0.5)
    .map(d => d.nome)

  // Recomendacoes
  const recomendacoes: string[] = []
  if (eco.binderIndex > 10) recomendacoes.push("Reduzir consumo de cimento ou aumentar fck")
  if (eco.co2KgM3 > 350) recomendacoes.push("Substituir parte do clinquer por adicoes minerais")
  if (eco.aguaLM3 > 190) recomendacoes.push("Reduzir agua total (aumentar SP ou reduzir a/c)")
  if (risco.durabilidade > 0.5) recomendacoes.push("a/c acima do limite — verificar NBR 6118")
  if (risco.retracao > 0.5) recomendacoes.push("Risco de retracao elevado — considerar fibras ou AE")
  if (recomendacoes.length === 0) recomendacoes.push("Formulacao equilibrada — sem acoes urgentes")

  return {
    ...packet,
    ecorisk: {
      score: score100,
      nivel,
      fatores,
      recomendacoes,
    },
  }
}
