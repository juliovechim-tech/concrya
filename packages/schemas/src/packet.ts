// CONCRYA Packet v1 — Formato unificado de dados entre pacotes
//
// O ConcretePacket e o contrato de integracao do ecossistema CONCRYA.
// Cada pacote (engine, compensa, nivelix, ecorisk, aion) pode
// consumir e produzir um packet, adicionando sua seção.
//
// Filosofia: funcoes puras — packet entra, packet sai.

import type { CompensaInput } from "./compensa-input"
import type { NivelixInput } from "./nivelix-input"
import type { EcoriskInput } from "./ecorisk-input"
import type { DensusInput } from "./densus-input"

/**
 * ConcretePacket v1 — estrutura unificada de dados de um traco de concreto
 * que flui entre todos os pacotes do ecossistema CONCRYA.
 */
export interface ConcretePacket {
  version: "1.0"
  /** Identificador unico — uuid */
  id: string
  /** Data/hora de criacao — ISO 8601 */
  timestamp: string
  /** Nome do projeto (opcional) */
  project?: string

  /** Dados do traco base (obrigatorio) */
  mix: {
    cimentoType: string         // CP I..V
    fck: number                 // MPa
    ac: number                  // relacao a/c
    slump: number               // mm
    consumoCimento: number      // kg/m3
    consumoAgua: number         // L/m3
    consumoAreia: number        // kg/m3
    consumoBrita: number        // kg/m3
    adicoes?: Record<string, number>  // tipo → kg/m3
  }

  /** Input tipado da vertical (opcional — usado por apply* em dual-mode) */
  compensaInput?: CompensaInput
  nivelixInput?: NivelixInput
  ecoriskInput?: EcoriskInput
  densusInput?: DensusInput

  /** Dados de retracao compensada (preenchido por @concrya/compensa) */
  compensa?: {
    expansaoEsperada: number    // µε
    retracaoEstimada: number    // µε (negativo)
    balancoCRC: number          // µε (positivo = expansao liquida)
    agenteExpansivo: string
    teorAgente: number          // kg/m3
    status: "OK" | "RISCO" | "CRITICO"
  }

  /** Dados de autonivelante (preenchido por @concrya/nivelix) */
  nivelix?: {
    espalhamento: number        // mm
    viscosidadePlastica: number // Pa·s (Bingham)
    tensaoEscoamento: number   // Pa
    moduloAcustico?: number    // dB reducao
    status: "OK" | "RISCO" | "CRITICO"
  }

  /** Dados de eco-risco (preenchido por @concrya/ecorisk) */
  ecorisk?: {
    score: number               // 0..100
    nivel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO"
    fatores: string[]
    recomendacoes: string[]
  }

  /** Dados de predicao IA (preenchido por @concrya/aion) */
  aion?: {
    fcPredito: number           // MPa
    confianca: number           // 0..1
    drift: boolean
    modelo: string
    intervalo?: [number, number] // IC 90% [min, max]
  }

  /** Dados do Densus Engine (preenchido por applyDensus) */
  densus?: {
    tracaoUnitario: {
      cimento: 1
      areia: number
      brita: number
      agua: number
    }
    volumes: {
      cimento: number   // dm³
      agua: number
      areia: number
      brita: number
      ar: number
      total: number
    }
    granulometria: {
      metodo: "Fuller" | "Faury" | "Bolomey" | "Andreasen"
      curva: Array<{ peneira: number; cpft: number; metodo: string }>
    }
    cpm?: {
      phi: number
      empacotamentoReal: number
      materialDominante: string
    }
    custo?: {
      total: number             // R$/m³
      breakdown: Record<string, number>
    }
  }
}

/**
 * Input minimo para construir um ConcretePacket a partir de um traco.
 */
export interface MixInput {
  cimentoType: string
  fck: number
  ac: number
  slump: number
  consumoCimento: number
  consumoAgua: number
  consumoAreia: number
  consumoBrita: number
  adicoes?: Record<string, number>
  project?: string
}
