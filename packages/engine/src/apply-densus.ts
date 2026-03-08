// Densus Engine — applyDensus: traco unitario, granulometria, CPM, custo
//
// Funcao pura: packet entra, packet sai com secao densus preenchida.
//
// Se packet.densusInput presente → extrai consumos e opcoes do input tipado.
// Se ausente → fallback para packet.mix + OpcoesDensus (retrocompativel).

import type { ConcretePacket, DensusInput } from "@concrya/schemas"
import { calcularTracoUnitario, calcularVolumesAbsolutos, calcularCusto } from "./dosagem"
import { fuller, faury, bolomey, andreasenMulcahy } from "./granulometria"
import { cpmSolver } from "./cpm"
import type { MaterialCPM } from "./cpm"

/** Opcoes para applyDensus */
export interface OpcoesDensus {
  metodoGranulometria: "Fuller" | "Faury" | "Bolomey" | "Andreasen"
  dmax: number        // mm
  dmin?: number       // mm (Andreasen)
  q?: number          // expoente Andreasen
  precos?: Record<string, number>  // R$/kg por material
}

/** Dados normalizados para o calculo */
interface DensusParams {
  consumoCimento: number
  consumoAreia: number
  consumoBrita: number
  consumoAgua: number
  opcoes: OpcoesDensus
}

function extractFromTypedInput(input: DensusInput): DensusParams {
  const precos: Record<string, number> = {}
  if (input.precos?.cimento) precos["cimento"] = input.precos.cimento
  if (input.precos?.areia) precos["areia"] = input.precos.areia
  if (input.precos?.brita) precos["brita"] = input.precos.brita

  return {
    consumoCimento: input.consumoCimento,
    consumoAreia: input.consumoAreia,
    consumoBrita: input.consumoBrita,
    consumoAgua: input.consumoAgua,
    opcoes: {
      metodoGranulometria: input.metodoGranulometria,
      dmax: input.dmax,
      dmin: input.dmin,
      q: input.q,
      precos: Object.keys(precos).length > 0 ? precos : undefined,
    },
  }
}

function extractFromMix(mix: ConcretePacket["mix"], opcoes: OpcoesDensus): DensusParams {
  return {
    consumoCimento: mix.consumoCimento,
    consumoAreia: mix.consumoAreia,
    consumoBrita: mix.consumoBrita,
    consumoAgua: mix.consumoAgua,
    opcoes,
  }
}

/**
 * Aplica o motor Densus ao ConcretePacket.
 *
 * Se packet.densusInput presente → usa input tipado (opcoes vem do input).
 * Se ausente → fallback para packet.mix + opcoes parametro (retrocompativel).
 *
 * Calcula traco unitario, volumes absolutos, curva granulometrica, CPM e custo.
 * Retorna novo packet com secao densus preenchida.
 */
export function applyDensus(packet: ConcretePacket, opcoes?: OpcoesDensus): ConcretePacket {
  const params = packet.densusInput
    ? extractFromTypedInput(packet.densusInput)
    : extractFromMix(packet.mix, opcoes!)

  const { consumoCimento, consumoAreia, consumoBrita, consumoAgua } = params
  const opts = params.opcoes

  // Traco unitario
  const tracaoUnitario = calcularTracoUnitario(
    consumoCimento,
    consumoAreia,
    consumoBrita,
    consumoAgua,
  )

  // Volumes absolutos
  const volumes = calcularVolumesAbsolutos(
    consumoCimento,
    consumoAreia,
    consumoBrita,
    consumoAgua,
  )

  // Curva granulometrica
  let curva: Array<{ peneira: number; cpft: number; metodo: string }>
  const metodo = opts.metodoGranulometria

  switch (metodo) {
    case "Fuller":
      curva = fuller(opts.dmax)
      break
    case "Faury":
      curva = faury(opts.dmax, { dmin: opts.dmin })
      break
    case "Bolomey":
      curva = bolomey(opts.dmax, { dmin: opts.dmin })
      break
    case "Andreasen":
      curva = andreasenMulcahy(opts.dmax, opts.dmin ?? 0.075, opts.q ?? 0.37)
      break
  }

  // CPM — usar materiais do traco
  const materiaisCPM: MaterialCPM[] = []
  if (consumoAreia > 0) {
    materiaisCPM.push({ nome: "areia", d50: 0.6, densidade: 2.62, teor: 0 })
  }
  if (consumoBrita > 0) {
    materiaisCPM.push({ nome: "brita", d50: 12.5, densidade: 2.70, teor: 0 })
  }

  let cpmResult: { phi: number; empacotamentoReal: number; materialDominante: string } | undefined
  if (materiaisCPM.length >= 2) {
    const vAreia = consumoAreia / 2.62
    const vBrita = consumoBrita / 2.70
    const vTotal = vAreia + vBrita
    if (vTotal > 0) {
      materiaisCPM[0]!.teor = Math.round((vAreia / vTotal) * 1000) / 1000
      materiaisCPM[1]!.teor = Math.round((vBrita / vTotal) * 1000) / 1000
      materiaisCPM[1]!.teor = Math.round((1 - materiaisCPM[0]!.teor) * 1000) / 1000
      cpmResult = cpmSolver(materiaisCPM)
    }
  }

  // Custo
  let custoResult: { total: number; breakdown: Record<string, number> } | undefined
  if (opts.precos) {
    const consumos: Record<string, number> = {
      cimento: consumoCimento,
      agua: consumoAgua,
      areia: consumoAreia,
      brita: consumoBrita,
    }
    custoResult = calcularCusto(consumos, opts.precos)
  }

  return {
    ...packet,
    densus: {
      tracaoUnitario,
      volumes,
      granulometria: {
        metodo,
        curva,
      },
      cpm: cpmResult,
      custo: custoResult,
    },
  }
}
