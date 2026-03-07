// ECORISK — Apply para ConcretePacket
//
// Recebe um ConcretePacket, calcula eco-indicadores e dominios de risco
// a partir dos dados do mix, e retorna o packet com secao `ecorisk`.

import type { ConcretePacket } from "@concrya/schemas"
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

/**
 * Aplica o framework ECORISK ao ConcretePacket.
 * Calcula eco-indicadores + dominios de risco → score Dw.
 * Retorna novo packet com secao `ecorisk` preenchida.
 */
export function applyEcorisk(packet: ConcretePacket): ConcretePacket {
  const { mix } = packet

  // Montar entrada eco
  const tipoCimento = mapTipoCimento(mix.cimentoType)
  const agregadosKgM3 = mix.consumoAreia + mix.consumoBrita

  // Converter adicoes do packet para formato ecorisk
  const adicoesEco: EntradaEco["adicoesKgM3"] = {}
  if (mix.adicoes) {
    for (const [chave, valor] of Object.entries(mix.adicoes)) {
      const k = chave.toLowerCase()
      if (k.includes("escoria")) adicoesEco.escoria = valor
      else if (k.includes("cinza")) adicoesEco.cinza_volante = valor
      else if (k.includes("metacaulim")) adicoesEco.metacaulim = valor
      else if (k.includes("silica")) adicoesEco.silica_ativa = valor
      else if (k.includes("filler")) adicoesEco.filler = valor
    }
  }

  const eco = calcEcoIndicadores({
    cimentoKgM3: mix.consumoCimento,
    tipoCimento,
    adicoesKgM3: adicoesEco,
    agregadosKgM3,
    aguaLM3: mix.consumoAgua,
    fck28: mix.fck,
  })

  // Montar entrada risco (estimativas a partir do mix)
  const fckPrevisto = mix.fck * 1.10  // margem de 10% estimada
  const risco = calcDominiosRisco({
    ac: mix.ac,
    fckAlvo: mix.fck,
    fckPrevisto,
    cimentoKgM3: mix.consumoCimento,
    classeAgressividade: "II",  // default conservador
    slumpMm: mix.slump,
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
