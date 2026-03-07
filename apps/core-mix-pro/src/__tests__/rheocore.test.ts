/**
 * @file __tests__/rheocore.test.ts
 * @description Testes unitários do motor RheoCore — reometria rotacional
 */

import { describe, it, expect } from "vitest";
import {
  converterAmperagemTorque,
  calcularTensaoCisalhamento,
  calcularTaxaCisalhamento,
  ajustarBingham,
  ajustarHerschelBulkley,
  estimarSlump,
  estimarFlow,
  estimarT500,
  estimarMarsh,
  calcularCorrelacoes,
  classificar,
  analisarPerdaTrabalhabilidade,
  executarRheoCore,
  GEOMETRIA_DEFAULT,
  FAIXAS_TAU0,
  RheoCoreLeituraInsuficienteError,
  RheoCoreParametroInvalidoError,
  type LeituraAmperagem,
  type PontoReologico,
  type ConfigGeometria,
} from "../lib/rheocore";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

/** Gera leituras de amperagem crescente (simulando perda de trabalhabilidade) */
function gerarLeiturasCrescentes(
  n: number,
  I0: number,
  taxa: number,
  dt_s = 900,
): LeituraAmperagem[] {
  return Array.from({ length: n }, (_, i) => ({
    tempo_s: i * dt_s,
    amperagem_A: I0 + taxa * (i * dt_s / 60), // taxa em A/min
  }));
}

/** Gera pontos Bingham sintéticos: τ = τ₀ + μ_p × γ̇ */
function gerarPontosBingham(
  tau0: number,
  mu_p: number,
  gammas: number[],
  ruido = 0,
): PontoReologico[] {
  return gammas.map((g) => ({
    gamma_dot_1s: g,
    tau_Pa: tau0 + mu_p * g + (Math.random() - 0.5) * ruido,
  }));
}

