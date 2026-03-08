import { describe, it, expect } from "vitest"
import { cpmSolver } from "./cpm"
import type { MaterialCPM } from "./cpm"

describe("cpmSolver", () => {
  it("CASO A — dois materiais equilibrados: phi entre 0.60 e 0.85", () => {
    const materiais: MaterialCPM[] = [
      { nome: "areia", d50: 0.6, densidade: 2.62, teor: 0.4 },
      { nome: "brita", d50: 12.5, densidade: 2.70, teor: 0.6 },
    ]
    const resultado = cpmSolver(materiais)
    expect(resultado.phi).toBeGreaterThanOrEqual(0.60)
    expect(resultado.phi).toBeLessThanOrEqual(0.85)
  })

  it("empacotamentoReal <= phi", () => {
    const materiais: MaterialCPM[] = [
      { nome: "areia", d50: 0.6, densidade: 2.62, teor: 0.4 },
      { nome: "brita", d50: 12.5, densidade: 2.70, teor: 0.6 },
    ]
    const resultado = cpmSolver(materiais)
    expect(resultado.empacotamentoReal).toBeLessThanOrEqual(resultado.phi)
  })

  it("retorna material dominante", () => {
    const materiais: MaterialCPM[] = [
      { nome: "areia", d50: 0.6, densidade: 2.62, teor: 0.4 },
      { nome: "brita", d50: 12.5, densidade: 2.70, teor: 0.6 },
    ]
    const resultado = cpmSolver(materiais)
    expect(["areia", "brita"]).toContain(resultado.materialDominante)
  })

  it("CASO B — teores nao somam 1.0: lanca erro descritivo", () => {
    const materiais: MaterialCPM[] = [
      { nome: "areia", d50: 0.6, densidade: 2.62, teor: 0.3 },
      { nome: "brita", d50: 12.5, densidade: 2.70, teor: 0.3 },
    ]
    expect(() => cpmSolver(materiais)).toThrow(/soma/i)
  })

  it("lanca erro com lista vazia", () => {
    expect(() => cpmSolver([])).toThrow()
  })

  it("funciona com 3 materiais", () => {
    const materiais: MaterialCPM[] = [
      { nome: "filler", d50: 0.01, densidade: 2.80, teor: 0.1 },
      { nome: "areia", d50: 0.6, densidade: 2.62, teor: 0.35 },
      { nome: "brita", d50: 12.5, densidade: 2.70, teor: 0.55 },
    ]
    const resultado = cpmSolver(materiais)
    expect(resultado.phi).toBeGreaterThan(0)
    expect(resultado.phi).toBeLessThanOrEqual(0.95)
  })
})
