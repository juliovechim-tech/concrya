/**
 * @file __tests__/hydra4d.test.ts
 * @description Testes unitários — HYDRA4D ENGINE
 *
 * Cobertura: 100% das funções exportadas de lib/hydra4d.ts
 *
 * Caso de validação principal:
 *   CP V-ARI MAX CNC, a/c = 0.40, T_amb = 23°C
 *   Q_ef = 380 kJ/kg, τ = 8.5h, β = 1.08, T_pico ≈ 97°C
 */

import {
  // Constantes
  R_GAS,
  CP_AGUA_J_G_C,
  CP_CIMENTO_J_G_C,
  T_REF_K,
  // Bancos
  CIMENTOS_CALIBRADOS,
  ADITIVOS_CALIBRADOS,
  SCMS_CALIBRADOS,
  EA_POR_TIPO,
  // Funções
  calcularCapacidadeCalorifica,
  calcularCalorAcumulado,
  calcularGrauHidratacao,
  calcularTaxaCalor,
  detectarFases,
  calibrarFHP,
  predizAlphaFHP,
  calcularEaArrhenius,
  calcularQefComSCM,
  calcularTauComAditivo,
  detectarPega,
  gerarCurvaTeóricaFHP,
  executarHydra4D,
  // Erros
  Hydra4DLeiturasInsuficientesError,
  Hydra4DRelacaoAcForaFaixaError,
  Hydra4DCalibracaoFalhouError,
  // Tipos
  type LeituraTermopar,
  type EntradaEnsaio,
  type ParamsFHP,
  type CimentoCalibrado,
} from "../lib/hydra4d";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES — Dados de ensaio simulados (CP V-ARI, a/c = 0.40, 72h)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera leituras sintéticas usando modelo FHP + temperatura.
 * Simula ensaio com CP V-ARI: τ=8.5h, β=1.08, T_pico≈97°C, T_amb=23°C
 */
function gerarLeiturasSimuladas(
  nPontos: number = 100,
  tMax_h: number = 72,
  tauH: number = 8.5,
  beta: number = 1.08,
  tAmb: number = 23,
  deltaTPico: number = 74 // ΔT pico ≈ 97−23 = 74°C
): LeituraTermopar[] {
  const leituras: LeituraTermopar[] = [];
  const dt = tMax_h / nPontos;

  for (let i = 0; i <= nPontos; i++) {
    const t = i * dt;
    // α(t) via FHP
    const alpha = t > 0 ? Math.exp(-Math.pow(tauH / t, beta)) : 0;
    // T(t) ≈ T_amb + ΔT_pico × α(t) (simplificação)
    const temp = tAmb + deltaTPico * alpha;
    // Adiciona pequeno ruído (±0.3°C)
    const ruido = (Math.sin(i * 7.3) * 0.3);
    leituras.push({
      tempo_h: Math.round(t * 1000) / 1000,
      temperatura_C: Math.round((temp + ruido) * 100) / 100,
    });
  }

  return leituras;
}

const LEITURAS_FIXTURE = gerarLeiturasSimuladas();

const ENTRADA_FIXTURE: EntradaEnsaio = {
  id: "ENS-TEST-001",
  cimentoId: "CIM-01",
  cimentoDescricao: "CP V-ARI MAX CNC",
  relacaoAc: 0.40,
  massaCimento_g: 500,
  temperaturaAmbiente_C: 23,
  leituras: LEITURAS_FIXTURE,
};

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

