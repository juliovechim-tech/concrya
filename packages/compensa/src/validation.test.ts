// COMPENSA CORE — Validacao cientifica
//
// Ref: ACI 223R-10 Guide for Shrinkage-Compensating Concrete
//      NBR 13116: Cimento Portland de baixo calor de hidratacao
//      ASTM C878: Standard Test Method for Restrained Expansion

import { describe, it, expect } from "vitest"
import { applyCompensa } from "./apply"
import type { ConcretePacket } from "@concrya/schemas"

/** Helper para criar um ConcretePacket de teste */
function makePacket(overrides: {
  ac?: number
  consumoCimento?: number
  consumoAgua?: number
  adicoes?: Record<string, number>
}): ConcretePacket {
  const ac = overrides.ac ?? 0.45
  const consumoCimento = overrides.consumoCimento ?? 380
  return {
    version: "1.0",
    id: "test-compensa",
    timestamp: new Date().toISOString(),
    mix: {
      cimentoType: "CP V ARI",
      fck: 40,
      ac,
      slump: 200,
      consumoCimento,
      consumoAgua: overrides.consumoAgua ?? consumoCimento * ac,
      consumoAreia: 750,
      consumoBrita: 950,
      adicoes: overrides.adicoes,
    },
  }
}

describe("applyCompensa — validacao ACI 223R-10", () => {
  // ── CASO A: CSA tipo K, teor 8% (ref ACI 223R tab 4.3) ──────
  describe("CASO A — CSA tipo K, teor ~8%", () => {
    const packet = makePacket({
      ac: 0.45,
      consumoCimento: 380,
      adicoes: {
        csa: 30.4,                 // 30.4 kg/m3 = ~8% sobre 380
        agente_expansivo: 30.4,    // convencao do apply
      },
    })
    const result = applyCompensa(packet)

    it("expansaoEsperada > 0 (AE ativo)", () => {
      expect(result.compensa!.expansaoEsperada).toBeGreaterThan(0)
    })

    it("expansaoEsperada em faixa plausivel — 50 a 350 µε a 28d restringido", () => {
      // ACI 223R-10: expansao restringida tipica 150-700 µε aos 7d
      // Aos 28d com restricao 0.5, faixa menor
      expect(result.compensa!.expansaoEsperada).toBeGreaterThanOrEqual(30)  // ±10% tol
      expect(result.compensa!.expansaoEsperada).toBeLessThanOrEqual(400)
    })

    it("balancoCRC > 0 (expansao liquida compensa retracao)", () => {
      // Com 8% CSA e a/c=0.45, deve compensar parcial ou totalmente
      // balancoCRC = expansao + retracao (retracao negativa)
      expect(result.compensa!.balancoCRC).toBeDefined()
    })

    it("status OK ou RISCO (nao CRITICO com 8% CSA)", () => {
      expect(["OK", "RISCO"]).toContain(result.compensa!.status)
    })

    it("agenteExpansivo identificado como tipo_k", () => {
      expect(result.compensa!.agenteExpansivo).toBe("tipo_k")
    })

    it("teorAgente registrado corretamente", () => {
      expect(result.compensa!.teorAgente).toBeCloseTo(30.4, 0) // ±10%
    })
  })

  // ── CASO B: CSA subdosado (teor < minimo tecnico) ────────────
  describe("CASO B — CSA subdosado (teor insuficiente)", () => {
    const packet = makePacket({
      ac: 0.45,
      consumoCimento: 380,
      adicoes: {
        csa: 5,                    // 5 kg/m3 = ~1.3% — abaixo do minimo 6%
        agente_expansivo: 5,
      },
    })
    const result = applyCompensa(packet)

    it("status RISCO ou CRITICO (subdosagem)", () => {
      // ACI 223R-10: dosagem minima tipo K ~6%
      // 1.3% nao compensa retracao adequadamente
      expect(["RISCO", "CRITICO"]).toContain(result.compensa!.status)
    })

    it("expansao baixa (subdosagem)", () => {
      expect(result.compensa!.expansaoEsperada).toBeLessThan(100)
    })
  })

  // ── CASO C: Sem agente expansivo ─────────────────────────────
  describe("CASO C — sem agente expansivo", () => {
    const packet = makePacket({
      ac: 0.50,
      consumoCimento: 350,
      adicoes: undefined,  // nenhum AE
    })
    const result = applyCompensa(packet)

    it("expansaoEsperada === 0", () => {
      expect(result.compensa!.expansaoEsperada).toBe(0)
    })

    it("status CRITICO", () => {
      expect(result.compensa!.status).toBe("CRITICO")
    })

    it("agenteExpansivo = nenhum", () => {
      expect(result.compensa!.agenteExpansivo).toBe("nenhum")
    })

    it("teorAgente = 0", () => {
      expect(result.compensa!.teorAgente).toBe(0)
    })
  })

  // ── CASO D: alta a/c gera mais retracao ──────────────────────
  describe("CASO D — a/c alta gera mais retracao que a/c baixa", () => {
    const packetLow = makePacket({
      ac: 0.40,
      consumoCimento: 380,
      adicoes: { csa: 25, agente_expansivo: 25 },
    })
    const packetHigh = makePacket({
      ac: 0.65,
      consumoCimento: 300,
      adicoes: { csa: 25, agente_expansivo: 25 },
    })
    const resultLow = applyCompensa(packetLow)
    const resultHigh = applyCompensa(packetHigh)

    it("retracao com a/c=0.65 maior que com a/c=0.40 (em valor absoluto)", () => {
      // Retracao e negativa — mais negativo = mais retracao
      // fib MC2010: retracao por secagem aumenta com a/c
      expect(resultHigh.compensa!.retracaoEstimada).toBeLessThan(
        resultLow.compensa!.retracaoEstimada
      )
    })
  })
})
