// Densus Engine — applyDensus: traço unitário, granulometria, CPM, custo
//
// Função pura: packet entra, packet sai com seção densus preenchida.

import type { ConcretePacket } from "@concrya/schemas"
import { calcularTracoUnitario, calcularVolumesAbsolutos, calcularCusto } from "./dosagem"
import { fuller, faury, bolomey, andreasenMulcahy } from "./granulometria"
import { cpmSolver } from "./cpm"
import type { MaterialCPM } from "./cpm"

/** Opcões para applyDensus */
export interface OpcoesDensus {
  metodoGranulometria: "Fuller" | "Faury" | "Bolomey" | "Andreasen"
  dmax: number        // mm
  dmin?: number       // mm (Andreasen)
  q?: number          // expoente Andreasen
  precos?: Record<string, number>  // R$/kg por material
}

/**
 * Aplica o motor Densus ao ConcretePacket.
 * Calcula traço unitário, volumes absolutos, curva granulométrica, CPM e custo.
 * Retorna novo packet com seção densus preenchida.
 */
export function applyDensus(packet: ConcretePacket, opcoes: OpcoesDensus): ConcretePacket {
  const { mix } = packet

  // Traço unitário
  const tracaoUnitario = calcularTracoUnitario(
    mix.consumoCimento,
    mix.consumoAreia,
    mix.consumoBrita,
    mix.consumoAgua,
  )

  // Volumes absolutos
  const volumes = calcularVolumesAbsolutos(
    mix.consumoCimento,
    mix.consumoAreia,
    mix.consumoBrita,
    mix.consumoAgua,
  )

  // Curva granulométrica
  let curva: Array<{ peneira: number; cpft: number; metodo: string }>
  const metodo = opcoes.metodoGranulometria

  switch (metodo) {
    case "Fuller":
      curva = fuller(opcoes.dmax)
      break
    case "Faury":
      curva = faury(opcoes.dmax, { dmin: opcoes.dmin })
      break
    case "Bolomey":
      curva = bolomey(opcoes.dmax, { dmin: opcoes.dmin })
      break
    case "Andreasen":
      curva = andreasenMulcahy(opcoes.dmax, opcoes.dmin ?? 0.075, opcoes.q ?? 0.37)
      break
  }

  // CPM — usar materiais do traço
  const materiaisCPM: MaterialCPM[] = []
  if (mix.consumoAreia > 0) {
    materiaisCPM.push({ nome: "areia", d50: 0.6, densidade: 2.62, teor: 0 })
  }
  if (mix.consumoBrita > 0) {
    materiaisCPM.push({ nome: "brita", d50: 12.5, densidade: 2.70, teor: 0 })
  }

  let cpmResult: { phi: number; empacotamentoReal: number; materialDominante: string } | undefined
  if (materiaisCPM.length >= 2) {
    // Calcular teores volumétricos
    const vAreia = mix.consumoAreia / 2.62
    const vBrita = mix.consumoBrita / 2.70
    const vTotal = vAreia + vBrita
    if (vTotal > 0) {
      materiaisCPM[0].teor = Math.round((vAreia / vTotal) * 1000) / 1000
      materiaisCPM[1].teor = Math.round((vBrita / vTotal) * 1000) / 1000
      // Ajustar para garantir soma = 1.0
      materiaisCPM[1].teor = Math.round((1 - materiaisCPM[0].teor) * 1000) / 1000
      cpmResult = cpmSolver(materiaisCPM)
    }
  }

  // Custo
  let custoResult: { total: number; breakdown: Record<string, number> } | undefined
  if (opcoes.precos) {
    const consumos: Record<string, number> = {
      cimento: mix.consumoCimento,
      agua: mix.consumoAgua,
      areia: mix.consumoAreia,
      brita: mix.consumoBrita,
    }
    custoResult = calcularCusto(consumos, opcoes.precos)
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
