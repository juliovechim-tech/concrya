/**
 * @file __tests__/thermocore.test.ts
 * @description Testes unitários — ThermoCore (Maturidade, Arrhenius, fck(t), Desforma)
 *
 * Cobertura: calcularAlphaMax, calcularDeltaTeArrhenius, calcularDeltaMaturidade,
 *            calcularAlphaFHP, predizFckTeCalibrado, predizFckCebFip,
 *            calibrarSuTauBeta, calcularTeDesforma, gerarCurvaMaturidade,
 *            executarThermoCore, error classes.
 */

import { describe, it, expect } from "vitest";

import {
  R_GAS,
  T_REF_K,
  T_DATUM_CELSIUS,
  EA_J_MOL,
  CALIBRACAO_DEFAULT,
  S_CEB_FIP,
  calcularAlphaMax,
  calcularDeltaTeArrhenius,
  calcularDeltaMaturidade,
  calcularAlphaFHP,
  predizFckTeCalibrado,
  predizFckCebFip,
  calibrarSuTauBeta,
  calcularTeDesforma,
  gerarCurvaMaturidade,
  executarThermoCore,
  ThermoCoreLeiturasInsuficientesError,
  ThermoCoreCalibraçãoInvalidaError,
  ThermoCoreRelacaoAcInvalidaError,
  type LeituraTemperatura,
  type ParamsCalibracao,
  type PontoCalibracao,
} from "../lib/thermocore";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

/** Calibração default CP V-ARI para testes */
const CAL_CPV: ParamsCalibracao = CALIBRACAO_DEFAULT.CP_V_ARI;

/** Gera leituras sintéticas: cura isotérmica a T_cura por duração_h */
function gerarLeiturasIsotermicas(
  T_cura_C: number,
  duracao_h: number,
  intervalo_h: number = 1,
): LeituraTemperatura[] {
  const leituras: LeituraTemperatura[] = [];
  for (let t = 0; t <= duracao_h; t += intervalo_h) {
    leituras.push({ tempo_h: t, temperatura_C: T_cura_C });
  }
  return leituras;
}

/** Gera leituras com pico térmico realista (simula concreto massa) */
function gerarLeiturasComPico(
  T_lanc: number,
  T_pico: number,
  T_final: number,
  duracao_h: number,
): LeituraTemperatura[] {
  const leituras: LeituraTemperatura[] = [];
  const t_pico = duracao_h * 0.2; // pico a 20% da duração

  for (let t = 0; t <= duracao_h; t += 1) {
    let T: number;
    if (t <= t_pico) {
      // Subida
      T = T_lanc + (T_pico - T_lanc) * (t / t_pico);
    } else {
      // Resfriamento
      const frac = (t - t_pico) / (duracao_h - t_pico);
      T = T_pico - (T_pico - T_final) * frac;
    }
    leituras.push({ tempo_h: t, temperatura_C: T });
  }
  return leituras;
}

