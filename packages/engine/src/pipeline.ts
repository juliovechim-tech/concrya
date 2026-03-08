// Densus Engine — Pipeline de integracao CONCRYA
//
// Dois modos:
// 1. runPipeline(MixInput) — retrocompativel, executa todas as etapas
// 2. runVerticalPipeline(PipelineInput) — discriminado por vertical
//
// Filosofia: funcoes puras — packet entra, packet sai (imutavel internamente).

import type { ConcretePacket, MixInput, NivelixInput, CompensaInput, EcoriskInput, DensusInput } from "@concrya/schemas"
import { applyCompensa } from "@concrya/compensa"
import { applyNivelix } from "@concrya/nivelix"
import { applyEcorisk } from "@concrya/ecorisk"
import { applyAion } from "@concrya/aion"
import { buildPacketFromMix } from "./packet"
import { applyDensus } from "./apply-densus"
import type { OpcoesDensus } from "./apply-densus"

/** Input discriminado por vertical */
export type PipelineInput =
  | { vertical: "compensa"; data: CompensaInput }
  | { vertical: "nivelix"; data: NivelixInput }
  | { vertical: "ecorisk"; data: EcoriskInput }
  | { vertical: "densus"; data: DensusInput }

/**
 * Pipeline completo retrocompativel:
 * mix → compensa → nivelix → ecorisk → aion → [densus]
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

// ── Conversores de input tipado → MixInput ───────────────────

function nivelixToMix(input: NivelixInput): MixInput {
  const adicoes: Record<string, number> = {}
  if (input.agenteExpansivo !== "NENHUM" && input.teorAgente > 0) {
    adicoes["agente_expansivo"] = input.teorAgente
    const aeKey = input.agenteExpansivo === "CSA-K" ? "csa" : input.agenteExpansivo.toLowerCase()
    adicoes[aeKey] = input.teorAgente
  }
  if (input.adicaoMineral === "SILICA_ATIVA" && input.teorAdicaoMineral) {
    adicoes["silica_ativa"] = input.teorAdicaoMineral
  }
  if (input.adicaoMineral === "METACAULIM" && input.teorAdicaoMineral) {
    adicoes["metacaulim"] = input.teorAdicaoMineral
  }
  return {
    cimentoType: input.cimentoType,
    fck: input.fck,
    ac: input.ac,
    slump: input.espalhamentoAlvo,
    consumoCimento: input.consumoCimento,
    consumoAgua: input.consumoAgua,
    consumoAreia: input.consumoAreiaFina + (input.consumoAreiaMedia ?? 0),
    consumoBrita: 0,
    adicoes: Object.keys(adicoes).length > 0 ? adicoes : undefined,
  }
}

function compensaToMix(input: CompensaInput): MixInput {
  const adicoes: Record<string, number> = {}
  if (input.agenteExpansivo !== "NENHUM" && input.teorAgente > 0) {
    adicoes["agente_expansivo"] = input.teorAgente
    const aeKey = input.agenteExpansivo === "CSA-K" ? "csa" : input.agenteExpansivo.toLowerCase()
    adicoes[aeKey] = input.teorAgente
  }
  if (input.adicoes?.silicaAtiva) adicoes["silica_ativa"] = input.adicoes.silicaAtiva
  if (input.adicoes?.metacaulim) adicoes["metacaulim"] = input.adicoes.metacaulim
  return {
    cimentoType: input.cimentoType,
    fck: input.fck,
    ac: input.ac,
    slump: input.slump,
    consumoCimento: input.consumoCimento,
    consumoAgua: input.consumoAgua,
    consumoAreia: input.consumoAreia,
    consumoBrita: input.consumoBrita,
    adicoes: Object.keys(adicoes).length > 0 ? adicoes : undefined,
  }
}

function ecoriskToMix(input: EcoriskInput): MixInput {
  const adicoes: Record<string, number> = { ...(input.adicoes ?? {}) }
  if (input.agenteExpansivo && input.agenteExpansivo !== "NENHUM" && input.teorAgente) {
    adicoes["agente_expansivo"] = input.teorAgente
  }
  return {
    cimentoType: input.cimentoType,
    fck: input.fck,
    ac: input.ac,
    slump: input.slump ?? input.espalhamento ?? 200,
    consumoCimento: input.consumoCimento,
    consumoAgua: input.consumoAgua,
    consumoAreia: input.consumoAreia,
    consumoBrita: input.consumoBrita,
    adicoes: Object.keys(adicoes).length > 0 ? adicoes : undefined,
  }
}

function densusToMixAndOpts(input: DensusInput): { mix: MixInput; opcoes: OpcoesDensus } {
  const adicoes: Record<string, number> = {}
  if (input.adicoes?.silicaAtiva) adicoes["silica_ativa"] = input.adicoes.silicaAtiva
  if (input.adicoes?.metacaulim) adicoes["metacaulim"] = input.adicoes.metacaulim
  if (input.adicoes?.escoria) adicoes["escoria"] = input.adicoes.escoria
  if (input.adicoes?.cinzaVolante) adicoes["cinza_volante"] = input.adicoes.cinzaVolante

  const precos: Record<string, number> = {}
  if (input.precos?.cimento) precos["cimento"] = input.precos.cimento
  if (input.precos?.areia) precos["areia"] = input.precos.areia
  if (input.precos?.brita) precos["brita"] = input.precos.brita

  return {
    mix: {
      cimentoType: input.cimentoType,
      fck: input.fck,
      ac: input.ac,
      slump: input.slump,
      consumoCimento: input.consumoCimento,
      consumoAgua: input.consumoAgua,
      consumoAreia: input.consumoAreia,
      consumoBrita: input.consumoBrita,
      adicoes: Object.keys(adicoes).length > 0 ? adicoes : undefined,
    },
    opcoes: {
      metodoGranulometria: input.metodoGranulometria,
      dmax: input.dmax,
      dmin: input.dmin,
      q: input.q,
      precos: Object.keys(precos).length > 0 ? precos : undefined,
    },
  }
}

/**
 * Pipeline discriminado por vertical.
 * Cada vertical executa todas as etapas mas injeta o input tipado
 * no packet para que o apply* correto use o modelo especifico.
 */
