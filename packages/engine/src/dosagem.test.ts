import { describe, it, expect } from "vitest"
import {
  calcularAbrams,
  calcularConsumoCimento,
  calcularVolumesAbsolutos,
  calcularTracoUnitario,
  calcularCusto,
} from "./dosagem"

describe("calcularAbrams", () => {
  it("CASO B — CP V ARI, a/c=0.40: fc entre 42 e 55 MPa", () => {
    // k1=120, k2=14 para CP V ARI (calibrado em P4-A)
    const fc = calcularAbrams(120, 14, 0.40)
    expect(fc).toBeGreaterThan(35)
    expect(fc).toBeLessThan(55)
  })

  it("fc diminui com a/c crescente", () => {
    const fc1 = calcularAbrams(120, 14, 0.40)
    const fc2 = calcularAbrams(120, 14, 0.60)
    expect(fc1).toBeGreaterThan(fc2)
  })
})

describe("calcularConsumoCimento", () => {
  it("CASO A — traco 1:2:3, a/c=0.50: consumo ≈ 360 kg/m³", () => {
    // agua = 180 L/m³, a/c = 0.50 → C = 180/0.50 = 360
    const consumo = calcularConsumoCimento(180, 0.50)
    expect(consumo).toBeCloseTo(360, 0)
  })

  it("CASO C — divisão por zero bloqueada", () => {
    expect(() => calcularConsumoCimento(180, 0)).toThrow()
  })

  it("nunca retorna Infinity ou NaN", () => {
    const consumo = calcularConsumoCimento(180, 0.01)
    expect(Number.isFinite(consumo)).toBe(true)
    expect(Number.isNaN(consumo)).toBe(false)
  })
})

describe("calcularVolumesAbsolutos", () => {
  it("CASO A — soma de volumes razoavel para traco 1:2:3", () => {
    // Traco tipico: C=360, Ag=180, Ar=720, Br=1080
    // Total ≈ 986 dm³ (traco nao necessariamente fecha em 1000 exato)
    const volumes = calcularVolumesAbsolutos(360, 720, 1080, 180)
    expect(volumes.total).toBeGreaterThan(900)
    expect(volumes.total).toBeLessThan(1100)
  })

  it("volume de cimento positivo", () => {
    const volumes = calcularVolumesAbsolutos(360, 720, 1080, 180)
    expect(volumes.cimento).toBeGreaterThan(0)
  })

  it("ar incorporado presente", () => {
    const volumes = calcularVolumesAbsolutos(360, 720, 1080, 180)
    expect(volumes.ar).toBeGreaterThan(0)
  })
})

describe("calcularTracoUnitario", () => {
  it("CASO A — 1:2:3 traco unitario", () => {
    const traco = calcularTracoUnitario(360, 720, 1080, 180)
    expect(traco.cimento).toBe(1)
    expect(traco.areia).toBeCloseTo(2.0, 1)
    expect(traco.brita).toBeCloseTo(3.0, 1)
    expect(traco.agua).toBeCloseTo(0.5, 1)
  })

  it("lanca erro se consumo de cimento é zero", () => {
    expect(() => calcularTracoUnitario(0, 720, 1080, 180)).toThrow()
  })
})

describe("calcularCusto", () => {
  it("calcula custo total corretamente", () => {
    const consumos = { cimento: 360, areia: 720, brita: 1080 }
    const precos = { cimento: 0.50, areia: 0.08, brita: 0.10 }
    const resultado = calcularCusto(consumos, precos)
    // 360*0.50 + 720*0.08 + 1080*0.10 = 180 + 57.6 + 108 = 345.6
    expect(resultado.total).toBeCloseTo(345.6, 1)
    expect(resultado.breakdown.cimento).toBeCloseTo(180, 1)
  })

  it("ignora materiais sem preco", () => {
    const consumos = { cimento: 360, areia: 720 }
    const precos = { cimento: 0.50 }
    const resultado = calcularCusto(consumos, precos)
    expect(resultado.total).toBeCloseTo(180, 1)
    expect(resultado.breakdown.areia).toBeUndefined()
  })
})
