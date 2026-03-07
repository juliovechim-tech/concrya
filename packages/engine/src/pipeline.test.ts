// Pipeline integration test — CONCRYA Packet v1
//
// Traco real: CP V ARI, fck=40, a/c=0.40, slump=200, AE CSA

import { describe, it, expect } from "vitest"
import { runPipeline } from "./pipeline"
import type { MixInput } from "@concrya/schemas"

const TRACO_REAL: MixInput = {
  cimentoType: "CP V ARI",
  fck: 40,
  ac: 0.40,
  slump: 200,
  consumoCimento: 450,
  consumoAgua: 180,
  consumoAreia: 750,
  consumoBrita: 950,
  adicoes: {
    csa: 45,               // 10% de AE tipo CSA
    agente_expansivo: 45,  // duplicado para teste de deteccao
  },
  project: "Teste Pipeline v1",
}

describe("runPipeline", () => {
  const packet = runPipeline(TRACO_REAL)

  it("retorna version 1.0", () => {
    expect(packet.version).toBe("1.0")
  })

  it("gera id e timestamp validos", () => {
    expect(packet.id).toBeTruthy()
    expect(packet.timestamp).toBeTruthy()
    expect(new Date(packet.timestamp).getTime()).toBeGreaterThan(0)
  })

  it("preserva dados do mix", () => {
    expect(packet.mix.fck).toBe(40)
    expect(packet.mix.ac).toBe(0.40)
    expect(packet.mix.consumoCimento).toBe(450)
    expect(packet.mix.slump).toBe(200)
  })

  it("preenche secao compensa", () => {
    expect(packet.compensa).toBeDefined()
    expect(packet.compensa!.status).toBeDefined()
    expect(["OK", "RISCO", "CRITICO"]).toContain(packet.compensa!.status)
    expect(packet.compensa!.agenteExpansivo).toBeTruthy()
    expect(typeof packet.compensa!.expansaoEsperada).toBe("number")
    expect(typeof packet.compensa!.retracaoEstimada).toBe("number")
    expect(typeof packet.compensa!.balancoCRC).toBe("number")
  })

  it("preenche secao nivelix", () => {
    expect(packet.nivelix).toBeDefined()
    expect(packet.nivelix!.espalhamento).toBeGreaterThan(0)
    expect(packet.nivelix!.viscosidadePlastica).toBeGreaterThan(0)
    expect(packet.nivelix!.tensaoEscoamento).toBeGreaterThan(0)
    expect(["OK", "RISCO", "CRITICO"]).toContain(packet.nivelix!.status)
  })

  it("preenche secao ecorisk", () => {
    expect(packet.ecorisk).toBeDefined()
    expect(packet.ecorisk!.score).toBeGreaterThanOrEqual(0)
    expect(packet.ecorisk!.score).toBeLessThanOrEqual(100)
    expect(["BAIXO", "MEDIO", "ALTO", "CRITICO"]).toContain(packet.ecorisk!.nivel)
    expect(Array.isArray(packet.ecorisk!.fatores)).toBe(true)
    expect(Array.isArray(packet.ecorisk!.recomendacoes)).toBe(true)
    expect(packet.ecorisk!.recomendacoes.length).toBeGreaterThan(0)
  })

  it("nao preenche secao aion (nao implementado)", () => {
    expect(packet.aion).toBeUndefined()
  })
})

describe("runPipeline sem AE", () => {
  const input: MixInput = {
    cimentoType: "CP II-E-40",
    fck: 25,
    ac: 0.55,
    slump: 120,
    consumoCimento: 320,
    consumoAgua: 176,
    consumoAreia: 800,
    consumoBrita: 1020,
  }

  const packet = runPipeline(input)

  it("compensa status CRITICO sem AE", () => {
    expect(packet.compensa).toBeDefined()
    expect(packet.compensa!.status).toBe("CRITICO")
    expect(packet.compensa!.teorAgente).toBe(0)
  })

  it("ecorisk funciona com traco simples", () => {
    expect(packet.ecorisk).toBeDefined()
    expect(packet.ecorisk!.score).toBeGreaterThanOrEqual(0)
  })
})
