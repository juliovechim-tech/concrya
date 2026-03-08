import { describe, it, expect } from "vitest";
import { calcMaturidade, type LeituraIoT } from "./maturidade";
import { calcCalorimetria } from "./calorimetria";

describe("calcMaturidade — Nurse-Saul + Arrhenius", () => {
  // Leituras IoT simuladas: 0–72h, perfil térmico típico de concreto CP V ARI
  // Pico ~55°C em 12h (aceleração), decai para ~30°C em 72h
  const leituras: LeituraIoT[] = [
    { tempo_h: 0, temp_C: 22 },
    { tempo_h: 1, temp_C: 23 },
    { tempo_h: 2, temp_C: 25 },
    { tempo_h: 4, temp_C: 32 },
    { tempo_h: 6, temp_C: 40 },
    { tempo_h: 8, temp_C: 48 },
    { tempo_h: 10, temp_C: 53 },
    { tempo_h: 12, temp_C: 55 },
    { tempo_h: 16, temp_C: 52 },
    { tempo_h: 20, temp_C: 47 },
    { tempo_h: 24, temp_C: 42 },
    { tempo_h: 36, temp_C: 35 },
    { tempo_h: 48, temp_C: 32 },
    { tempo_h: 60, temp_C: 30 },
    { tempo_h: 72, temp_C: 28 },
  ];

  it("retorna maturidade Nurse-Saul positiva e crescente", () => {
    const r = calcMaturidade(leituras);
    expect(r.maturidade_Celsius_hora).toBeGreaterThan(0);
    // 72h com média ~38°C, T0=-10 → ~(48)*72 = ~3456 °C·h
    expect(r.maturidade_Celsius_hora).toBeGreaterThan(2000);
    expect(r.maturidade_Celsius_hora).toBeLessThan(5000);
  });

  it("retorna tempo equivalente Arrhenius > 0", () => {
    const r = calcMaturidade(leituras);
    expect(r.tempo_equivalente_h).toBeGreaterThan(0);
    // Temperaturas acima de 20°C → te > tempo real em parte
    // Mas misto de altas e baixas — te deve ser razoável
    expect(r.tempo_equivalente_h).toBeGreaterThan(50);
    expect(r.tempo_equivalente_h).toBeLessThan(500);
  });

  it("grau de hidratação entre 0 e 1", () => {
    const r = calcMaturidade(leituras);
    expect(r.grauHidratacao).toBeGreaterThan(0);
    expect(r.grauHidratacao).toBeLessThanOrEqual(1);
    // 72h com pico 55°C → alpha ~0.5–0.8
    expect(r.grauHidratacao).toBeGreaterThan(0.3);
  });

  it("curva tem mesma quantidade de pontos que leituras", () => {
    const r = calcMaturidade(leituras);
    expect(r.curva.length).toBe(leituras.length);
    // Curva é crescente
    for (let i = 1; i < r.curva.length; i++) {
      expect(r.curva[i].nurseSaul).toBeGreaterThanOrEqual(r.curva[i - 1].nurseSaul);
      expect(r.curva[i].arrhenius_te).toBeGreaterThanOrEqual(r.curva[i - 1].arrhenius_te);
    }
  });

  it("com menos de 2 leituras retorna zeros", () => {
    const r = calcMaturidade([{ tempo_h: 0, temp_C: 25 }]);
    expect(r.maturidade_Celsius_hora).toBe(0);
    expect(r.tempo_equivalente_h).toBe(0);
    expect(r.grauHidratacao).toBe(0);
    expect(r.curva.length).toBe(0);
  });

  it("temperatura constante 20°C → te ≈ tempo real", () => {
    const constLeituras: LeituraIoT[] = [
      { tempo_h: 0, temp_C: 20 },
      { tempo_h: 24, temp_C: 20 },
      { tempo_h: 48, temp_C: 20 },
    ];
    const r = calcMaturidade(constLeituras);
    // A 20°C (= Tr), fator Arrhenius ≈ 1 → te ≈ tempo real
    expect(r.tempo_equivalente_h).toBeCloseTo(48, 0);
    // Nurse-Saul: (20 - (-10)) * 48 = 30 * 48 = 1440
    expect(r.maturidade_Celsius_hora).toBeCloseTo(1440, 0);
  });
});

describe("calcCalorimetria", () => {
  it("CP V ARI — Qmax = 420 J/g", () => {
    const r = calcCalorimetria(0.5, 350, "CP V ARI");
    expect(r.qmax).toBe(420);
    expect(r.calor_especifico_J_g).toBeCloseTo(210, 0); // 0.5 × 420
    expect(r.calor_total_J).toBeCloseTo(210 * 350 * 1000, -3);
    expect(r.fase).toBe("DESACELERACAO"); // alpha=0.5 → 0.30–0.70
    expect(r.taxa_pico_J_g_h).toBeCloseTo(14.7, 0); // 0.035 × 420
  });

  it("CP III — Qmax = 310 J/g", () => {
    const r = calcCalorimetria(0.02, 400, "CP III");
    expect(r.qmax).toBe(310);
    expect(r.fase).toBe("INDUCAO"); // alpha < 0.05
  });

  it("fase ACELERACAO para alpha 0.15", () => {
    const r = calcCalorimetria(0.15, 350, "CP V ARI");
    expect(r.fase).toBe("ACELERACAO");
  });

  it("fase DIFUSAO para alpha 0.85", () => {
    const r = calcCalorimetria(0.85, 350, "CP V ARI");
    expect(r.fase).toBe("DIFUSAO");
  });

  it("tipo desconhecido usa Qmax default 380", () => {
    const r = calcCalorimetria(1.0, 300, "CP ESPECIAL");
    expect(r.qmax).toBe(380);
    expect(r.calor_especifico_J_g).toBeCloseTo(380, 0);
  });
});