export function runVerticalPipeline(input: PipelineInput): ConcretePacket {
  switch (input.vertical) {
    case "compensa": {
      const mixInput = compensaToMix(input.data)
      const packet = buildPacketFromMix(mixInput)
      const p1 = applyCompensa({ ...packet, compensaInput: input.data })
      const p2 = applyNivelix(p1)
      const p3 = applyEcorisk(p2)
      return applyAion(p3)
    }

    case "nivelix": {
      const mixInput = nivelixToMix(input.data)
      const packet = buildPacketFromMix(mixInput)
      const p1 = applyCompensa(packet)
      const p2 = applyNivelix({ ...p1, nivelixInput: input.data })
      const p3 = applyEcorisk(p2)
      return applyAion(p3)
    }

    case "ecorisk": {
      const mixInput = ecoriskToMix(input.data)
      const packet = buildPacketFromMix(mixInput)
      const p1 = applyCompensa({ ...packet, ecoriskInput: input.data })
      const p2 = applyNivelix(p1)
      const p3 = applyEcorisk(p2)
      return applyAion(p3)
    }

    case "densus": {
      const { mix, opcoes } = densusToMixAndOpts(input.data)
      const packet = buildPacketFromMix(mix)
      const p1 = applyCompensa({ ...packet, densusInput: input.data })
      const p2 = applyNivelix(p1)
      const p3 = applyEcorisk(p2)
      const p4 = applyAion(p3)
      return applyDensus(p4, opcoes)
    }
  }
}
