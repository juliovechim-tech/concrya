// NIVELIX CORE — Validacao cientifica
//
// Ref: Roussel, N. (2006). Cem. Concr. Res. 36(10) — correlacao slump/tau0
//      Wallevik, O.H. (2003). Rheology as a tool in concrete science
//      NBR 15823: Concreto autoadensavel — Classificacao SF/VF/PL
//      EN 12706: Self-levelling compounds — Determination of flow

import { describe, it, expect } from "vitest"
import { applyNivelix } from "./apply"
import type { ConcretePacket } from "@concrya/schemas"

/** Helper para criar ConcretePacket de teste */
function makePacket(overrides: {
  slump?: number
  ac?: number
  consumoCimento?: number
  consumoBrita?: number
}): ConcretePacket {
  const ac = overrides.ac ?? 0.40
  const consumoCimento = overrides.consumoCimento ?? 450
  return {
    version: "1.0",
    id: "test-nivelix",
    timestamp: new Date().toISOString(),
    mix: {
      cimentoType: "CP V ARI",
      fck: 40,
      ac,
      slump: overrides.slump ?? 220,
      consumoCimento,
      consumoAgua: consumoCimento * ac,
      consumoAreia: 750,
      consumoBrita: overrides.consumoBrita ?? 950,
    },
  }
}

describe("applyNivelix — validacao reologica", () => {
  // ── CASO A: argamassa autonivelante padrao ───────────────────
  describe("CASO A — autonivelante padrao (slump=220, concreto)", () => {
    const packet = makePacket({ slump: 220, ac: 0.40, consumoCimento: 450 })
    const result = applyNivelix(packet)

    it("espalhamento estimado entre 150 e 350 mm", () => {
      // Roussel (2006): slump 220mm → tau0 ~296 Pa → espalhamento moderado
      expect(result.nivelix!.espalhamento).toBeGreaterThan(150)
      expect(result.nivelix!.espalhamento).toBeLessThan(350)
    })

    it("tensaoEscoamento < 400 Pa para slump 220", () => {
      // Roussel: tau0 = (300 - 220) / 0.27 ≈ 296 Pa
      expect(result.nivelix!.tensaoEscoamento).toBeLessThan(400)
      expect(result.nivelix!.tensaoEscoamento).toBeGreaterThan(100)
    })

    it("viscosidadePlastica entre 1 e 30 Pa·s", () => {
      // Wallevik (2003): concreto tipico mu_p = 5-60 Pa·s
      expect(result.nivelix!.viscosidadePlastica).toBeGreaterThanOrEqual(1)
      expect(result.nivelix!.viscosidadePlastica).toBeLessThanOrEqual(30)
    })

    it("status definido", () => {
      expect(["OK", "RISCO", "CRITICO"]).toContain(result.nivelix!.status)
    })
  })

  // ── CASO B: traco rigido (nao autonivelante) ─────────────────
  describe("CASO B — traco rigido (slump=80)", () => {
    const packet = makePacket({ slump: 80, ac: 0.38, consumoCimento: 380 })
    const result = applyNivelix(packet)

    it("espalhamento baixo (slump baixo → tau0 alto → pouco espalhamento)", () => {
      // tau0 = (300-80)/0.27 ≈ 815 Pa → espalhamento pequeno
      expect(result.nivelix!.espalhamento).toBeLessThan(200)
    })

    it("status RISCO ou CRITICO", () => {
      expect(["RISCO", "CRITICO"]).toContain(result.nivelix!.status)
    })

    it("tensaoEscoamento alta (> 500 Pa)", () => {
      // Roussel: tau0 ≈ 815 Pa para slump 80mm
      expect(result.nivelix!.tensaoEscoamento).toBeGreaterThan(500)
    })
  })

  // ── CASO C: modulo acustico para argamassa ──────────────────
  describe("CASO C — argamassa (sem brita) moduloAcustico", () => {
    const packet = makePacket({
      slump: 220,
      ac: 0.42,
      consumoCimento: 430,
      consumoBrita: 0,  // argamassa — sem brita
    })
    const result = applyNivelix(packet)

    it("moduloAcustico undefined quando massaSup < 100 kg/m2 (dB negativo)", () => {
      // massaSup = 0.030 * 2100 = 63 kg/m2 → deltaLw = 20*log10(63/100) ≈ -4 dB
      // dB <= 0 → retorna undefined (fisicamente nao faz sentido reducao negativa)
      expect(result.nivelix!.moduloAcustico).toBeUndefined()
    })

    it("concreto com brita NAO tem moduloAcustico", () => {
      const packetConcreto = makePacket({ consumoBrita: 950 })
      const resultConcreto = applyNivelix(packetConcreto)
      expect(resultConcreto.nivelix!.moduloAcustico).toBeUndefined()
    })
  })

  // ── CASO D: consistencia Bingham — ac maior → mu menor ──────
  describe("CASO D — a/c maior reduz viscosidade (Wallevik 2003)", () => {
    const packetLow = makePacket({ ac: 0.38, slump: 200 })
    const packetHigh = makePacket({ ac: 0.48, slump: 200 })
    const resultLow = applyNivelix(packetLow)
    const resultHigh = applyNivelix(packetHigh)

    it("viscosidade com a/c=0.48 < viscosidade com a/c=0.38", () => {
      // Wallevik: mu_p ≈ 8 + 120*(0.55 - ac)
      // ac=0.38 → mu ≈ 28.4
      // ac=0.48 → mu ≈ 16.4
      expect(resultHigh.nivelix!.viscosidadePlastica).toBeLessThan(
        resultLow.nivelix!.viscosidadePlastica
      )
    })

    it("tensaoEscoamento igual para mesmo slump (depende so do slump)", () => {
      // tau0FromSlump depende apenas do slump, nao de a/c
      expect(resultHigh.nivelix!.tensaoEscoamento).toBe(
        resultLow.nivelix!.tensaoEscoamento
      )
    })
  })
})
