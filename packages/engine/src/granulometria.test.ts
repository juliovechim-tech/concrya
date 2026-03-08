import { describe, it, expect } from "vitest"
import { fuller, faury, bolomey, andreasenMulcahy, PENEIRAS_ABNT } from "./granulometria"

describe("Fuller", () => {
  it("CASO A — Dmax=25mm: cpft em 25mm === 100", () => {
    const curva = fuller(25)
    const p25 = curva.find(p => p.peneira === 25)
    expect(p25).toBeDefined()
    expect(p25!.cpft).toBe(100)
  })

  it("cpft em peneira 0.15mm < 10", () => {
    const curva = fuller(25)
    const p015 = curva.find(p => p.peneira === 0.15)
    expect(p015).toBeDefined()
    expect(p015!.cpft).toBeLessThan(10)
  })

  it("curva monotonicamente crescente (peneira crescente → cpft crescente)", () => {
    const curva = fuller(25)
    const sorted = [...curva].sort((a, b) => a.peneira - b.peneira)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].cpft).toBeGreaterThanOrEqual(sorted[i - 1].cpft)
    }
  })

  it("metodo é Fuller", () => {
    const curva = fuller(25)
    expect(curva[0].metodo).toBe("Fuller")
  })
})

describe("Faury", () => {
  it("retorna pontos validos", () => {
    const curva = faury(25)
    expect(curva.length).toBeGreaterThan(0)
    curva.forEach(p => {
      expect(p.cpft).toBeGreaterThanOrEqual(0)
      expect(p.cpft).toBeLessThanOrEqual(100)
    })
  })

  it("metodo é Faury", () => {
    const curva = faury(25)
    expect(curva[0].metodo).toBe("Faury")
  })
})

describe("Bolomey", () => {
  it("retorna pontos validos", () => {
    const curva = bolomey(25)
    expect(curva.length).toBeGreaterThan(0)
    curva.forEach(p => {
      expect(p.cpft).toBeGreaterThanOrEqual(0)
      expect(p.cpft).toBeLessThanOrEqual(100)
    })
  })

  it("metodo é Bolomey", () => {
    const curva = bolomey(25)
    expect(curva[0].metodo).toBe("Bolomey")
  })
})

describe("Andreasen-Mulcahy", () => {
  it("CASO B — q=0.25 tem mais finos que q=0.45", () => {
    const curvaQ025 = andreasenMulcahy(25, 0.075, 0.25)
    const curvaQ045 = andreasenMulcahy(25, 0.075, 0.45)

    // Comparar em peneira fina (0.3mm)
    const p025 = curvaQ025.find(p => p.peneira === 0.3)
    const p045 = curvaQ045.find(p => p.peneira === 0.3)

    expect(p025).toBeDefined()
    expect(p045).toBeDefined()
    expect(p025!.cpft).toBeGreaterThan(p045!.cpft)
  })

  it("metodo é Andreasen", () => {
    const curva = andreasenMulcahy(25, 0.075, 0.37)
    expect(curva[0].metodo).toBe("Andreasen")
  })

  it("curva monotonicamente crescente (peneira crescente → cpft crescente)", () => {
    const curva = andreasenMulcahy(25, 0.075, 0.37)
    const sorted = [...curva].sort((a, b) => a.peneira - b.peneira)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].cpft).toBeGreaterThanOrEqual(sorted[i - 1].cpft)
    }
  })

  it("lanca erro se Dmax <= Dmin", () => {
    expect(() => andreasenMulcahy(0.075, 0.075, 0.37)).toThrow()
  })
})

describe("PENEIRAS_ABNT", () => {
  it("contem serie completa NBR NM 248", () => {
    expect(PENEIRAS_ABNT).toContain(25)
    expect(PENEIRAS_ABNT).toContain(9.5)
    expect(PENEIRAS_ABNT).toContain(4.8)
    expect(PENEIRAS_ABNT).toContain(0.15)
    expect(PENEIRAS_ABNT).toContain(0.075)
  })
})
