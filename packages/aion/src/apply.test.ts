// AION CORE — Validacao do modelo Abrams + correcoes + drift
//
// Ref: Abrams, D.A. (1918). Design of Concrete Mixtures. Bulletin 1, PCA.
//      Mehta, P.K. & Monteiro, P.J.M. (2014). Concrete, 4th ed.

import { describe, it, expect } from "vitest"
import { applyAion } from "./apply"
import type { ConcretePacket } from "@concrya/schemas"

function makePacket(overrides: {
  ac?: number
  fck?: number
  cimentoType?: string
  consumoCimento?: number
  consumoBrita?: number
  adicoes?: Record<string, number>
  compensa?: ConcretePacket["compensa"]
  nivelix?: ConcretePacket["nivelix"]
  ecorisk?: ConcretePacket["ecorisk"]
}): ConcretePacket {
  return {
    version: "1.0",
    id: "test-aion",
    timestamp: new Date().toISOString(),
    mix: {
      cimentoType: overrides.cimentoType ?? "CP V ARI",
      fck: overrides.fck ?? 40,
      ac: overrides.ac ?? 0.42,
      slump: 200,
      consumoCimento: overrides.consumoCimento ?? 380,
      consumoAgua: 160,
      consumoAreia: 750,
      consumoBrita: overrides.consumoBrita ?? 950,
      adicoes: overrides.adicoes,
    },
    compensa: overrides.compensa,
    nivelix: overrides.nivelix,
    ecorisk: overrides.ecorisk,
  }
}

describe("applyAion — modelo Abrams + correcoes", () => {
  // ── CASO A: traco saudavel CP V ARI fck40, ac=0.40 ─────────
  describe("CASO A — CP V ARI fck=40, ac=0.40 (saudavel)", () => {
    const packet = makePacket({ ac: 0.40, fck: 40, cimentoType: "CP V ARI" })
    const result = applyAion(packet)

    it("fcPredito entre 35 e 60 MPa", () => {
      expect(result.aion!.fcPredito).toBeGreaterThanOrEqual(35)
      expect(result.aion!.fcPredito).toBeLessThanOrEqual(60)
    })

    it("confianca >= 0.70", () => {
      expect(result.aion!.confianca).toBeGreaterThanOrEqual(0.70)
    })

    it("drift === false", () => {
      expect(result.aion!.drift).toBe(false)
    })

    it("modelo === predict-v1", () => {
      expect(result.aion!.modelo).toBe("predict-v1")
    })
  })

  // ── CASO B: traco fraco ac=0.70, fck=25 ────────────────────
  describe("CASO B — ac=0.70, fck=25 (traco fraco)", () => {
    const packet = makePacket({ ac: 0.70, fck: 25, cimentoType: "CP V ARI" })
    const result = applyAion(packet)

    it("fcPredito < 25 MPa", () => {
      expect(result.aion!.fcPredito).toBeLessThan(25)
    })

    it("drift === true (ac > 0.65)", () => {
      expect(result.aion!.drift).toBe(true)
    })
  })

  // ── CASO C: silica ativa aumenta fc ─────────────────────────
  describe("CASO C — silica ativa aumenta fc", () => {
    const packetSem = makePacket({ ac: 0.42, fck: 40 })
    const packetCom = makePacket({ ac: 0.42, fck: 40, adicoes: { silica_ativa: 38 } })

    const resultSem = applyAion(packetSem)
    const resultCom = applyAion(packetCom)

    it("fc com silica > fc sem silica", () => {
      expect(resultCom.aion!.fcPredito).toBeGreaterThan(resultSem.aion!.fcPredito)
    })
  })

  // ── CASO D: ecorisk critico reduz confianca ─────────────────
  describe("CASO D — ecorisk score=80 reduz confianca", () => {
    const packet = makePacket({
      ac: 0.42,
      fck: 40,
      ecorisk: {
        score: 80,
        nivel: "CRITICO",
        fatores: ["durabilidade"],
        recomendacoes: ["Reduzir a/c"],
      },
    })
    const result = applyAion(packet)

    it("confianca < 0.80", () => {
      expect(result.aion!.confianca).toBeLessThan(0.80)
    })
  })

  // ── CASO E: imutabilidade ───────────────────────────────────
  describe("CASO E — imutabilidade (funcao pura)", () => {
    const packet = makePacket({ ac: 0.42, fck: 40 })

    it("nao muta o packet original", () => {
      expect(packet.aion).toBeUndefined()
      const resultado = applyAion(packet)
      expect(packet.aion).toBeUndefined()
      expect(resultado.aion).toBeDefined()
    })
  })
})
