import { describe, it, expect } from "vitest"
import { predict, MODELO_PADRAO, DATASET } from "./index"

const BASE = {
  ac: 0.45,
  consumoCimento: 400,
  cimentoType: "CP V ARI",
  slump: 100,
  idadeDias: 28,
}

describe("CASO A — CP V ARI, a/c=0.40, 28 dias", () => {
  const result = predict({ ...BASE, ac: 0.40 })

  it("fcPredito entre 40 e 55 MPa", () => {
    expect(result.fcPredito).toBeGreaterThanOrEqual(40)
    expect(result.fcPredito).toBeLessThanOrEqual(55)
  })

  it("confianca >= 0.75", () => {
    expect(result.confianca).toBeGreaterThanOrEqual(0.75)
  })

  it("drift === false", () => {
    expect(result.drift).toBe(false)
  })

  it("intervalo[0] < fcPredito < intervalo[1]", () => {
    expect(result.intervalo[0]).toBeLessThan(result.fcPredito)
    expect(result.intervalo[1]).toBeGreaterThan(result.fcPredito)
  })
})

describe("CASO B — a/c=0.70, CP II-E, 7 dias", () => {
  const result = predict({
    ac: 0.70,
    consumoCimento: 243,
    cimentoType: "CP II-E",
    slump: 160,
    idadeDias: 7,
  })

  it("fcPredito < 20 MPa", () => {
    expect(result.fcPredito).toBeLessThan(20)
  })

  it("drift === true", () => {
    expect(result.drift).toBe(true)
  })
})

describe("CASO C — efeito sílica ativa", () => {
  it("fc com sílica > fc sem sílica", () => {
    const fcSem = predict({ ...BASE, silicaAtiva: undefined }).fcPredito
    const fcCom = predict({ ...BASE, silicaAtiva: 0.10 }).fcPredito
    expect(fcCom).toBeGreaterThan(fcSem)
  })
})

describe("CASO D — modelo treinado com R² aceitável", () => {
  it("R² > 0.85", () => {
    expect(MODELO_PADRAO.r2).toBeGreaterThan(0.85)
  })

  it("RMSE < 8 MPa", () => {
    expect(MODELO_PADRAO.rmse).toBeLessThan(8)
  })

  it("nAmostras >= 200", () => {
    expect(MODELO_PADRAO.nAmostras).toBeGreaterThanOrEqual(200)
  })
})

describe("CASO E — IC coerente", () => {
  const result = predict({ ...BASE })

  it("spread < 20 MPa", () => {
    const spread = result.intervalo[1] - result.intervalo[0]
    expect(spread).toBeLessThan(20)
  })

  it("intervalo[0] > 0", () => {
    expect(result.intervalo[0]).toBeGreaterThan(0)
  })
})

describe("CASO F — idade afeta predição", () => {
  it("fc 28d > fc 7d", () => {
    const fc7d = predict({ ...BASE, idadeDias: 7 }).fcPredito
    const fc28d = predict({ ...BASE, idadeDias: 28 }).fcPredito
    expect(fc28d).toBeGreaterThan(fc7d)
  })
})

describe("Dataset", () => {
  it("tem exatamente 200 amostras", () => {
    expect(DATASET.length).toBe(200)
  })

  it("todas amostras têm fcMedido > 0", () => {
    DATASET.forEach(a => {
      expect(a.fcMedido).toBeGreaterThan(0)
    })
  })
})
