// Pipeline E2E — Validacao com dados reais
//
// Traco NIVELIX OS para Chimica Edile (referencia interna).
// Argamassa autonivelante RC: CP V ARI, fck=40, a/c=0.40, sem brita.
//
// Ref: Chimica Edile — Formulacoes de referencia internas.
//      ACI 223R-10: Guide for Shrinkage-Compensating Concrete.

import { describe, it, expect } from "vitest"
import { runPipeline } from "./pipeline"
import type { MixInput } from "@concrya/schemas"

// Traco real: argamassa autonivelante RC para Chimica Edile
const TRACO_NIVELIX_OS: MixInput = {
  cimentoType: "CP V ARI",
  fck: 40,
  ac: 0.40,
  slump: 220,             // espalhamento autonivelante (mini-cone)
  consumoCimento: 450,
  consumoAgua: 180,        // 450 * 0.40
  consumoAreia: 700,
  consumoBrita: 0,         // argamassa — sem brita
  adicoes: {
    silica_ativa: 45,      // 10% silica ativa
    csa: 32,               // AE tipo CSA (sulfoaluminato)
    agente_expansivo: 32,  // convencao do apply
  },
  project: "NIVELIX OS — Chimica Edile",
}

describe("Pipeline E2E — Traco NIVELIX OS (Chimica Edile)", () => {
  const packet = runPipeline(TRACO_NIVELIX_OS)

  // ── Campos obrigatorios ──────────────────────────────────────
  it("version === 1.0", () => {
    expect(packet.version).toBe("1.0")
  })

  it("id presente e nao vazio", () => {
    expect(packet.id).toBeTruthy()
    expect(packet.id.length).toBeGreaterThan(5)
  })

  it("timestamp ISO 8601 valido", () => {
    expect(packet.timestamp).toBeTruthy()
    const ts = new Date(packet.timestamp)
    expect(ts.getTime()).toBeGreaterThan(0)
  })

  it("project registrado", () => {
    expect(packet.project).toBe("NIVELIX OS — Chimica Edile")
  })

  it("mix preservado integralmente", () => {
    expect(packet.mix.cimentoType).toBe("CP V ARI")
    expect(packet.mix.fck).toBe(40)
    expect(packet.mix.ac).toBe(0.40)
    expect(packet.mix.slump).toBe(220)
    expect(packet.mix.consumoCimento).toBe(450)
    expect(packet.mix.consumoAgua).toBe(180)
    expect(packet.mix.consumoAreia).toBe(700)
    expect(packet.mix.consumoBrita).toBe(0)
  })

  // ── Secao compensa ──────────────────────────────────────────
  it("compensa preenchido com status definido", () => {
    expect(packet.compensa).toBeDefined()
    expect(packet.compensa!.status).toBeDefined()
    expect(["OK", "RISCO", "CRITICO"]).toContain(packet.compensa!.status)
  })

  it("compensa: AE CSA detectado como tipo_k", () => {
    expect(packet.compensa!.agenteExpansivo).toBe("tipo_k")
  })

  it("compensa: expansao > 0 (AE presente)", () => {
    expect(packet.compensa!.expansaoEsperada).toBeGreaterThan(0)
  })

  // ── Secao nivelix ───────────────────────────────────────────
  it("nivelix preenchido", () => {
    expect(packet.nivelix).toBeDefined()
  })

  it("nivelix: espalhamento >= 200mm (argamassa autonivelante)", () => {
    // Argamassa sem brita, slump=220 → modelo mini-cone
    expect(packet.nivelix!.espalhamento).toBeGreaterThanOrEqual(200)
  })

  it("nivelix: tensaoEscoamento < 400 Pa", () => {
    // Slump 220mm → tau0 ≈ (300-220)/0.27 ≈ 296 Pa
    expect(packet.nivelix!.tensaoEscoamento).toBeLessThan(400)
  })

  it("nivelix: moduloAcustico definido (argamassa)", () => {
    // consumoBrita=0 → isArgamassa=true → moduloAcustico preenchido
    expect(packet.nivelix!.moduloAcustico).toBeDefined()
  })

  // ── Secao ecorisk ───────────────────────────────────────────
  it("ecorisk preenchido", () => {
    expect(packet.ecorisk).toBeDefined()
  })

  it("ecorisk: score entre 0 e 100", () => {
    expect(packet.ecorisk!.score).toBeGreaterThanOrEqual(0)
    expect(packet.ecorisk!.score).toBeLessThanOrEqual(100)
  })

  it("ecorisk: nivel valido", () => {
    expect(["BAIXO", "MEDIO", "ALTO", "CRITICO"]).toContain(packet.ecorisk!.nivel)
  })

  it("ecorisk: recomendacoes nao vazio", () => {
    expect(packet.ecorisk!.recomendacoes.length).toBeGreaterThan(0)
  })

  // ── Secao aion ─────────────────────────────────────────────
  it("aion preenchido", () => {
    expect(packet.aion).toBeDefined()
  })

  it("aion: fcPredito > 0", () => {
    expect(packet.aion!.fcPredito).toBeGreaterThan(0)
  })

  it("aion: confianca entre 0.40 e 0.98", () => {
    expect(packet.aion!.confianca).toBeGreaterThanOrEqual(0.40)
    expect(packet.aion!.confianca).toBeLessThanOrEqual(0.98)
  })

  it("aion: modelo === abrams-v1", () => {
    expect(packet.aion!.modelo).toBe("abrams-v1")
  })

  // ── Imutabilidade (funcao pura) ─────────────────────────────
  it("pipeline nao modifica o input original", () => {
    const inputCopy = JSON.parse(JSON.stringify(TRACO_NIVELIX_OS)) as MixInput
    runPipeline(TRACO_NIVELIX_OS)
    expect(TRACO_NIVELIX_OS).toEqual(inputCopy)
  })
})