/** Gera pontos Herschel-Bulkley: τ = τ₀ + K × γ̇^n */
function gerarPontosHB(
  tau0: number,
  K: number,
  n: number,
  gammas: number[],
): PontoReologico[] {
  return gammas.map((g) => ({
    gamma_dot_1s: g,
    tau_Pa: tau0 + K * Math.pow(g, n),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSÃO AMPERAGEM → TORQUE
// ─────────────────────────────────────────────────────────────────────────────

describe("converterAmperagemTorque", () => {
  it("converte amperagem em torque (Bosch GSR 120-LI)", () => {
    const T = converterAmperagemTorque(2.0, 0.12);
    expect(T).toBeCloseTo(0.24, 4);
  });

  it("zero ampère → zero torque", () => {
    expect(converterAmperagemTorque(0, 0.12)).toBe(0);
  });

  it("rejeita amperagem negativa", () => {
    expect(() => converterAmperagemTorque(-1, 0.12)).toThrow(
      RheoCoreParametroInvalidoError,
    );
  });

  it("rejeita k_motor ≤ 0", () => {
    expect(() => converterAmperagemTorque(2, 0)).toThrow(
      RheoCoreParametroInvalidoError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TENSÃO DE CISALHAMENTO
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularTensaoCisalhamento", () => {
  it("calcula τ para geometria Couette", () => {
    // T = 0.24 N·m, Ri = 0.025 m, h = 0.10 m
    // τ = 0.24 / (2π × 0.025² × 0.10) = 0.24 / 0.00039269... ≈ 611.15 Pa
    const tau = calcularTensaoCisalhamento(0.24, 0.025, 0.10);
    expect(tau).toBeCloseTo(611.15, 0);
  });

  it("zero torque → zero τ", () => {
    expect(calcularTensaoCisalhamento(0, 0.025, 0.10)).toBe(0);
  });

  it("rejeita raio ≤ 0", () => {
    expect(() => calcularTensaoCisalhamento(0.1, 0, 0.10)).toThrow(
      RheoCoreParametroInvalidoError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TAXA DE CISALHAMENTO
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularTaxaCisalhamento", () => {
  it("calcula γ̇ Couette para 400 RPM", () => {
    // ω = 2π × 400/60 ≈ 41.888 rad/s
    // Re = 0.075, Ri = 0.025
    // γ̇ = 2 × 41.888 × 0.075² / (0.075² - 0.025²)
    //    = 2 × 41.888 × 0.005625 / (0.005625 - 0.000625)
    //    = 0.47124 / 0.005 ≈ 94.25 1/s
    const gd = calcularTaxaCisalhamento(400, 0.025, 0.075);
    expect(gd).toBeCloseTo(94.25, 0);
  });

  it("rejeita RPM ≤ 0", () => {
    expect(() => calcularTaxaCisalhamento(0, 0.025, 0.075)).toThrow(
      RheoCoreParametroInvalidoError,
    );
  });

  it("rejeita Re ≤ Ri", () => {
    expect(() => calcularTaxaCisalhamento(400, 0.075, 0.025)).toThrow(
      RheoCoreParametroInvalidoError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTE BINGHAM
// ─────────────────────────────────────────────────────────────────────────────

describe("ajustarBingham", () => {
  it("recupera τ₀ e μ_p de dados perfeitos", () => {
    const pontos = gerarPontosBingham(200, 15, [10, 30, 50, 80, 100], 0);
    const b = ajustarBingham(pontos);
    expect(b.tau0_Pa).toBeCloseTo(200, 0);
    expect(b.mu_p_Pas).toBeCloseTo(15, 0);
    expect(b.r2).toBeGreaterThan(0.99);
    expect(b.nPontos).toBe(5);
  });

  it("funciona com 3 pontos mínimos", () => {
    const pontos = gerarPontosBingham(100, 10, [20, 50, 100], 0);
    const b = ajustarBingham(pontos);
    expect(b.tau0_Pa).toBeCloseTo(100, 0);
    expect(b.mu_p_Pas).toBeCloseTo(10, 0);
  });

  it("rejeita menos de 3 pontos", () => {
    expect(() => ajustarBingham([
      { gamma_dot_1s: 10, tau_Pa: 300 },
      { gamma_dot_1s: 50, tau_Pa: 400 },
    ])).toThrow(RheoCoreParametroInvalidoError);
  });

  it("τ₀ nunca negativo", () => {
    // Dados que poderiam dar intercepto negativo
    const pontos: PontoReologico[] = [
      { gamma_dot_1s: 50, tau_Pa: 500 },
      { gamma_dot_1s: 100, tau_Pa: 1100 },
      { gamma_dot_1s: 150, tau_Pa: 1700 },
    ];
    const b = ajustarBingham(pontos);
    expect(b.tau0_Pa).toBeGreaterThanOrEqual(0);
    expect(b.mu_p_Pas).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTE HERSCHEL-BULKLEY
// ─────────────────────────────────────────────────────────────────────────────

describe("ajustarHerschelBulkley", () => {
  it("recupera parâmetros de dados HB pseudoplástico (n < 1)", () => {
    // τ₀ = 50, K = 20, n = 0.6
    const pontos = gerarPontosHB(50, 20, 0.6, [5, 15, 30, 60, 100]);
    const hb = ajustarHerschelBulkley(pontos);
    expect(hb.tau0_Pa).toBeGreaterThanOrEqual(0);
    expect(hb.n).toBeLessThan(1); // pseudoplástico
    expect(hb.r2).toBeGreaterThan(0.9);
    expect(hb.nPontos).toBe(5);
  });

  it("rejeita menos de 4 pontos", () => {
    expect(() => ajustarHerschelBulkley([
      { gamma_dot_1s: 10, tau_Pa: 100 },
      { gamma_dot_1s: 50, tau_Pa: 200 },
      { gamma_dot_1s: 100, tau_Pa: 300 },
    ])).toThrow(RheoCoreParametroInvalidoError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CORRELAÇÕES EMPÍRICAS
// ─────────────────────────────────────────────────────────────────────────────

describe("estimarSlump", () => {
  it("τ₀ = 500 Pa → Slump ≈ 165 mm", () => {
    expect(estimarSlump(500)).toBeCloseTo(165, 0);
  });

  it("τ₀ = 100 Pa → Slump ≈ 273 mm", () => {
    expect(estimarSlump(100)).toBeCloseTo(273, 0);
  });

  it("fora do domínio (τ₀ < 50) retorna null", () => {
    expect(estimarSlump(10)).toBeNull();
  });

  it("fora do domínio (τ₀ > 1100) retorna null", () => {
    expect(estimarSlump(1200)).toBeNull();
  });
});

describe("estimarFlow", () => {
  it("τ₀ = 100 Pa → Flow ≈ 600 mm (SCC)", () => {
    const f = estimarFlow(100);
    expect(f).not.toBeNull();
    expect(f!).toBeGreaterThan(400);
    expect(f!).toBeLessThan(900);
  });

  it("τ₀ > 300 Pa → null (fora do domínio SCC)", () => {
    expect(estimarFlow(500)).toBeNull();
  });

  it("τ₀ = 0 → null", () => {
    expect(estimarFlow(0)).toBeNull();
  });
});

describe("estimarT500", () => {
  it("μ_p = 40 Pa·s → T500 ≈ 1.3 s", () => {
    expect(estimarT500(40)).toBeCloseTo(1.3, 0);
  });

  it("μ_p fora do domínio → null", () => {
    expect(estimarT500(5)).toBeNull();
    expect(estimarT500(100)).toBeNull();
  });
});

describe("estimarMarsh", () => {
  it("μ_p = 10 Pa·s → Marsh ≈ 30.8 s", () => {
    expect(estimarMarsh(10)).toBeCloseTo(30.8, 0);
  });

  it("μ_p fora do domínio → null", () => {
    expect(estimarMarsh(0.1)).toBeNull();
    expect(estimarMarsh(50)).toBeNull();
  });
});

describe("calcularCorrelacoes", () => {
  it("retorna todas correlações para CCV", () => {
    const c = calcularCorrelacoes(300, 20);
    expect(c.slump_mm).not.toBeNull();
    expect(c.flow_mm).toBeNull(); // τ₀ = 300 → fora de SCC
    expect(c.t500_s).not.toBeNull();
    expect(c.marsh_s).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

describe("classificar", () => {
  it("τ₀ = 800 Pa → CCV", () => {
    expect(classificar(800)).toBe("CCV");
  });

  it("τ₀ = 200 Pa → CAA_1", () => {
    expect(classificar(200)).toBe("CAA_1");
  });

  it("τ₀ = 80 Pa → CAA_2", () => {
    expect(classificar(80)).toBe("CAA_2");
  });

  it("τ₀ = 40 Pa → CAA_3", () => {
    expect(classificar(40)).toBe("CAA_3");
  });

  it("τ₀ = 20 Pa, n = 0.7 → UHPC", () => {
    expect(classificar(20, 0.7)).toBe("UHPC");
  });

  it("τ₀ = 5 Pa → FLUIDO", () => {
    expect(classificar(5)).toBe("FLUIDO");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISE DE PERDA DE TRABALHABILIDADE
// ─────────────────────────────────────────────────────────────────────────────

describe("analisarPerdaTrabalhabilidade", () => {
  it("detecta crescimento de τ (perda de trabalhabilidade)", () => {
    // I cresce de 2.0 A a ~3.0 A em 60 min (taxa 0.0167 A/min)
    const leituras = gerarLeiturasCrescentes(5, 2.0, 0.0167);
    const perda = analisarPerdaTrabalhabilidade(leituras, GEOMETRIA_DEFAULT);

    expect(perda.pontos).toHaveLength(5);
    expect(perda.tau_final_Pa).toBeGreaterThan(perda.tau_inicial_Pa);
    expect(perda.taxaCrescimento_PaMin).toBeGreaterThan(0);
    expect(perda.variacaoRelativa_pct).toBeGreaterThan(0);
    expect(perda.r2).toBeGreaterThan(0.9);
  });

  it("calcula tempo de dobra quando τ cresce", () => {
    const leituras = gerarLeiturasCrescentes(10, 2.0, 0.01);
    const perda = analisarPerdaTrabalhabilidade(leituras, GEOMETRIA_DEFAULT);
    expect(perda.tempoDobraTau_min).not.toBeNull();
    expect(perda.tempoDobraTau_min!).toBeGreaterThan(0);
  });

  it("rejeita menos de 3 leituras", () => {
    expect(() =>
      analisarPerdaTrabalhabilidade(
        [{ tempo_s: 0, amperagem_A: 2 }, { tempo_s: 60, amperagem_A: 2.1 }],
        GEOMETRIA_DEFAULT,
      )
    ).toThrow(RheoCoreLeituraInsuficienteError);
  });

  it("leituras constantes → variação ≈ 0", () => {
    const leituras: LeituraAmperagem[] = Array.from({ length: 5 }, (_, i) => ({
      tempo_s: i * 600,
      amperagem_A: 2.0,
    }));
    const perda = analisarPerdaTrabalhabilidade(leituras, GEOMETRIA_DEFAULT);
    expect(Math.abs(perda.variacaoRelativa_pct)).toBeLessThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL — executarRheoCore
// ─────────────────────────────────────────────────────────────────────────────

describe("executarRheoCore", () => {
  it("modo single-speed (NEXUS) retorna resultado completo", () => {
    const leituras = gerarLeiturasCrescentes(10, 2.0, 0.005);
    const resultado = executarRheoCore({ leituras });

    expect(resultado.evolucao).toHaveLength(10);
    expect(resultado.perda.pontos).toHaveLength(10);
    expect(resultado.bingham.tau0_Pa).toBeGreaterThan(0);
    expect(resultado.bingham.mu_p_Pas).toBeGreaterThanOrEqual(0);
    expect(resultado.bingham.nPontos).toBe(1); // single-speed
    expect(resultado.herschelBulkley).toBeNull();
    expect(resultado.correlacoes).toBeDefined();
    expect(resultado.classe).toBeDefined();
    expect(resultado.geometria).toEqual(GEOMETRIA_DEFAULT);
  });

  it("modo multi-velocidade com ajuste Bingham", () => {
    const leituras = gerarLeiturasCrescentes(5, 2.0, 0.003);
    const pontosMultiVel = gerarPontosBingham(200, 12, [10, 30, 50, 80, 100], 0);

    const resultado = executarRheoCore({ leituras, pontosMultiVel });

    expect(resultado.bingham.tau0_Pa).toBeCloseTo(200, 0);
    expect(resultado.bingham.mu_p_Pas).toBeCloseTo(12, 0);
    expect(resultado.bingham.r2).toBeGreaterThan(0.99);
    expect(resultado.bingham.nPontos).toBe(5);
  });

  it("modo multi-vel com ≥ 4 pontos inclui Herschel-Bulkley", () => {
    const leituras = gerarLeiturasCrescentes(5, 2.0, 0.003);
    const pontosMultiVel = gerarPontosHB(50, 20, 0.6, [5, 15, 30, 60, 100]);

    const resultado = executarRheoCore({ leituras, pontosMultiVel });

    expect(resultado.herschelBulkley).not.toBeNull();
    expect(resultado.herschelBulkley!.n).toBeLessThan(1);
    expect(resultado.herschelBulkley!.nPontos).toBe(5);
  });

  it("geometria customizada é aplicada", () => {
    const leituras = gerarLeiturasCrescentes(5, 2.0, 0.005);
    const resultado = executarRheoCore({
      leituras,
      geometria: { rpm: 600, k_motor_NmA: 0.15 },
    });
    expect(resultado.geometria.rpm).toBe(600);
    expect(resultado.geometria.k_motor_NmA).toBe(0.15);
    expect(resultado.geometria.raio_int_m).toBe(GEOMETRIA_DEFAULT.raio_int_m); // default mantido
  });

  it("rejeita menos de 3 leituras", () => {
    expect(() => executarRheoCore({
      leituras: [
        { tempo_s: 0, amperagem_A: 2 },
        { tempo_s: 60, amperagem_A: 2.1 },
      ],
    })).toThrow(RheoCoreLeituraInsuficienteError);
  });

  it("classificação CCV para concreto com alta amperagem", () => {
    // Alta amperagem → alto τ → CCV
    const leituras = gerarLeiturasCrescentes(5, 5.0, 0.01);
    const resultado = executarRheoCore({ leituras });
    expect(resultado.classe).toBe("CCV");
  });

  it("correlação slump presente para CCV", () => {
    const leituras = gerarLeiturasCrescentes(5, 3.0, 0.005);
    const pontosMultiVel = gerarPontosBingham(400, 20, [10, 30, 50, 80, 100], 0);
    const resultado = executarRheoCore({ leituras, pontosMultiVel });
    expect(resultado.correlacoes.slump_mm).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES EXPORTADAS
// ─────────────────────────────────────────────────────────────────────────────

describe("constantes", () => {
  it("GEOMETRIA_DEFAULT é coerente", () => {
    expect(GEOMETRIA_DEFAULT.raio_ext_m).toBeGreaterThan(GEOMETRIA_DEFAULT.raio_int_m);
    expect(GEOMETRIA_DEFAULT.rpm).toBeGreaterThan(0);
    expect(GEOMETRIA_DEFAULT.k_motor_NmA).toBeGreaterThan(0);
  });

  it("FAIXAS_TAU0 cobre todo o espectro", () => {
    expect(FAIXAS_TAU0.FLUIDO.min).toBe(0);
    expect(FAIXAS_TAU0.CCV.max).toBe(Infinity);
  });
});
