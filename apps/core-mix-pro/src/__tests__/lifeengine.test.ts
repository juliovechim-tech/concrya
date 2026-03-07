/**
 * @file __tests__/lifeengine.test.ts
 * @description Testes unitários do motor LifeEngine — vida útil + Monte Carlo + VPL
 */

import { describe, it, expect } from "vitest";
import {
  tIniciacaoCloretos,
  tIniciacaoCarbonatacao,
  calcularVPL,
  simularMonteCarlo,
  calcularEstatisticas,
  gerarCurvaPf,
  gerarHistograma,
  gerarCenariosDefault,
  executarLifeEngine,
  BETA_ALVO,
  C_CRIT_DEFAULT,
  CUSTOS_INTERVENCAO,
  LifeEngineParametroInvalidoError,
  type VariaveisEstocasticas,
  type CenarioVPL,
} from "../lib/lifeengine";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const VARS_TIPICAS: VariaveisEstocasticas = {
  D28_mean: 5e-12,
  Cs_mean: 0.6,
  cob_mean_mm: 40,
  m_mean: 0.30,
  Kc_mean: 4.0,
};

// ─────────────────────────────────────────────────────────────────────────────
// DEGRADAÇÃO DETERMINÍSTICA
// ─────────────────────────────────────────────────────────────────────────────

describe("tIniciacaoCloretos", () => {
  it("retorna tempo > 0 para caso típico", () => {
    const t = tIniciacaoCloretos(0.040, 5e-12, 0.30, 0.6, 0.4);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(300);
  });

  it("maior cobrimento → mais tempo", () => {
    const t30 = tIniciacaoCloretos(0.030, 5e-12, 0.30, 0.6, 0.4);
    const t50 = tIniciacaoCloretos(0.050, 5e-12, 0.30, 0.6, 0.4);
    expect(t50).toBeGreaterThan(t30);
  });

  it("menor D → mais tempo", () => {
    const tAlto = tIniciacaoCloretos(0.040, 8e-12, 0.30, 0.6, 0.4);
    const tBaixo = tIniciacaoCloretos(0.040, 2e-12, 0.30, 0.6, 0.4);
    expect(tBaixo).toBeGreaterThan(tAlto);
  });

  it("Cs ≤ Ccrit → Infinity", () => {
    expect(tIniciacaoCloretos(0.040, 5e-12, 0.30, 0.3, 0.4)).toBe(Infinity);
  });

  it("cob = 0 → Infinity", () => {
    expect(tIniciacaoCloretos(0, 5e-12, 0.30, 0.6, 0.4)).toBe(Infinity);
  });
});

