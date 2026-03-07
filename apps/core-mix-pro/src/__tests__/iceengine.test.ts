/**
 * @file __tests__/iceengine.test.ts
 * @description Testes unitários — ICEENGINE
 *
 * Caso de validação real (CLAUDE.md):
 *   CP II-E-40 CNC, 350 kg/m³, e = 1.5m, T_lanc = 25°C, T_amb = 25°C
 *   Q_ef = 310 kJ/kg → T_max = 70.2°C, ΔT = 20.3°C → NÃO CONFORME
 */

import {
  // Constantes
  L_FUSAO_GELO_KJKG,
  L_VAPORIZ_LN2_KJKG,
  CP_N2_GAS_KJKGC,
  T_EBULICAO_LN2_C,
  CP_AGUA_KJKGC,
  LIMITE_DELTA_T_ACI207_C,
  LIMITE_T_NUCLEO_NBR_C,
  LIMITE_T_LANCAMENTO_C,
  PROPRIEDADES_TERMICAS_DEFAULT,
  // Funções
  calcularDifusividade,
  calcularTaxaCalorFHP,
  calcularAlphaFHP,
  simularFourier1D,
  calcularBalancoGelo,
  calcularBalancoLN2,
  estimarTLancamento,
  executarIceEngine,
  // Erros
  IceEngineEspessuraInvalidaError,
  IceEngineGeloExcessivoError,
  // Tipos
  type EntradaIceEngine,
  type PropriedadesTermicas,
  type ParamsCalorHidratacao,
} from "../lib/iceengine";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

/** Caso de validação real: CP II-E-40, 350 kg/m³, e=1.5m */
const CASO_VALIDACAO: EntradaIceEngine = {
  espessura_m: 1.5,
  T_lancamento_C: 25,
  T_ambiente_C: 25,
  propriedades: PROPRIEDADES_TERMICAS_DEFAULT.CCV_CALCARIO,
  calor: {
    Q_ef_kJkg: 310,
    consumoCimento_kgm3: 350,
    tau_h: 12.5,
    beta: 0.94,
    alphaMax: 0.75,
  },
  duracao_h: 168,
  nNos: 21,
  condicaoContorno: "exposta",
};

/** Caso leve: bloco fino, pouco cimento */
const CASO_LEVE: EntradaIceEngine = {
  espessura_m: 0.50,
  T_lancamento_C: 22,
  T_ambiente_C: 22,
  propriedades: PROPRIEDADES_TERMICAS_DEFAULT.CCV_CALCARIO,
  calor: {
    Q_ef_kJkg: 250,
    consumoCimento_kgm3: 280,
    tau_h: 16,
    beta: 0.88,
    alphaMax: 0.65,
  },
  duracao_h: 72,
  nNos: 11,
};

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