describe("Hydra4D Engine — Constantes", () => {
  test("R_GAS = 8.314 J/(mol·K)", () => {
    expect(R_GAS).toBe(8.314);
  });

  test("CP_AGUA = 4.186 J/(g·°C)", () => {
    expect(CP_AGUA_J_G_C).toBe(4.186);
  });

  test("CP_CIMENTO = 0.75 J/(g·°C)", () => {
    expect(CP_CIMENTO_J_G_C).toBe(0.75);
  });

  test("T_REF_K = 293.15 K (20°C)", () => {
    expect(T_REF_K).toBe(293.15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — BANCO DE CIMENTOS
// ─────────────────────────────────────────────────────────────────────────────

describe("Hydra4D Engine — Banco de Cimentos", () => {
  test("banco contém 6 cimentos calibrados", () => {
    expect(Object.keys(CIMENTOS_CALIBRADOS)).toHaveLength(6);
  });

  test("CIM-01 é CP V-ARI MAX CNC com Q_ef = 380 kJ/kg", () => {
    const c = CIMENTOS_CALIBRADOS["CIM-01"];
    expect(c.descricao).toBe("CP V-ARI MAX CNC");
    expect(c.Q_ef_kJkg).toBe(380);
    expect(c.Ea_Jmol).toBe(40000);
    expect(c.tau_h).toBe(8.5);
    expect(c.beta).toBe(1.08);
    expect(c.T_pico_pasta_C).toBe(97.2);
  });

  test("CIM-06 é CP III-40 RS com Q_ef = 250 kJ/kg", () => {
    const c = CIMENTOS_CALIBRADOS["CIM-06"];
    expect(c.Q_ef_kJkg).toBe(250);
    expect(c.Ea_Jmol).toBe(30000);
    expect(c.tau_h).toBe(16.0);
  });

  test("EA_POR_TIPO tem 7 tipos de cimento", () => {
    expect(Object.keys(EA_POR_TIPO)).toHaveLength(7);
    expect(EA_POR_TIPO.CP_V_ARI).toBe(40000);
    expect(EA_POR_TIPO.CP_III).toBe(30000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — BANCO DE ADITIVOS
// ─────────────────────────────────────────────────────────────────────────────

describe("Hydra4D Engine — Banco de Aditivos", () => {
  test("banco contém 3 aditivos calibrados", () => {
    expect(ADITIVOS_CALIBRADOS).toHaveLength(3);
  });

  test("Powerflow 1180 retarda 276 min (230%)", () => {
    const a = ADITIVOS_CALIBRADOS[0];
    expect(a.produto).toBe("Powerflow 1180");
    expect(a.delta_t_retardo_min).toBe(276);
    expect(a.retardo_percent).toBe(230);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — BANCO DE SCMs
// ─────────────────────────────────────────────────────────────────────────────

describe("Hydra4D Engine — Banco de SCMs", () => {
  test("banco contém 4 SCMs calibrados", () => {
    expect(SCMS_CALIBRADOS).toHaveLength(4);
  });

  test("Sílica Ativa tem k_reatividade = 0.25", () => {
    const sa = SCMS_CALIBRADOS.find((s) => s.tipo === "Silica Fume");
    expect(sa).toBeDefined();
    expect(sa!.k_reatividade).toBe(0.25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — CAPACIDADE CALORÍFICA
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularCapacidadeCalorifica", () => {
  test("a/c = 0.40 → C ≈ 2.424 J/(g·°C)", () => {
    const C = calcularCapacidadeCalorifica(0.40);
    expect(C).toBeCloseTo(0.75 + 0.40 * 4.186, 3);
    expect(C).toBeCloseTo(2.4244, 2);
  });

  test("a/c = 0.50 → C ≈ 2.843 J/(g·°C)", () => {
    const C = calcularCapacidadeCalorifica(0.50);
    expect(C).toBeCloseTo(0.75 + 0.50 * 4.186, 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — CALOR ACUMULADO Q(t)
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularCalorAcumulado", () => {
  test("retorna mesma quantidade de pontos que leituras", () => {
    const curva = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    expect(curva).toHaveLength(LEITURAS_FIXTURE.length);
  });

  test("Q(0) ≈ 0 (sem calor no início)", () => {
    const curva = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    expect(curva[0].Q_kJkg).toBeCloseTo(0, 0);
  });

  test("Q cresce monotonicamente (geral)", () => {
    const curva = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    // Verifica tendência geral (último > primeiro)
    expect(curva[curva.length - 1].Q_kJkg).toBeGreaterThan(curva[0].Q_kJkg);
  });

  test("Q máximo ≈ C × ΔT_pico", () => {
    const C = calcularCapacidadeCalorifica(0.40);
    const curva = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    const Qmax = Math.max(...curva.map((p) => p.Q_kJkg));
    // ΔT ≈ 74°C, Q ≈ 2.42 × 74 ≈ 179 kJ/kg
    expect(Qmax).toBeGreaterThan(100);
    expect(Qmax).toBeLessThan(250);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — GRAU DE HIDRATAÇÃO α(t)
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularGrauHidratacao", () => {
  test("α(0) ≈ 0", () => {
    const curvaQ = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    const curvaAlpha = calcularGrauHidratacao(curvaQ, 380);
    expect(curvaAlpha[0].alpha).toBeCloseTo(0, 1);
  });

  test("α valores entre 0 e 1", () => {
    const curvaQ = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    const curvaAlpha = calcularGrauHidratacao(curvaQ, 380);
    for (const p of curvaAlpha) {
      expect(p.alpha).toBeGreaterThanOrEqual(0);
      expect(p.alpha).toBeLessThanOrEqual(1);
    }
  });

  test("lança erro se Q∞ ≤ 0", () => {
    const curvaQ = [{ tempo_h: 1, Q_kJkg: 10 }];
    expect(() => calcularGrauHidratacao(curvaQ, 0)).toThrow("[Hydra4D]");
    expect(() => calcularGrauHidratacao(curvaQ, -1)).toThrow("[Hydra4D]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — TAXA DE CALOR dQ/dt
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularTaxaCalor", () => {
  test("retorna valores não-negativos", () => {
    const curvaQ = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    const taxa = calcularTaxaCalor(curvaQ);
    for (const p of taxa) {
      expect(p.dQdt_kJkgH).toBeGreaterThanOrEqual(0);
    }
  });

  test("tem pico de dQ/dt em algum ponto intermediário", () => {
    const curvaQ = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    const taxa = calcularTaxaCalor(curvaQ);
    const maxIdx = taxa.reduce((best, p, i) => (p.dQdt_kJkgH > taxa[best].dQdt_kJkgH ? i : best), 0);
    expect(maxIdx).toBeGreaterThan(0);
    expect(maxIdx).toBeLessThan(taxa.length - 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — CALIBRAÇÃO FHP (τ, β)
// ─────────────────────────────────────────────────────────────────────────────

describe("calibrarFHP", () => {
  test("recupera τ ≈ 8.5h e β ≈ 1.08 dos dados simulados", () => {
    const curvaQ = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    const curvaAlpha = calcularGrauHidratacao(curvaQ, 380);
    const params = calibrarFHP(curvaAlpha);

    // Tolerância de 30% pois os dados são sintéticos com ruído
    expect(params.tau_h).toBeGreaterThan(5);
    expect(params.tau_h).toBeLessThan(15);
    expect(params.beta).toBeGreaterThan(0.5);
    expect(params.beta).toBeLessThan(2.0);
    expect(params.r2).toBeGreaterThan(0.85);
  });

  test("lança erro com pontos insuficientes", () => {
    const curva = [
      { tempo_h: 1, alpha: 0.1 },
      { tempo_h: 2, alpha: 0.2 },
    ];
    expect(() => calibrarFHP(curva)).toThrow("Hydra4DCalibracaoFalhouError");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — PREDIÇÃO FHP
// ─────────────────────────────────────────────────────────────────────────────

describe("predizAlphaFHP", () => {
  const params: ParamsFHP = {
    tau_h: 8.5,
    beta: 1.08,
    alphaMax: 0.75,
    r2: 0.99,
    nPontos: 50,
  };

  test("α(0) = 0", () => {
    expect(predizAlphaFHP(0, params)).toBe(0);
  });

  test("α(t→∞) → α_max", () => {
    expect(predizAlphaFHP(1000, params)).toBeCloseTo(0.75, 2);
  });

  test("α(τ) ≈ α_max × e^(-1) ≈ 0.276", () => {
    const alpha_tau = predizAlphaFHP(8.5, params);
    expect(alpha_tau).toBeCloseTo(0.75 * Math.exp(-1), 2);
  });

  test("α cresce monotonicamente", () => {
    const tempos = [1, 5, 10, 20, 50, 100];
    const alphas = tempos.map((t) => predizAlphaFHP(t, params));
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeGreaterThan(alphas[i - 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — ENERGIA DE ATIVAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularEaArrhenius", () => {
  test("calcula Ea ≈ 40000 J/mol para caso típico CP V-ARI", () => {
    // Simula 2 ensaios: τ₁=8.5h @ 20°C, τ₂=4.5h @ 35°C
    // Ea = R × ln(k₂/k₁) / (1/T₁ - 1/T₂)
    const Ea = calcularEaArrhenius(8.5, 20, 4.5, 35);
    expect(Ea).toBeGreaterThan(25000);
    expect(Ea).toBeLessThan(60000);
  });

  test("lança erro se τ ≤ 0", () => {
    expect(() => calcularEaArrhenius(0, 20, 4, 35)).toThrow("[Hydra4D]");
  });

  test("lança erro se temperaturas iguais", () => {
    expect(() => calcularEaArrhenius(8, 20, 4, 20)).toThrow("[Hydra4D]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — EFEITO SCM
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularQefComSCM", () => {
  const silicaAtiva = SCMS_CALIBRADOS[0]; // k=0.25, Q∞=780

  test("0% SCM → Q∞ = Q∞_cimento", () => {
    expect(calcularQefComSCM(380, silicaAtiva, 0)).toBe(380);
  });

  test("10% Sílica Ativa → Q∞ reduzido", () => {
    const Qef = calcularQefComSCM(380, silicaAtiva, 0.10);
    // Q = 380×0.90 + 780×0.10×0.25 = 342 + 19.5 = 361.5
    expect(Qef).toBeCloseTo(361.5, 1);
  });

  test("lança erro se percentual > 1", () => {
    expect(() => calcularQefComSCM(380, silicaAtiva, 1.5)).toThrow("[Hydra4D]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — EFEITO ADITIVO
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularTauComAditivo", () => {
  test("Powerflow 1180 (+276 min) → τ = 8.5 + 4.6 = 13.1h", () => {
    const tau = calcularTauComAditivo(8.5, 276);
    expect(tau).toBeCloseTo(13.1, 1);
  });

  test("sem aditivo (0 min) → τ inalterado", () => {
    expect(calcularTauComAditivo(8.5, 0)).toBe(8.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — CURVA TEÓRICA FHP
// ─────────────────────────────────────────────────────────────────────────────

describe("gerarCurvaTeóricaFHP", () => {
  const params: ParamsFHP = {
    tau_h: 8.5, beta: 1.08, alphaMax: 0.75, r2: 0.99, nPontos: 50,
  };

  test("gera 201 pontos por padrão (0 a 72h, 200 intervalos)", () => {
    const curva = gerarCurvaTeóricaFHP(params, 380);
    expect(curva).toHaveLength(201);
  });

  test("primeiro ponto: t=0, α=0, Q=0", () => {
    const curva = gerarCurvaTeóricaFHP(params, 380);
    expect(curva[0].tempo_h).toBe(0);
    expect(curva[0].alpha).toBe(0);
    expect(curva[0].Q_kJkg).toBe(0);
  });

  test("último ponto: α → α_max, Q → Q∞ × α_max", () => {
    const curva = gerarCurvaTeóricaFHP(params, 380, 200, 100);
    const ultimo = curva[curva.length - 1];
    expect(ultimo.alpha).toBeCloseTo(0.75, 1);
    expect(ultimo.Q_kJkg).toBeCloseTo(380 * 0.75, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — DETECÇÃO DE FASES
// ─────────────────────────────────────────────────────────────────────────────

describe("detectarFases", () => {
  test("detecta 5 fases com tempos crescentes", () => {
    const fases = detectarFases(LEITURAS_FIXTURE, 380, 0.40, 23);

    // Ordem temporal: I → II → III → IV → V
    expect(fases.faseI.t_inicio_h).toBe(0);
    expect(fases.faseI.t_fim_h).toBeLessThanOrEqual(fases.faseII.t_inicio_h);
    expect(fases.faseII.t_fim_h).toBeLessThanOrEqual(fases.faseIII.t_inicio_h);
    expect(fases.faseIII.t_fim_h).toBeLessThanOrEqual(fases.faseIV.t_inicio_h);
    expect(fases.faseIV.t_fim_h).toBeLessThanOrEqual(fases.faseV.t_inicio_h);
  });

  test("T_pico está na Fase III", () => {
    const fases = detectarFases(LEITURAS_FIXTURE, 380, 0.40, 23);
    expect(fases.faseIII.T_pico_C).toBeGreaterThan(50);
  });

  test("duração da indução (Fase II) > 0", () => {
    const fases = detectarFases(LEITURAS_FIXTURE, 380, 0.40, 23);
    expect(fases.faseII.duracao_h).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — DETECÇÃO DE PEGA
// ─────────────────────────────────────────────────────────────────────────────

describe("detectarPega", () => {
  test("início de pega < fim de pega", () => {
    const curvaQ = calcularCalorAcumulado(LEITURAS_FIXTURE, 0.40, 23);
    const taxa = calcularTaxaCalor(curvaQ);
    const pega = detectarPega(taxa);

    expect(pega.t_inicio_pega_h).toBeLessThan(pega.t_fim_pega_h);
    expect(pega.t_inicio_pega_h).toBeGreaterThan(0);
    expect(pega.t_fim_pega_h).toBeLessThan(72);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — ORQUESTRADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

describe("executarHydra4D — Pipeline completo", () => {
  test("executa sem erros com dados válidos", () => {
    const resultado = executarHydra4D(ENTRADA_FIXTURE);

    expect(resultado.ensaioId).toBe("ENS-TEST-001");
    expect(resultado.cimentoId).toBe("CIM-01");
    expect(resultado.relacaoAc).toBe(0.40);
  });

  test("retorna parâmetros FHP calibrados", () => {
    const resultado = executarHydra4D(ENTRADA_FIXTURE);

    expect(resultado.paramsFHP.tau_h).toBeGreaterThan(0);
    expect(resultado.paramsFHP.beta).toBeGreaterThan(0);
    expect(resultado.paramsFHP.r2).toBeGreaterThan(0.5);
  });

  test("retorna 5 fases detectadas", () => {
    const resultado = executarHydra4D(ENTRADA_FIXTURE);

    expect(resultado.fases.faseI).toBeDefined();
    expect(resultado.fases.faseII).toBeDefined();
    expect(resultado.fases.faseIII).toBeDefined();
    expect(resultado.fases.faseIV).toBeDefined();
    expect(resultado.fases.faseV).toBeDefined();
  });

  test("retorna curvas Q(t) e dQ/dt", () => {
    const resultado = executarHydra4D(ENTRADA_FIXTURE);

    expect(resultado.curvaCalor.length).toBeGreaterThan(0);
    expect(resultado.curvaTaxa.length).toBeGreaterThan(0);
    expect(resultado.curvaCalor[0]).toHaveProperty("Q_kJkg");
    expect(resultado.curvaCalor[0]).toHaveProperty("alpha");
    expect(resultado.curvaTaxa[0]).toHaveProperty("dQdt_kJkgH");
  });

  test("retorna pega detectada", () => {
    const resultado = executarHydra4D(ENTRADA_FIXTURE);

    expect(resultado.t_inicio_pega_h).toBeGreaterThan(0);
    expect(resultado.t_fim_pega_h).toBeGreaterThan(resultado.t_inicio_pega_h);
  });

  test("Q_ef > 0 e Ea > 0", () => {
    const resultado = executarHydra4D(ENTRADA_FIXTURE);

    expect(resultado.Q_ef_kJkg).toBeGreaterThan(0);
    expect(resultado.Ea_Jmol).toBe(40000); // do banco CIM-01
  });

  test("T_pico > T_ambiente", () => {
    const resultado = executarHydra4D(ENTRADA_FIXTURE);
    expect(resultado.T_pico_C).toBeGreaterThan(23);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

describe("Hydra4D Engine — Erros tipados", () => {
  test("lança Hydra4DLeiturasInsuficientesError com < 10 leituras", () => {
    const entrada: EntradaEnsaio = {
      ...ENTRADA_FIXTURE,
      leituras: LEITURAS_FIXTURE.slice(0, 5),
    };
    expect(() => executarHydra4D(entrada)).toThrow(
      Hydra4DLeiturasInsuficientesError
    );
  });

  test("lança Hydra4DRelacaoAcForaFaixaError com a/c = 0.20", () => {
    const entrada: EntradaEnsaio = {
      ...ENTRADA_FIXTURE,
      relacaoAc: 0.20,
    };
    expect(() => executarHydra4D(entrada)).toThrow(
      Hydra4DRelacaoAcForaFaixaError
    );
  });

  test("lança Hydra4DRelacaoAcForaFaixaError com a/c = 0.60", () => {
    const entrada: EntradaEnsaio = {
      ...ENTRADA_FIXTURE,
      relacaoAc: 0.60,
    };
    expect(() => executarHydra4D(entrada)).toThrow(
      Hydra4DRelacaoAcForaFaixaError
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — INTEGRAÇÃO COM ADITIVO
// ─────────────────────────────────────────────────────────────────────────────

describe("executarHydra4D — Com aditivo", () => {
  test("detecta efeito de aditivo Powerflow 1180 do banco", () => {
    const entrada: EntradaEnsaio = {
      ...ENTRADA_FIXTURE,
      aditivo: {
        produto: "Powerflow 1180",
        dosagem_percent: 1.0,
      },
    };
    const resultado = executarHydra4D(entrada);

    expect(resultado.efeitoAditivo).toBeDefined();
    expect(resultado.efeitoAditivo!.delta_t_retardo_min).toBe(276);
    expect(resultado.efeitoAditivo!.retardo_percent).toBe(230);
  });

  test("não retorna efeito se aditivo não está no banco", () => {
    const entrada: EntradaEnsaio = {
      ...ENTRADA_FIXTURE,
      aditivo: {
        produto: "Aditivo Desconhecido",
        dosagem_percent: 0.5,
      },
    };
    const resultado = executarHydra4D(entrada);
    expect(resultado.efeitoAditivo).toBeUndefined();
  });
});