describe("tIniciacaoCarbonatacao", () => {
  it("K_c = 4, cob = 30 mm → t ≈ 56 anos", () => {
    const t = tIniciacaoCarbonatacao(30, 4.0);
    expect(t).toBeCloseTo(56.25, 0);
  });

  it("maior cobrimento → mais tempo", () => {
    expect(tIniciacaoCarbonatacao(50, 4)).toBeGreaterThan(
      tIniciacaoCarbonatacao(30, 4),
    );
  });

  it("K_c = 0 → Infinity", () => {
    expect(tIniciacaoCarbonatacao(30, 0)).toBe(Infinity);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VPL
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularVPL", () => {
  it("sem intervenções → VPL = custo inicial", () => {
    const r = calcularVPL({
      nome: "Preventivo",
      custoInicial_Rm2: 120,
      intervencoes: [],
      taxaDesconto: 0.03,
      horizonte_anos: 50,
    });
    expect(r.vpl_Rm2).toBe(120);
    expect(r.vpIntervencoes_Rm2).toBe(0);
  });

  it("intervenção futura tem VP < custo nominal", () => {
    const r = calcularVPL({
      nome: "Corretivo",
      custoInicial_Rm2: 100,
      intervencoes: [
        { descricao: "Reparo", idade_anos: 30, custo_Rm2: 500 },
      ],
      taxaDesconto: 0.03,
      horizonte_anos: 50,
    });
    expect(r.intervencoes[0].vpCusto_Rm2).toBeLessThan(500);
    expect(r.vpl_Rm2).toBeGreaterThan(100);
    expect(r.vpl_Rm2).toBeLessThan(600);
  });

  it("taxa = 0 → VP = custo nominal", () => {
    const r = calcularVPL({
      nome: "Sem desconto",
      custoInicial_Rm2: 100,
      intervencoes: [
        { descricao: "Reparo", idade_anos: 30, custo_Rm2: 500 },
      ],
      taxaDesconto: 0,
      horizonte_anos: 50,
    });
    expect(r.intervencoes[0].vpCusto_Rm2).toBeCloseTo(500, 0);
  });

  it("intervenção após horizonte é ignorada", () => {
    const r = calcularVPL({
      nome: "Test",
      custoInicial_Rm2: 100,
      intervencoes: [
        { descricao: "Fora", idade_anos: 60, custo_Rm2: 1000 },
      ],
      taxaDesconto: 0.03,
      horizonte_anos: 50,
    });
    expect(r.vpIntervencoes_Rm2).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MONTE CARLO
// ─────────────────────────────────────────────────────────────────────────────

describe("simularMonteCarlo", () => {
  it("gera N resultados", () => {
    const r = simularMonteCarlo(VARS_TIPICAS, { N: 500, seed: 42 });
    expect(r).toHaveLength(500);
  });

  it("resultados são reprodutíveis com mesma seed", () => {
    const r1 = simularMonteCarlo(VARS_TIPICAS, { N: 100, seed: 123 });
    const r2 = simularMonteCarlo(VARS_TIPICAS, { N: 100, seed: 123 });
    expect(r1).toEqual(r2);
  });

  it("seeds diferentes → resultados diferentes", () => {
    const r1 = simularMonteCarlo(VARS_TIPICAS, { N: 100, seed: 1 });
    const r2 = simularMonteCarlo(VARS_TIPICAS, { N: 100, seed: 2 });
    expect(r1[0].tVida_anos).not.toBe(r2[0].tVida_anos);
  });

  it("todos os resultados têm mecanismo definido", () => {
    const r = simularMonteCarlo(VARS_TIPICAS, { N: 200 });
    for (const res of r) {
      expect(["cloretos", "carbonatacao"]).toContain(res.mecanismo);
      expect(res.tIniciacao_anos).toBeGreaterThanOrEqual(0);
      expect(res.tVida_anos).toBeGreaterThan(0);
    }
  });

  it("sem K_c → todos cloretos", () => {
    const vars: VariaveisEstocasticas = { ...VARS_TIPICAS, Kc_mean: undefined };
    const r = simularMonteCarlo(vars, { N: 100 });
    expect(r.every((x) => x.mecanismo === "cloretos")).toBe(true);
  });

  it("rejeita N < 100", () => {
    expect(() => simularMonteCarlo(VARS_TIPICAS, { N: 10 })).toThrow(
      LifeEngineParametroInvalidoError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ESTATÍSTICAS
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularEstatisticas", () => {
  it("calcula estatísticas consistentes", () => {
    const r = simularMonteCarlo(VARS_TIPICAS, { N: 1000, seed: 42 });
    const est = calcularEstatisticas(r, 50);

    expect(est.media_anos).toBeGreaterThan(0);
    expect(est.desvio_anos).toBeGreaterThan(0);
    expect(est.p5_anos).toBeLessThanOrEqual(est.p50_anos);
    expect(est.p50_anos).toBeLessThanOrEqual(est.p95_anos);
    expect(est.Pf_projeto).toBeGreaterThanOrEqual(0);
    expect(est.Pf_projeto).toBeLessThanOrEqual(1);
    expect(typeof est.conforme).toBe("boolean");
  });

  it("P_f = 0 → β alto (≥ 5)", () => {
    // Cobrimento muito grande → nenhuma falha em 50 anos
    const vars: VariaveisEstocasticas = {
      ...VARS_TIPICAS,
      cob_mean_mm: 200,
      D28_mean: 1e-13,
    };
    const r = simularMonteCarlo(vars, { N: 500, seed: 42 });
    const est = calcularEstatisticas(r, 50);
    expect(est.Pf_projeto).toBe(0);
    expect(est.beta_projeto).toBeGreaterThanOrEqual(5);
    expect(est.conforme).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CURVA P_f
// ─────────────────────────────────────────────────────────────────────────────

describe("gerarCurvaPf", () => {
  it("gera curva com nPontos + 1 pontos", () => {
    const r = simularMonteCarlo(VARS_TIPICAS, { N: 500, seed: 42 });
    const curva = gerarCurvaPf(r, 100, 20);
    expect(curva).toHaveLength(21);
    expect(curva[0].Pf_combinada).toBe(0); // t = 0
  });

  it("P_f é monotonicamente crescente", () => {
    const r = simularMonteCarlo(VARS_TIPICAS, { N: 1000, seed: 42 });
    const curva = gerarCurvaPf(r);
    for (let i = 1; i < curva.length; i++) {
      expect(curva[i].Pf_combinada).toBeGreaterThanOrEqual(curva[i - 1].Pf_combinada);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HISTOGRAMA
// ─────────────────────────────────────────────────────────────────────────────

describe("gerarHistograma", () => {
  it("gera histograma com nFaixas faixas", () => {
    const r = simularMonteCarlo(VARS_TIPICAS, { N: 500, seed: 42 });
    const h = gerarHistograma(r, 10);
    expect(h).toHaveLength(10);
    const total = h.reduce((s, f) => s + f.contagem, 0);
    expect(total).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CENÁRIOS DEFAULT
// ─────────────────────────────────────────────────────────────────────────────

describe("gerarCenariosDefault", () => {
  it("gera 3 cenários", () => {
    const c = gerarCenariosDefault(60, 50);
    expect(c).toHaveLength(3);
    expect(c[0].nome).toContain("Preventivo");
    expect(c[1].nome).toContain("Corretivo");
    expect(c[2].nome).toContain("Negligente");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe("executarLifeEngine", () => {
  it("retorna resultado completo", () => {
    const r = executarLifeEngine({
      variaveis: VARS_TIPICAS,
      monteCarlo: { N: 1000, seed: 42 },
    });

    expect(r.estatisticas.media_anos).toBeGreaterThan(0);
    expect(r.curvaPf.length).toBeGreaterThan(0);
    expect(r.histograma.length).toBeGreaterThan(0);
    expect(r.vpl.length).toBe(3); // 3 cenários default
    expect(r.params.N).toBe(1000);
    expect(r.params.seed).toBe(42);
  });

  it("cenários VPL custom são usados", () => {
    const cenario: CenarioVPL = {
      nome: "Custom",
      custoInicial_Rm2: 200,
      intervencoes: [],
      taxaDesconto: 0.05,
      horizonte_anos: 50,
    };
    const r = executarLifeEngine({
      variaveis: VARS_TIPICAS,
      monteCarlo: { N: 200, seed: 42 },
      cenariosVPL: [cenario],
    });
    expect(r.vpl).toHaveLength(1);
    expect(r.vpl[0].nome).toBe("Custom");
    expect(r.vpl[0].vpl_Rm2).toBe(200);
  });

  it("é reprodutível", () => {
    const r1 = executarLifeEngine({
      variaveis: VARS_TIPICAS,
      monteCarlo: { N: 500, seed: 99 },
    });
    const r2 = executarLifeEngine({
      variaveis: VARS_TIPICAS,
      monteCarlo: { N: 500, seed: 99 },
    });
    expect(r1.estatisticas).toEqual(r2.estatisticas);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

describe("constantes", () => {
  it("BETA_ALVO = 1.5", () => {
    expect(BETA_ALVO).toBe(1.5);
  });

  it("CUSTOS_INTERVENCAO tem valores positivos", () => {
    for (const v of Object.values(CUSTOS_INTERVENCAO)) {
      expect(v).toBeGreaterThan(0);
    }
  });
});
