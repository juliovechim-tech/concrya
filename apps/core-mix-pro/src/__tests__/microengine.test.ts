/**
 * @file __tests__/microengine.test.ts
 * @description Testes unitários do motor MicroEngine — microestrutura + durabilidade
 */

import { describe, it, expect } from "vitest";
import {
  calcularComposicaoPasta,
  calcularFcGelSpace,
  estimarAlpha,
  calcularITZ,
  calcularD28,
  calcularDt,
  concentracaoCloretos,
  tempoDespassivacaoCloretos,
  gerarPerfilCloretos,
  calcularKcCarbonatacao,
  profundidadeCarbonatacao,
  tempoDespassivacaoCarbonatacao,
  gerarEvolucaoCarbonatacao,
  executarMicroEngine,
  RHO_CIMENTO_KGM3,
  A_GEL_MPA,
  N_GEL_SPACE,
  D_REF_M2S,
  M_ENVELHECIMENTO,
  KC_BASE,
  C_CRIT_CLORETOS,
  MicroEngineParametroInvalidoError,
} from "../lib/microengine";

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSIÇÃO VOLUMÉTRICA — POWERS
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularComposicaoPasta", () => {
  it("a/c = 0.50, α = 0.80 → gel-space ratio entre 0.4–0.8", () => {
    const c = calcularComposicaoPasta(0.50, 0.80);
    expect(c.gelSpaceRatio).toBeGreaterThan(0.4);
    expect(c.gelSpaceRatio).toBeLessThan(0.8);
    expect(c.V_naoHid).toBeGreaterThan(0);
    expect(c.V_gel).toBeGreaterThan(0);
    expect(c.porosidadeCapilar).toBeGreaterThan(0);
  });

  it("α = 0 → todo cimento não-hidratado, gel = 0", () => {
    const c = calcularComposicaoPasta(0.50, 0);
    expect(c.V_gel).toBe(0);
    expect(c.V_naoHid).toBeGreaterThan(0);
    expect(c.gelSpaceRatio).toBe(0);
  });

  it("maior a/c → maior porosidade capilar", () => {
    const c40 = calcularComposicaoPasta(0.40, 0.80);
    const c60 = calcularComposicaoPasta(0.60, 0.80);
    expect(c60.porosidadeCapilar).toBeGreaterThan(c40.porosidadeCapilar);
  });

  it("maior α → menor porosidade capilar", () => {
    const a50 = calcularComposicaoPasta(0.50, 0.50);
    const a90 = calcularComposicaoPasta(0.50, 0.90);
    expect(a90.porosidadeCapilar).toBeLessThan(a50.porosidadeCapilar);
  });

  it("rejeita a/c fora da faixa", () => {
    expect(() => calcularComposicaoPasta(0.10, 0.5)).toThrow(MicroEngineParametroInvalidoError);
    expect(() => calcularComposicaoPasta(0.90, 0.5)).toThrow(MicroEngineParametroInvalidoError);
  });

  it("rejeita α fora da faixa", () => {
    expect(() => calcularComposicaoPasta(0.50, -0.1)).toThrow(MicroEngineParametroInvalidoError);
    expect(() => calcularComposicaoPasta(0.50, 1.5)).toThrow(MicroEngineParametroInvalidoError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESISTÊNCIA GEL-SPACE
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularFcGelSpace", () => {
  it("X = 1.0 → fc = A ≈ 230 MPa", () => {
    expect(calcularFcGelSpace(1.0)).toBeCloseTo(A_GEL_MPA, 0);
  });

  it("X = 0.5 → fc ≈ 32 MPa", () => {
    const fc = calcularFcGelSpace(0.5);
    expect(fc).toBeGreaterThan(25);
    expect(fc).toBeLessThan(40);
  });

  it("X = 0 → fc = 0", () => {
    expect(calcularFcGelSpace(0)).toBe(0);
  });

  it("maior X → maior fc", () => {
    expect(calcularFcGelSpace(0.7)).toBeGreaterThan(calcularFcGelSpace(0.5));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ESTIMATIVA DE α
// ─────────────────────────────────────────────────────────────────────────────

describe("estimarAlpha", () => {
  it("28 dias → α entre 0.6–0.9", () => {
    const alpha = estimarAlpha(28, 0.50);
    expect(alpha).toBeGreaterThan(0.6);
    expect(alpha).toBeLessThan(0.95);
  });

  it("1 dia → α menor que 28 dias", () => {
    expect(estimarAlpha(1, 0.50)).toBeLessThan(estimarAlpha(28, 0.50));
  });

  it("365 dias → α próximo de α_max", () => {
    const alpha = estimarAlpha(365, 0.50);
    const alphaMax = Math.min(1, 0.50 / 0.44);
    expect(alpha).toBeGreaterThan(alphaMax * 0.95);
  });

  it("baixo a/c → α_max menor (Powers)", () => {
    expect(estimarAlpha(28, 0.30)).toBeLessThan(estimarAlpha(28, 0.50));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ITZ
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularITZ", () => {
  it("retorna propriedades consistentes", () => {
    const itz = calcularITZ(0.15, 0.70, 19);
    expect(itz.espessura_um).toBe(30);
    expect(itz.porosidade_ITZ).toBeGreaterThan(0.15);
    expect(itz.fatorDifusao).toBeGreaterThan(1);
    expect(itz.volumeRelativo).toBeGreaterThan(0);
    expect(itz.volumeRelativo).toBeLessThanOrEqual(0.30);
  });

  it("maior porosidade bulk → maior porosidade ITZ", () => {
    const itz1 = calcularITZ(0.10, 0.70, 19);
    const itz2 = calcularITZ(0.20, 0.70, 19);
    expect(itz2.porosidade_ITZ).toBeGreaterThan(itz1.porosidade_ITZ);
  });

  it("menor d_max → maior volume relativo de ITZ", () => {
    const itz1 = calcularITZ(0.15, 0.70, 9.5);
    const itz2 = calcularITZ(0.15, 0.70, 25);
    expect(itz1.volumeRelativo).toBeGreaterThan(itz2.volumeRelativo);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DIFUSÃO DE CLORETOS
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularD28", () => {
  it("a/c = 0.50 → D ≈ D_ref", () => {
    const D = calcularD28(0.50);
    expect(D).toBeCloseTo(D_REF_M2S, 14);
  });

  it("maior a/c → maior D", () => {
    expect(calcularD28(0.60)).toBeGreaterThan(calcularD28(0.40));
  });
});

describe("calcularDt", () => {
  it("t > t_ref → D diminui (envelhecimento)", () => {
    const D28 = 5e-12;
    const t1ano = 365.25 * 24 * 3600;
    const Dt = calcularDt(D28, t1ano, 0.30);
    expect(Dt).toBeLessThan(D28);
  });
});

describe("concentracaoCloretos", () => {
  it("x = 0 → C = Cs", () => {
    const C = concentracaoCloretos(0, 1e8, 5e-12, 0.6);
    expect(C).toBeCloseTo(0.6, 1);
  });

  it("x grande → C → 0", () => {
    const C = concentracaoCloretos(0.5, 1e8, 5e-12, 0.6);
    expect(C).toBeLessThan(0.01);
  });

  it("mais tempo → mais penetração", () => {
    const C1 = concentracaoCloretos(0.03, 1e8, 5e-12, 0.6);
    const C2 = concentracaoCloretos(0.03, 5e8, 5e-12, 0.6);
    expect(C2).toBeGreaterThan(C1);
  });
});

describe("tempoDespassivacaoCloretos", () => {
  it("retorna tempo > 0 para caso típico", () => {
    const t = tempoDespassivacaoCloretos(0.040, 0.6, 5e-12, 0.30);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThan(0);
  });

  it("maior cobrimento → mais tempo", () => {
    const t30 = tempoDespassivacaoCloretos(0.030, 0.6, 5e-12, 0.30);
    const t50 = tempoDespassivacaoCloretos(0.050, 0.6, 5e-12, 0.30);
    expect(t50!).toBeGreaterThan(t30!);
  });

  it("Cs ≤ Ccrit → null (nunca despassiva)", () => {
    const t = tempoDespassivacaoCloretos(0.040, 0.3, 5e-12, 0.30, 0.4);
    expect(t).toBeNull();
  });
});

describe("gerarPerfilCloretos", () => {
  it("gera perfil com nPontos + 1 pontos", () => {
    const perfil = gerarPerfilCloretos(5e-12, 0.30, 50, 0.6, 100, 20);
    expect(perfil).toHaveLength(21);
    expect(perfil[0].x_mm).toBe(0);
    expect(perfil[0].C_pct).toBeCloseTo(0.6, 1);
    expect(perfil[20].C_pct).toBeLessThan(perfil[0].C_pct);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CARBONATAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularKcCarbonatacao", () => {
  it("a/c = 0.50, classe II → K_c = KC_BASE.II", () => {
    expect(calcularKcCarbonatacao(0.50, "II")).toBeCloseTo(KC_BASE.II, 1);
  });

  it("maior a/c → maior K_c", () => {
    expect(calcularKcCarbonatacao(0.60, "II")).toBeGreaterThan(
      calcularKcCarbonatacao(0.40, "II"),
    );
  });

  it("classe IV > classe I", () => {
    expect(calcularKcCarbonatacao(0.50, "IV")).toBeGreaterThan(
      calcularKcCarbonatacao(0.50, "I"),
    );
  });
});

describe("profundidadeCarbonatacao", () => {
  it("t = 0 → x_c = 0", () => {
    expect(profundidadeCarbonatacao(4.0, 0)).toBe(0);
  });

  it("K_c = 4, t = 25 anos → x_c = 20 mm", () => {
    expect(profundidadeCarbonatacao(4.0, 25)).toBeCloseTo(20, 0);
  });
});

describe("tempoDespassivacaoCarbonatacao", () => {
  it("K_c = 4, cob = 30 mm → t ≈ 56 anos", () => {
    const t = tempoDespassivacaoCarbonatacao(4.0, 30);
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(56.25, 0);
  });

  it("cob muito grande → > 200 anos → null", () => {
    const t = tempoDespassivacaoCarbonatacao(1.0, 200);
    expect(t).toBeNull();
  });
});

describe("gerarEvolucaoCarbonatacao", () => {
  it("gera evolução com nPontos + 1 pontos", () => {
    const ev = gerarEvolucaoCarbonatacao(4.0, 50, 10);
    expect(ev).toHaveLength(11);
    expect(ev[0].xc_mm).toBe(0);
    expect(ev[10].xc_mm).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe("executarMicroEngine", () => {
  it("caso básico sem exposição", () => {
    const r = executarMicroEngine({ relacaoAc: 0.50, idade_dias: 28 });
    expect(r.composicao.gelSpaceRatio).toBeGreaterThan(0);
    expect(r.fcGelSpace_MPa).toBeGreaterThan(20);
    expect(r.itz.espessura_um).toBe(30);
    expect(r.cloretos).toBeNull();
    expect(r.carbonatacao).toBeNull();
    expect(r.params.relacaoAc).toBe(0.50);
    expect(r.params.alpha).toBeGreaterThan(0);
  });

  it("com exposição classe II → cloretos + carbonatação", () => {
    const r = executarMicroEngine({
      relacaoAc: 0.50,
      idade_dias: 28,
      exposicao: {
        classeAgressividade: "II",
        cobrimento_mm: 35,
      },
    });
    expect(r.cloretos).not.toBeNull();
    expect(r.cloretos!.D28_m2s).toBeGreaterThan(0);
    expect(r.cloretos!.perfil.length).toBeGreaterThan(0);
    expect(r.carbonatacao).not.toBeNull();
    expect(r.carbonatacao!.Kc_mmRaizAno).toBeGreaterThan(0);
    expect(r.carbonatacao!.evolucao.length).toBeGreaterThan(0);
  });

  it("baixo a/c → maior fc, menor D, maior vida útil", () => {
    const r40 = executarMicroEngine({
      relacaoAc: 0.40,
      exposicao: { classeAgressividade: "III", cobrimento_mm: 40 },
    });
    const r60 = executarMicroEngine({
      relacaoAc: 0.60,
      exposicao: { classeAgressividade: "III", cobrimento_mm: 40 },
    });
    expect(r40.fcGelSpace_MPa).toBeGreaterThan(r60.fcGelSpace_MPa);
    expect(r40.cloretos!.D28_m2s).toBeLessThan(r60.cloretos!.D28_m2s);
  });

  it("α fornecido diretamente é usado", () => {
    const r = executarMicroEngine({ relacaoAc: 0.50, alpha: 0.90 });
    expect(r.params.alpha).toBe(0.90);
  });

  it("tipo cimento afeta m_envelhecimento", () => {
    const rCPV = executarMicroEngine({
      relacaoAc: 0.50,
      tipoCimento: "CP_V_ARI",
      exposicao: { classeAgressividade: "II", cobrimento_mm: 30 },
    });
    const rCPIII = executarMicroEngine({
      relacaoAc: 0.50,
      tipoCimento: "CP_III",
      exposicao: { classeAgressividade: "II", cobrimento_mm: 30 },
    });
    expect(rCPIII.params.m_envelhecimento).toBeGreaterThan(rCPV.params.m_envelhecimento);
  });

  it("rejeita a/c fora da faixa", () => {
    expect(() => executarMicroEngine({ relacaoAc: 0.10 })).toThrow(
      MicroEngineParametroInvalidoError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

describe("constantes", () => {
  it("RHO_CIMENTO ≈ 3150 kg/m³", () => {
    expect(RHO_CIMENTO_KGM3).toBeCloseTo(3150, 0);
  });

  it("M_ENVELHECIMENTO cobre tipos de cimento", () => {
    expect(M_ENVELHECIMENTO.CP_V_ARI).toBeDefined();
    expect(M_ENVELHECIMENTO.CP_III).toBeDefined();
    expect(M_ENVELHECIMENTO.CP_III).toBeGreaterThan(M_ENVELHECIMENTO.CP_V_ARI);
  });

  it("KC_BASE classe IV > classe I", () => {
    expect(KC_BASE.IV).toBeGreaterThan(KC_BASE.I);
  });
});
