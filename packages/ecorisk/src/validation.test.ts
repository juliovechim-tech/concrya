// ECORISK — Validacao cientifica
//
// Ref: Derringer, G. & Suich, R. (1980). J. Quality Technology, 12(4), 214-219.
//      Damineli, B.L. et al. (2010). Cem. Concr. Composites, 32(8), 555-562.
//      GCCA (2022). CO2 and Energy Protocol — fator clinquer 0.83 kg CO2/kg.
//      NBR 6118:2023 — Classes de agressividade e limites de a/c.

import { describe, it, expect } from "vitest"
import { applyEcorisk } from "./apply"
import type { ConcretePacket } from "@concrya/schemas"

/** Helper para criar ConcretePacket de teste */
function makePacket(overrides: {
  ac?: number
  fck?: number
  consumoCimento?: number
  consumoAgua?: number
  consumoAreia?: number
  consumoBrita?: number
  slump?: number
  cimentoType?: string
  adicoes?: Record<string, number>
}): ConcretePacket {
  const ac = overrides.ac ?? 0.42
  const consumoCimento = overrides.consumoCimento ?? 380
  return {
    version: "1.0",
    id: "test-ecorisk",
    timestamp: new Date().toISOString(),
    mix: {
      cimentoType: overrides.cimentoType ?? "CP V ARI",
      fck: overrides.fck ?? 40,
      ac,
      slump: overrides.slump ?? 200,
      consumoCimento,
      consumoAgua: overrides.consumoAgua ?? consumoCimento * ac,
      consumoAreia: overrides.consumoAreia ?? 750,
      consumoBrita: overrides.consumoBrita ?? 950,
      adicoes: overrides.adicoes,
    },
  }
}

describe("applyEcorisk — validacao Derringer-Suich", () => {
  // ── CASO A: traco equilibrado, baixo risco ───────────────────
  describe("CASO A — traco equilibrado (a/c=0.42, fck=40)", () => {
    const packet = makePacket({
      ac: 0.42,
      fck: 40,
      consumoCimento: 380,
      slump: 200,
      adicoes: { escoria: 50 }, // substituicao parcial → melhor eco
    })
    const result = applyEcorisk(packet)

    it("score entre 0 e 100", () => {
      expect(result.ecorisk!.score).toBeGreaterThanOrEqual(0)
      expect(result.ecorisk!.score).toBeLessThanOrEqual(100)
    })

    it("nivel BAIXO ou MEDIO para traco equilibrado", () => {
      // a/c=0.42 < 0.60 (classe II), fck=40 com margem 10%
      expect(["BAIXO", "MEDIO"]).toContain(result.ecorisk!.nivel)
    })

    it("recomendacoes e array nao vazio", () => {
      expect(Array.isArray(result.ecorisk!.recomendacoes)).toBe(true)
      expect(result.ecorisk!.recomendacoes.length).toBeGreaterThan(0)
    })

    it("fatores e array", () => {
      expect(Array.isArray(result.ecorisk!.fatores)).toBe(true)
    })
  })

  // ── CASO B: traco critico, multiplos riscos ──────────────────
  describe("CASO B — traco critico (a/c=0.65, fck=20, alto cimento)", () => {
    const packet = makePacket({
      ac: 0.65,
      fck: 20,
      consumoCimento: 450,     // alto consumo para fck baixo → binder index ruim
      consumoAgua: 292,        // 450 * 0.65
      slump: 100,
    })
    const result = applyEcorisk(packet)

    it("score mais alto que traco equilibrado (mais risco = score menor em Dw)", () => {
      // Score ecorisk = Dw * 100. Dw menor = pior
      // Traco critico deve ter score menor
      const packetBom = makePacket({ ac: 0.42, fck: 40, consumoCimento: 350 })
      const resultBom = applyEcorisk(packetBom)
      expect(result.ecorisk!.score).toBeLessThan(resultBom.ecorisk!.score)
    })

    it("binder index alto detectado (450/20 = 22.5 kg/MPa)", () => {
      // BI > 10 → recomendacao "Reduzir consumo de cimento ou aumentar fck"
      expect(result.ecorisk!.recomendacoes.some(r =>
        r.toLowerCase().includes("cimento") || r.toLowerCase().includes("fck")
      )).toBe(true)
    })

    it("fatores de risco identificados (>= 1)", () => {
      // a/c=0.65 vs classe II max 0.60 → durabilidade em risco
      expect(result.ecorisk!.fatores.length).toBeGreaterThanOrEqual(1)
    })

    it("nivel MEDIO, ALTO ou CRITICO", () => {
      expect(["MEDIO", "ALTO", "CRITICO"]).toContain(result.ecorisk!.nivel)
    })
  })

  // ── CASO C: reprodutibilidade (funcao pura) ──────────────────
  describe("CASO C — reprodutibilidade (determinismo)", () => {
    const packet = makePacket({ ac: 0.45, fck: 35, consumoCimento: 360 })

    it("mesmo input → mesmo score (funcao pura)", () => {
      const r1 = applyEcorisk(packet)
      const r2 = applyEcorisk(packet)
      expect(r1.ecorisk!.score).toBe(r2.ecorisk!.score)
    })

    it("mesmo input → mesmo nivel", () => {
      const r1 = applyEcorisk(packet)
      const r2 = applyEcorisk(packet)
      expect(r1.ecorisk!.nivel).toBe(r2.ecorisk!.nivel)
    })

    it("mesmo input → mesmos fatores", () => {
      const r1 = applyEcorisk(packet)
      const r2 = applyEcorisk(packet)
      expect(r1.ecorisk!.fatores).toEqual(r2.ecorisk!.fatores)
    })
  })

  // ── CASO D: score sempre no intervalo valido ─────────────────
  describe("CASO D — score no intervalo [0, 100] para 5 tracos", () => {
    const acValues = [0.30, 0.40, 0.50, 0.60, 0.70]

    for (const ac of acValues) {
      it(`a/c=${ac} → score entre 0 e 100`, () => {
        const packet = makePacket({
          ac,
          fck: 30,
          consumoCimento: 350,
          consumoAgua: 350 * ac,
        })
        const result = applyEcorisk(packet)
        expect(result.ecorisk!.score).toBeGreaterThanOrEqual(0)
        expect(result.ecorisk!.score).toBeLessThanOrEqual(100)
      })
    }

    it("score com a/c=0.30 (otimo) > score com a/c=0.70 (ruim)", () => {
      const r030 = applyEcorisk(makePacket({ ac: 0.30, fck: 30, consumoCimento: 350 }))
      const r070 = applyEcorisk(makePacket({ ac: 0.70, fck: 30, consumoCimento: 350 }))
      // a/c baixo tem melhor durabilidade → Dw maior
      expect(r030.ecorisk!.score).toBeGreaterThan(r070.ecorisk!.score)
    })
  })
})