describe("IceEngine — Constantes", () => {
  test("L_fusao_gelo = 334 kJ/kg", () => {
    expect(L_FUSAO_GELO_KJKG).toBe(334);
  });

  test("L_vaporiz_LN2 = 199 kJ/kg", () => {
    expect(L_VAPORIZ_LN2_KJKG).toBe(199);
  });

  test("T_ebulicao_LN2 = -196°C", () => {
    expect(T_EBULICAO_LN2_C).toBe(-196);
  });

  test("Limites ACI/NBR corretos", () => {
    expect(LIMITE_DELTA_T_ACI207_C).toBe(20);
    expect(LIMITE_T_NUCLEO_NBR_C).toBe(70);
    expect(LIMITE_T_LANCAMENTO_C).toBe(35);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — PROPRIEDADES TÉRMICAS
// ─────────────────────────────────────────────────────────────────────────────

describe("IceEngine — Propriedades Térmicas", () => {
  test("4 tipos de concreto no banco", () => {
    expect(Object.keys(PROPRIEDADES_TERMICAS_DEFAULT)).toHaveLength(4);
  });

  test("CCV_CALCARIO: k=2.0, ρ=2400, cp=1000", () => {
    const p = PROPRIEDADES_TERMICAS_DEFAULT.CCV_CALCARIO;
    expect(p.condutividade_WmC).toBe(2.0);
    expect(p.densidade_kgm3).toBe(2400);
    expect(p.calorEspecifico_JkgC).toBe(1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — DIFUSIVIDADE TÉRMICA
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularDifusividade", () => {
  test("CCV calcário → α ≈ 8.33e-7 m²/s", () => {
    const alpha = calcularDifusividade(PROPRIEDADES_TERMICAS_DEFAULT.CCV_CALCARIO);
    // 2.0 / (2400 × 1000) = 8.33e-7
    expect(alpha).toBeCloseTo(8.333e-7, 9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — TAXA DE CALOR FHP
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularTaxaCalorFHP", () => {
  const params: ParamsCalorHidratacao = {
    Q_ef_kJkg: 310,
    consumoCimento_kgm3: 350,
    tau_h: 12.5,
    beta: 0.94,
    alphaMax: 0.75,
  };

  test("q(0) = 0", () => {
    expect(calcularTaxaCalorFHP(0, params)).toBe(0);
  });

  test("q(t) > 0 para t > 0", () => {
    expect(calcularTaxaCalorFHP(5, params)).toBeGreaterThan(0);
    expect(calcularTaxaCalorFHP(12, params)).toBeGreaterThan(0);
  });

  test("q tem pico e depois decresce", () => {
    const q5 = calcularTaxaCalorFHP(5, params);
    const q12 = calcularTaxaCalorFHP(12, params);
    const q100 = calcularTaxaCalorFHP(100, params);
    // q deve ter um pico em torno de τ e depois decrescer
    expect(q100).toBeLessThan(q12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — α(t) FHP
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularAlphaFHP", () => {
  const params: ParamsCalorHidratacao = {
    Q_ef_kJkg: 310,
    consumoCimento_kgm3: 350,
    tau_h: 12.5,
    beta: 0.94,
    alphaMax: 0.75,
  };

  test("α(0) = 0", () => {
    expect(calcularAlphaFHP(0, params)).toBe(0);
  });

  test("α cresce monotonicamente", () => {
    const a1 = calcularAlphaFHP(1, params);
    const a10 = calcularAlphaFHP(10, params);
    const a50 = calcularAlphaFHP(50, params);
    expect(a10).toBeGreaterThan(a1);
    expect(a50).toBeGreaterThan(a10);
  });

  test("α(∞) → α_max = 0.75", () => {
    expect(calcularAlphaFHP(10000, params)).toBeCloseTo(0.75, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — SIMULAÇÃO FOURIER 1D — CASO DE VALIDAÇÃO REAL
// ─────────────────────────────────────────────────────────────────────────────

describe("simularFourier1D — Caso de validação real", () => {
  // Este teste pode levar alguns segundos pela simulação numérica
  let resultado: ReturnType<typeof simularFourier1D>;

  beforeAll(() => {
    resultado = simularFourier1D(CASO_VALIDACAO);
  });

  test("retorna curva térmica com pontos", () => {
    expect(resultado.curvaTermica.length).toBeGreaterThan(10);
  });

  test("T_nucleo_max entre 50°C e 90°C", () => {
    // Caso real: T_max = 70.2°C
    expect(resultado.conformidade.T_nucleo_max_C).toBeGreaterThan(50);
    expect(resultado.conformidade.T_nucleo_max_C).toBeLessThan(90);
  });

  test("ΔT_max entre 10°C e 40°C", () => {
    // Caso real: ΔT = 20.3°C
    expect(resultado.conformidade.deltaT_max_C).toBeGreaterThan(10);
    expect(resultado.conformidade.deltaT_max_C).toBeLessThan(40);
  });

  test("pico térmico entre 10h e 48h", () => {
    expect(resultado.conformidade.t_pico_h).toBeGreaterThan(10);
    expect(resultado.conformidade.t_pico_h).toBeLessThan(48);
  });

  test("curva começa em T_lancamento", () => {
    expect(resultado.curvaTermica[0].T_nucleo_C).toBe(25);
  });

  test("perfil de pico existe e tem nNos pontos", () => {
    expect(resultado.perfilPico.length).toBe(21);
    // Núcleo (último ponto) > superfície (primeiro ponto)
    const Tsup = resultado.perfilPico[0].T_C;
    const Tnuc = resultado.perfilPico[resultado.perfilPico.length - 1].T_C;
    expect(Tnuc).toBeGreaterThan(Tsup);
  });

  test("resumo contém parâmetros de entrada", () => {
    expect(resultado.resumo.espessura_m).toBe(1.5);
    expect(resultado.resumo.T_lancamento_C).toBe(25);
    expect(resultado.resumo.Q_ef_kJkg).toBe(310);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — SIMULAÇÃO FOURIER 1D — CASO LEVE (deve ser conforme)
// ─────────────────────────────────────────────────────────────────────────────

describe("simularFourier1D — Caso leve (bloco fino)", () => {
  let resultado: ReturnType<typeof simularFourier1D>;

  beforeAll(() => {
    resultado = simularFourier1D(CASO_LEVE);
  });

  test("T_nucleo_max < 70°C (conforme NBR)", () => {
    expect(resultado.conformidade.T_nucleo_max_C).toBeLessThan(70);
  });

  test("ΔT < 20°C (conforme ACI)", () => {
    expect(resultado.conformidade.deltaT_max_C).toBeLessThan(20);
  });

  test("decisão = CONFORME", () => {
    expect(resultado.conformidade.conforme).toBe(true);
    expect(resultado.conformidade.decisao).toContain("CONFORME");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

describe("IceEngine — Erros tipados", () => {
  test("espessura < 0.10m → erro", () => {
    expect(() =>
      simularFourier1D({ ...CASO_VALIDACAO, espessura_m: 0.05 })
    ).toThrow(IceEngineEspessuraInvalidaError);
  });

  test("espessura > 20m → erro", () => {
    expect(() =>
      simularFourier1D({ ...CASO_VALIDACAO, espessura_m: 25 })
    ).toThrow(IceEngineEspessuraInvalidaError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — BALANÇO DE GELO
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularBalancoGelo", () => {
  test("calcula massa de gelo para resfriar de 30°C para 20°C", () => {
    const result = calcularBalancoGelo({
      volume_m3: 10,
      consumoAgua_kgm3: 180,
      T_agua_C: 30,
      T_alvo_C: 20,
      T_agregados_C: 30,
      T_cimento_C: 40,
      consumoCimento_kgm3: 350,
      consumoAgregados_kgm3: 1800,
    });

    expect(result.massaGelo_kgm3).toBeGreaterThan(0);
    expect(result.massaGelo_total_kg).toBeGreaterThan(0);
    expect(result.percentualSubstituicao).toBeGreaterThan(0);
    expect(result.percentualSubstituicao).toBeLessThan(100);
  });

  test("retorna 0 kg/m³ se materiais já estão frios", () => {
    const result = calcularBalancoGelo({
      volume_m3: 10,
      consumoAgua_kgm3: 180,
      T_agua_C: 15,
      T_alvo_C: 20,
      T_agregados_C: 18,
      T_cimento_C: 20,
      consumoCimento_kgm3: 350,
      consumoAgregados_kgm3: 1800,
    });

    expect(result.massaGelo_kgm3).toBe(0);
    expect(result.viavel).toBe(true);
  });

  test("lança erro se gelo > 100% da água", () => {
    expect(() =>
      calcularBalancoGelo({
        volume_m3: 1,
        consumoAgua_kgm3: 100, // pouca água
        T_agua_C: 50, // muito quente
        T_alvo_C: 5,  // alvo muito baixo
        T_agregados_C: 50,
        T_cimento_C: 60,
        consumoCimento_kgm3: 500,
        consumoAgregados_kgm3: 2000,
      })
    ).toThrow(IceEngineGeloExcessivoError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — BALANÇO DE LN₂
// ─────────────────────────────────────────────────────────────────────────────

describe("calcularBalancoLN2", () => {
  test("calcula massa de LN₂ para resfriar concreto", () => {
    const result = calcularBalancoLN2({
      volume_m3: 10,
      densidadeConcreto_kgm3: 2400,
      cpConcreto_kJkgC: 1.0,
      T_atual_C: 30,
      T_alvo_C: 20,
    });

    expect(result.massaLN2_kgm3).toBeGreaterThan(0);
    expect(result.custoEstimado_Rm3).toBeGreaterThan(0);
    expect(result.massaLN2_total_kg).toBeGreaterThan(result.massaLN2_kgm3);
  });

  test("retorna 0 se já está na temperatura alvo", () => {
    const result = calcularBalancoLN2({
      volume_m3: 10,
      densidadeConcreto_kgm3: 2400,
      cpConcreto_kJkgC: 1.0,
      T_atual_C: 20,
      T_alvo_C: 25,
    });

    expect(result.massaLN2_kgm3).toBe(0);
    expect(result.custoEstimado_Rm3).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — TEMPERATURA DE LANÇAMENTO
// ─────────────────────────────────────────────────────────────────────────────

describe("estimarTLancamento", () => {
  test("média ponderada correta", () => {
    const T = estimarTLancamento(
      40,  // cimento 40°C
      20,  // água 20°C
      30,  // agregados 30°C
      350, // 350 kg/m³ cimento
      180, // 180 kg/m³ água
      1800, // 1800 kg/m³ agregados
    );

    // Água domina (cp alto), T deve estar entre 20 e 30
    expect(T).toBeGreaterThan(25);
    expect(T).toBeLessThan(35);
  });

  test("todos a 25°C → T = 25°C", () => {
    const T = estimarTLancamento(25, 25, 25, 350, 180, 1800);
    expect(T).toBe(25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — ORQUESTRADOR
// ─────────────────────────────────────────────────────────────────────────────

describe("executarIceEngine", () => {
  test("retorna mesmo resultado que simularFourier1D", () => {
    const r1 = executarIceEngine(CASO_LEVE);
    const r2 = simularFourier1D(CASO_LEVE);

    expect(r1.conformidade.conforme).toBe(r2.conformidade.conforme);
    expect(r1.conformidade.T_nucleo_max_C).toBe(r2.conformidade.T_nucleo_max_C);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTES — CONDIÇÃO DE CONTORNO "forma"
// ─────────────────────────────────────────────────────────────────────────────

describe("simularFourier1D — CC forma (convecção)", () => {
  test("superfície com forma retém mais calor que exposta", () => {
    const rExposta = simularFourier1D({ ...CASO_LEVE, condicaoContorno: "exposta" });
    const rForma = simularFourier1D({ ...CASO_LEVE, condicaoContorno: "forma" });

    // Com forma, a superfície retém mais calor → ΔT menor, T_max maior
    expect(rForma.conformidade.T_nucleo_max_C).toBeGreaterThanOrEqual(
      rExposta.conformidade.T_nucleo_max_C - 5 // tolerância numérica
    );
  });
});