/** Gera pontos de calibração realistas (usando o modelo Su/τ/β) */
function gerarPontosCalibracao(
  cal: ParamsCalibracao,
  idades_h: number[],
  ruido: number = 0,
): PontoCalibracao[] {
  return idades_h.map(te => ({
    te_h: te,
    fck_MPa: cal.Su_MPa * Math.exp(-Math.pow(cal.tau_h / te, cal.beta))
      + (Math.random() - 0.5) * ruido,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

describe("ThermoCore — Constantes", () => {
  it("R_GAS = 8.314 J/(mol·K)", () => {
    expect(R_GAS).toBe(8.314);
  });

  it("T_REF_K = 293.15 K (20°C)", () => {
    expect(T_REF_K).toBe(293.15);
  });

  it("T_DATUM_CELSIUS = -10°C (Nurse-Saul)", () => {
    expect(T_DATUM_CELSIUS).toBe(-10);
  });

  it("EA_J_MOL contém 7 tipos de cimento", () => {
    expect(Object.keys(EA_J_MOL)).toHaveLength(7);
    expect(EA_J_MOL.CP_V_ARI).toBe(40000);
    expect(EA_J_MOL.CP_III).toBe(30000);
  });

  it("CALIBRACAO_DEFAULT contém 6 tipos", () => {
    expect(Object.keys(CALIBRACAO_DEFAULT)).toHaveLength(6);
    expect(CALIBRACAO_DEFAULT.CP_V_ARI.Su_MPa).toBe(52);
  });

  it("S_CEB_FIP contém 3 classes (R, N, S)", () => {
    expect(Object.keys(S_CEB_FIP)).toHaveLength(3);
    expect(S_CEB_FIP.R.s).toBe(0.20);
    expect(S_CEB_FIP.N.s).toBe(0.25);
    expect(S_CEB_FIP.S.s).toBe(0.38);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularAlphaMax
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularAlphaMax", () => {
  it("a/c = 0.50 → Powers convencional", () => {
    const alpha = calcularAlphaMax(0.50);
    expect(alpha).toBeGreaterThan(0.70);
    expect(alpha).toBeLessThan(0.80);
  });

  it("a/c = 0.25 → Bentz UHPC (a/c < 0.28)", () => {
    const alpha = calcularAlphaMax(0.25);
    expect(alpha).toBeCloseTo(0.25 / 0.36, 3);
  });

  it("a/c = 0.80 → próximo de 1.0", () => {
    const alpha = calcularAlphaMax(0.80);
    expect(alpha).toBeGreaterThan(0.80);
    expect(alpha).toBeLessThanOrEqual(1.0);
  });

  it("a/c < 0.20 → erro", () => {
    expect(() => calcularAlphaMax(0.15)).toThrow(ThermoCoreRelacaoAcInvalidaError);
  });

  it("a/c > 0.80 → erro", () => {
    expect(() => calcularAlphaMax(0.85)).toThrow(ThermoCoreRelacaoAcInvalidaError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularDeltaTeArrhenius
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularDeltaTeArrhenius", () => {
  it("T = 20°C (T_ref) → Δte ≈ Δt (fator = 1.0)", () => {
    const dte = calcularDeltaTeArrhenius(1, 20, 40000);
    expect(dte).toBeCloseTo(1.0, 1);
  });

  it("T > 20°C → envelhecimento acelerado (Δte > Δt)", () => {
    const dte = calcularDeltaTeArrhenius(1, 40, 40000);
    expect(dte).toBeGreaterThan(1.0);
  });

  it("T < 20°C → envelhecimento retardado (Δte < Δt)", () => {
    const dte = calcularDeltaTeArrhenius(1, 5, 40000);
    expect(dte).toBeLessThan(1.0);
  });

  it("Ea maior → efeito da temperatura mais acentuado", () => {
    const dte_40k = calcularDeltaTeArrhenius(1, 40, 40000);
    const dte_30k = calcularDeltaTeArrhenius(1, 40, 30000);
    expect(dte_40k).toBeGreaterThan(dte_30k);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularDeltaMaturidade
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularDeltaMaturidade", () => {
  it("T = 25°C, Δt = 1h, T₀ = -10°C → ΔM = 35 °C·h", () => {
    expect(calcularDeltaMaturidade(1, 25)).toBe(35);
  });

  it("T = 20°C, Δt = 24h → ΔM = 720 °C·h", () => {
    expect(calcularDeltaMaturidade(24, 20)).toBe(720);
  });

  it("T < T₀ → ΔM = 0 (concreto congelado)", () => {
    expect(calcularDeltaMaturidade(1, -15)).toBe(0);
  });

  it("T₀ customizado", () => {
    expect(calcularDeltaMaturidade(1, 5, 0)).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularAlphaFHP
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularAlphaFHP", () => {
  it("te = 0 → α = 0", () => {
    expect(calcularAlphaFHP(0, 14, 0.92, 0.9)).toBe(0);
  });

  it("te → ∞ → α → αmax", () => {
    const alpha = calcularAlphaFHP(10000, 14, 0.92, 0.9);
    expect(alpha).toBeCloseTo(0.9, 2);
  });

  it("te = τ → α ≈ αmax × exp(-1) ≈ 0.331 para αmax=0.9", () => {
    const alpha = calcularAlphaFHP(14, 14, 1.0, 0.9);
    expect(alpha).toBeCloseTo(0.9 * Math.exp(-1), 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// predizFckTeCalibrado
// ─────────────────────────────────────────────────────────────────────────────

describe("predizFckTeCalibrado", () => {
  it("te = 0 → fck = 0", () => {
    expect(predizFckTeCalibrado(0, CAL_CPV)).toBe(0);
  });

  it("te = 672h (28d) → fck próximo de Su", () => {
    const fck = predizFckTeCalibrado(672, CAL_CPV);
    expect(fck).toBeGreaterThan(CAL_CPV.Su_MPa * 0.85);
    expect(fck).toBeLessThanOrEqual(CAL_CPV.Su_MPa);
  });

  it("crescimento monotônico", () => {
    const f24 = predizFckTeCalibrado(24, CAL_CPV);
    const f168 = predizFckTeCalibrado(168, CAL_CPV);
    const f672 = predizFckTeCalibrado(672, CAL_CPV);
    expect(f24).toBeLessThan(f168);
    expect(f168).toBeLessThan(f672);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// predizFckCebFip
// ─────────────────────────────────────────────────────────────────────────────

describe("predizFckCebFip", () => {
  it("idade = 672h (28d) → fck = fck28 (β_cc = 1)", () => {
    const fck = predizFckCebFip(672, 40, 0.25);
    expect(fck).toBeCloseTo(40, 0);
  });

  it("idade < 28d → fck < fck28", () => {
    const fck = predizFckCebFip(168, 40, 0.25); // 7d
    expect(fck).toBeLessThan(40);
    expect(fck).toBeGreaterThan(20);
  });

  it("cimento rápido (s=0.20) ganha mais cedo", () => {
    const fck_R = predizFckCebFip(168, 40, 0.20);
    const fck_S = predizFckCebFip(168, 40, 0.38);
    expect(fck_R).toBeGreaterThan(fck_S);
  });

  it("idade = 0 → fck = 0", () => {
    expect(predizFckCebFip(0, 40, 0.25)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calibrarSuTauBeta
// ─────────────────────────────────────────────────────────────────────────────

describe("calibrarSuTauBeta", () => {
  it("calibra corretamente com dados sintéticos limpos", () => {
    const pontos = gerarPontosCalibracao(CAL_CPV, [24, 72, 168, 336, 672]);
    const result = calibrarSuTauBeta(pontos);

    expect(result.r2).toBeGreaterThan(0.95);
    expect(result.Su_MPa).toBeGreaterThan(CAL_CPV.Su_MPa * 0.90);
    expect(result.tau_h).toBeGreaterThan(0);
    expect(result.beta).toBeGreaterThan(0);
  });

  it("< 3 pontos → erro", () => {
    const pontos = gerarPontosCalibracao(CAL_CPV, [24, 168]);
    expect(() => calibrarSuTauBeta(pontos)).toThrow(
      ThermoCoreLeiturasInsuficientesError
    );
  });

  it("dados CP III (lento) calibram com tau maior", () => {
    const cal_cp3 = CALIBRACAO_DEFAULT.CP_III;
    const pontos = gerarPontosCalibracao(cal_cp3, [24, 72, 168, 336, 672]);
    const result = calibrarSuTauBeta(pontos);

    expect(result.r2).toBeGreaterThan(0.90);
    // tau deve ser maior que CP V-ARI (cimento lento)
    expect(result.tau_h).toBeGreaterThan(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularTeDesforma
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularTeDesforma", () => {
  it("fck_alvo < Su → retorna te finito", () => {
    const te = calcularTeDesforma(30, CAL_CPV);
    expect(te).toBeGreaterThan(0);
    expect(te).toBeLessThan(672);
  });

  it("fck_alvo ≥ Su → retorna Infinity", () => {
    const te = calcularTeDesforma(CAL_CPV.Su_MPa, CAL_CPV);
    expect(te).toBe(Infinity);
  });

  it("fck_alvo = 0 → retorna 0", () => {
    expect(calcularTeDesforma(0, CAL_CPV)).toBe(0);
  });

  it("fck predito em te_desforma ≈ fck_alvo", () => {
    const alvo = 28; // 70% de 40 MPa
    const te = calcularTeDesforma(alvo, CAL_CPV);
    const fck = predizFckTeCalibrado(te, CAL_CPV);
    expect(fck).toBeCloseTo(alvo, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// gerarCurvaMaturidade
// ─────────────────────────────────────────────────────────────────────────────

describe("gerarCurvaMaturidade", () => {
  it("gera nPontos pontos", () => {
    const curva = gerarCurvaMaturidade(CAL_CPV, 40, 0.25, 672, 50);
    expect(curva).toHaveLength(50);
  });

  it("fck_calibrado é monotônico crescente", () => {
    const curva = gerarCurvaMaturidade(CAL_CPV, 40, 0.25);
    for (let i = 1; i < curva.length; i++) {
      expect(curva[i].fck_calibrado_MPa).toBeGreaterThanOrEqual(
        curva[i - 1].fck_calibrado_MPa
      );
    }
  });

  it("alpha final próximo de αmax", () => {
    const curva = gerarCurvaMaturidade(CAL_CPV, 40, 0.25, 2000, 100);
    const ultimo = curva[curva.length - 1];
    expect(ultimo.alpha).toBeGreaterThan(0.85);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// executarThermoCore
// ─────────────────────────────────────────────────────────────────────────────

describe("executarThermoCore", () => {
  it("cura isotérmica a 20°C → te ≈ tempo real", () => {
    const leituras = gerarLeiturasIsotermicas(20, 168);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    // A 20°C (T_ref), te ≈ tempo real
    expect(result.te_final_h).toBeCloseTo(168, -1);
    expect(result.curva).toHaveLength(169); // 0 a 168 inclusive
    expect(result.fck_final_MPa).toBeGreaterThan(0);
  });

  it("cura a 40°C → te > tempo real (envelhecimento acelerado)", () => {
    const leituras = gerarLeiturasIsotermicas(40, 168);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    expect(result.te_final_h).toBeGreaterThan(168);
  });

  it("cura a 5°C → te < tempo real (envelhecimento retardado)", () => {
    const leituras = gerarLeiturasIsotermicas(5, 168);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    expect(result.te_final_h).toBeLessThan(168);
  });

  it("maturidade Nurse-Saul acumula corretamente", () => {
    const leituras = gerarLeiturasIsotermicas(25, 24);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    // (25 − (−10)) × 24 = 35 × 24 = 840 °C·h
    expect(result.maturidade_final_Ch).toBeCloseTo(840, -1);
  });

  it("desforma liberada quando fck > 70% fck28", () => {
    // 672h isotérmica a 20°C = 28 dias → fck ~ Su
    const leituras = gerarLeiturasIsotermicas(20, 672);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    expect(result.desforma.liberado).toBe(true);
    expect(result.desforma.condicao_resistencia).toBe(true);
  });

  it("desforma NÃO liberada nas primeiras horas", () => {
    const leituras = gerarLeiturasIsotermicas(20, 6);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    expect(result.desforma.condicao_resistencia).toBe(false);
  });

  it("critério ΔT detecta gradiente excessivo", () => {
    const leituras = gerarLeiturasComPico(25, 70, 40, 168);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
      T_superficie_C: 15, // ΔT = 40 - 15 = 25°C > 20°C ao final
    });

    expect(result.desforma.condicao_deltaT).toBe(false);
  });

  it("critério T_nucleo rejeita > 70°C", () => {
    // Leitura no pico = 75°C
    const leituras: LeituraTemperatura[] = [
      { tempo_h: 0, temperatura_C: 25 },
      { tempo_h: 12, temperatura_C: 75 },
      { tempo_h: 24, temperatura_C: 75 }, // mantém 75°C no final
    ];
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    expect(result.desforma.condicao_T_nucleo).toBe(false);
  });

  it("relacaoAc calcula αmax via Powers", () => {
    const leituras = gerarLeiturasIsotermicas(20, 24);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
      relacaoAc: 0.50,
    });

    expect(result.alphaMax).toBeGreaterThan(0.70);
    expect(result.alphaMax).toBeLessThan(0.80);
  });

  it("< 3 leituras → erro", () => {
    expect(() =>
      executarThermoCore({
        leituras: [
          { tempo_h: 0, temperatura_C: 25 },
          { tempo_h: 1, temperatura_C: 26 },
        ],
        Ea_J_mol: 40000,
        calibracao: CAL_CPV,
        fck28_MPa: 40,
      })
    ).toThrow(ThermoCoreLeiturasInsuficientesError);
  });

  it("curva tem campos completos em cada ponto", () => {
    const leituras = gerarLeiturasIsotermicas(25, 48);
    const result = executarThermoCore({
      leituras,
      Ea_J_mol: 40000,
      calibracao: CAL_CPV,
      fck28_MPa: 40,
    });

    const ponto = result.curva[10];
    expect(ponto).toHaveProperty("tempo_h");
    expect(ponto).toHaveProperty("temperatura_C");
    expect(ponto).toHaveProperty("maturidade_Ch");
    expect(ponto).toHaveProperty("te_h");
    expect(ponto).toHaveProperty("alpha");
    expect(ponto).toHaveProperty("fck_pred_MPa");
    expect(ponto).toHaveProperty("fck_ceb_MPa");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROS DE DOMÍNIO
// ─────────────────────────────────────────────────────────────────────────────

describe("ThermoCore — Erros de domínio", () => {
  it("ThermoCoreLeiturasInsuficientesError tem nome correto", () => {
    const err = new ThermoCoreLeiturasInsuficientesError(2);
    expect(err.name).toBe("ThermoCoreLeiturasInsuficientesError");
    expect(err.message).toContain("3 leituras");
  });

  it("ThermoCoreCalibraçãoInvalidaError tem nome correto", () => {
    const err = new ThermoCoreCalibraçãoInvalidaError("teste");
    expect(err.name).toBe("ThermoCoreCalibraçãoInvalidaError");
    expect(err.message).toContain("teste");
  });

  it("ThermoCoreRelacaoAcInvalidaError tem nome correto", () => {
    const err = new ThermoCoreRelacaoAcInvalidaError(0.10);
    expect(err.name).toBe("ThermoCoreRelacaoAcInvalidaError");
    expect(err.message).toContain("0.100");
  });
});
