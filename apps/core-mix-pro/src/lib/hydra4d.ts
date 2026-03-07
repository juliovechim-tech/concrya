/**
 * @file lib/hydra4d.ts
 * @description HYDRA4D ENGINE — Motor de Calorimetria Semi-Adiabática
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MODELO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A calorimetria semi-adiabática (ensaio Langavant, NF EN 196-9 / ASTM C186)
 * mede a evolução de temperatura de uma pasta de cimento em calorímetro
 * parcialmente isolado. A perda de calor para o ambiente é corrigida pelo
 * coeficiente de perda térmica (α_perda [J/(s·°C)]) do calorímetro.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CALOR ACUMULADO — Correção semi-adiabática
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   Q(t) = C_cal × ΔT(t) + α_perda × ∫₀ᵗ ΔT(τ) dτ              … (1)
 *
 * Onde:
 *   Q(t)       = calor acumulado no tempo t — J/g_cimento
 *   C_cal      = capacidade calorífica do calorímetro — J/(g·°C)
 *   ΔT(t)      = T_pasta(t) − T_ambiente(t)
 *   α_perda    = coeficiente de perda térmica — J/(s·°C·g)
 *
 * Simplificação adotada (calorímetro CONCRYA / garrafa térmica):
 *   α_perda ≈ 0  →  Q(t) ≈ C_pasta × ΔT(t)                      … (1')
 *   C_pasta = (m_cimento × cp_cimento + m_agua × cp_agua) / m_cimento
 *
 * ───────────────────────────────────────────────────────────────────────────
 * GRAU DE HIDRATAÇÃO — α(t)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   α(t) = Q(t) / Q∞                                              … (2)
 *
 * Onde Q∞ é o calor total de hidratação completa do cimento [J/g].
 * Para cimentos Portland brasileiros:
 *   Q∞ ≈ 380–500 J/g  (CP V-ARI)
 *   Q∞ ≈ 250–350 J/g  (CP III-40 RS, CP IV-32)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODELO FHP — Freiesleben Hansen & Pedersen (1977)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   α(t_e) = α_max × exp[ −(τ / t_e)^β ]                         … (3)
 *
 * Linearização para calibração OLS:
 *   ln(−ln(α/α_max)) = β × ln(τ) − β × ln(t_e)                   … (3')
 *   y = A + B × x  →  τ = exp(−A/B),  β = −B
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ENERGIA DE ATIVAÇÃO — Método das velocidades (ASTM C1074 §7.2)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Com ensaios a pelo menos 2 temperaturas (T₁, T₂):
 *   Ea = R × ln(k₂/k₁) / (1/T₁ − 1/T₂)                          … (4)
 *
 * Onde k = 1/τ (taxa de reação) e T em Kelvin.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 5 FASES DA HIDRATAÇÃO — Detecção automática
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   Fase I   — Dissolução:   dQ/dt máximo local nos primeiros 30 min
 *   Fase II  — Indução:      platô (dQ/dt ≈ 0), janela de trabalhabilidade
 *   Fase III — Aceleração:   dQ/dt máximo principal → pico de temperatura
 *   Fase IV  — Desaceleração: d²Q/dt² < 0, inflexão descendente
 *   Fase V   — Difusão:      estado estacionário, α → α∞
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EFEITO DE SCMs (Supplementary Cementitious Materials)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   Q∞_ef = Q∞_cimento × (1 − %SCM) + Q∞_SCM × %SCM × k_reatividade  … (5)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EFEITO DE ADITIVOS RETARDADORES
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   τ_ef = τ_base × (1 + Δt_retardo/τ_base)                       … (6)
 *   Onde Δt_retardo é medido no ensaio com aditivo vs. referência
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1]  NF EN 196-9:2010 — Méthodes d'essais des ciments — Chaleur d'hydratation
 *   [2]  ASTM C186-17 — Standard Test Method for Heat of Hydration
 *   [3]  ASTM C1074-19 — Standard Practice for Estimating Concrete Strength
 *        by the Maturity Method (§7.2 — Activation Energy)
 *   [4]  Freiesleben Hansen, P. & Pedersen, E.J. (1977). Maturity computer
 *        for controlled curing and hardening of concrete. Nordisk Betong.
 *   [5]  Schindler, A.K. & Folliard, K.J. (2005). Heat of Hydration Models
 *        for Cementitious Materials. ACI Materials Journal, 102(1), 24–33.
 *   [6]  De Schutter, G. & Taerwe, L. (1996). Degree of hydration based
 *        description of mechanical properties. Cement and Concrete Research.
 *   [7]  Mehta, P.K. & Monteiro, P.J.M. (2014). Concrete: Microstructure,
 *        Properties, and Materials. 4th ed. McGraw-Hill.
 *   [8]  Neville, A.M. (2016). Properties of Concrete. 5th ed. Pearson.
 *   [9]  CNC ASSTEC-018 (2017) — Relatório de ensaio Powerflow 1180.
 *   [10] MC-Bauchemie ECOVERDE (s.d.) — Boletim Techniflow 560.
 *   [11] Vechim, J. (2026). Calorimetria semi-adiabática para controle de
 *        hidratação — Dissertação de Mestrado. Unisinos / São Judas.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES FÍSICAS
// ─────────────────────────────────────────────────────────────────────────────

/** Constante universal dos gases — J/(mol·K) */
export const R_GAS = 8.314;

/** Calor específico da água — J/(g·°C) */
export const CP_AGUA_J_G_C = 4.186;

/** Calor específico do cimento anidro — J/(g·°C) */
export const CP_CIMENTO_J_G_C = 0.75;

/** Temperatura de referência para Arrhenius — K (20°C) */
export const T_REF_K = 293.15;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — ENTRADA DE DADOS DO ENSAIO
// ─────────────────────────────────────────────────────────────────────────────

/** Um ponto de leitura do termopar no ensaio semi-adiabático */
export interface LeituraTermopar {
  /** Tempo desde o contato água-cimento — horas */
  tempo_h: number;
  /** Temperatura da pasta — °C */
  temperatura_C: number;
}

/** Parâmetros do ensaio semi-adiabático */
export interface EntradaEnsaio {
  /** ID do ensaio (ex: "ENS-001") */
  id: string;
  /** ID do cimento ensaiado (ex: "CIM-01") */
  cimentoId: string;
  /** Descrição livre do cimento */
  cimentoDescricao: string;
  /** Relação água/cimento do ensaio — adimensional (tipicamente 0.38–0.42) */
  relacaoAc: number;
  /** Massa de cimento no ensaio — gramas */
  massaCimento_g: number;
  /** Temperatura ambiente durante o ensaio — °C */
  temperaturaAmbiente_C: number;
  /** Leituras do termopar (série temporal) */
  leituras: LeituraTermopar[];
  /** Calor total de hidratação do cimento — kJ/kg (default do banco se omitido) */
  qInfinito_kJkg?: number;
  /** Coeficiente de perda do calorímetro — W/°C (0 para garrafa térmica ideal) */
  coefPerdaTermica_WC?: number;
  /** Aditivo aplicado (opcional) */
  aditivo?: {
    produto: string;
    dosagem_percent: number;
  };
}

/** Parâmetros calibrados do modelo FHP (Freiesleben Hansen & Pedersen) */
export interface ParamsFHP {
  /** Tempo característico — horas */
  tau_h: number;
  /** Expoente de forma — adimensional */
  beta: number;
  /** Grau de hidratação máximo — adimensional (0–1) */
  alphaMax: number;
  /** R² da calibração ln-ln */
  r2: number;
  /** Número de pontos usados */
  nPontos: number;
}

/** Resultado da detecção das 5 fases da hidratação */
export interface FasesHidratacao {
  /** Fase I — Dissolução Inicial */
  faseI: {
    /** Tempo de início — h */
    t_inicio_h: number;
    /** Tempo de fim — h */
    t_fim_h: number;
    /** Taxa máxima de calor nesta fase — °C/h */
    dTdt_max_Ch: number;
  };
  /** Fase II — Indução / Latência (platô térmico) */
  faseII: {
    t_inicio_h: number;
    t_fim_h: number;
    /** Temperatura média do platô — °C */
    T_plato_C: number;
    /** Duração da janela de trabalhabilidade — h */
    duracao_h: number;
  };
  /** Fase III — Aceleração (pico de hidratação) */
  faseIII: {
    t_inicio_h: number;
    t_fim_h: number;
    /** Temperatura de pico — °C */
    T_pico_C: number;
    /** Tempo do pico — h */
    t_pico_h: number;
    /** Taxa máxima de calor — °C/h */
    dTdt_max_Ch: number;
  };
  /** Fase IV — Desaceleração */
  faseIV: {
    t_inicio_h: number;
    t_fim_h: number;
  };
  /** Fase V — Difusão (estado estacionário) */
  faseV: {
    t_inicio_h: number;
    /** Temperatura assintótica — °C */
    T_assintotica_C: number;
    /** Grau de hidratação final estimado */
    alpha_final: number;
  };
}

/** Resultado completo do processamento Hydra4D */
export interface ResultadoHydra4D {
  /** ID do ensaio processado */
  ensaioId: string;
  /** Cimento utilizado */
  cimentoId: string;
  cimentoDescricao: string;
  /** Relação a/c do ensaio */
  relacaoAc: number;
  /** Parâmetros calibrados FHP (τ, β, α_max) */
  paramsFHP: ParamsFHP;
  /** 5 fases detectadas */
  fases: FasesHidratacao;
  /** Calor efetivo total — kJ/kg */
  Q_ef_kJkg: number;
  /** Energia de ativação estimada — J/mol (se disponível) */
  Ea_Jmol: number;
  /** Temperatura de pico — °C */
  T_pico_C: number;
  /** Tempo do pico — h */
  t_pico_h: number;
  /** Curva Q(t) calculada — série temporal */
  curvaCalor: Array<{ tempo_h: number; Q_kJkg: number; alpha: number }>;
  /** Curva dQ/dt — taxa de geração de calor */
  curvaTaxa: Array<{ tempo_h: number; dQdt_kJkgH: number }>;
  /** Temperatura de início de pega (Vicat estimado pelo ponto de inflexão) */
  t_inicio_pega_h: number;
  /** Temperatura de fim de pega (tempo do pico dQ/dt) */
  t_fim_pega_h: number;
  /** Efeito do aditivo (se presente) */
  efeitoAditivo?: {
    produto: string;
    dosagem_percent: number;
    /** Retardo absoluto — minutos */
    delta_t_retardo_min: number;
    /** Retardo relativo — % */
    retardo_percent: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — BANCO DE CIMENTOS CALIBRADOS
// ─────────────────────────────────────────────────────────────────────────────

/** Tipo de cimento brasileiro (NBR 16697) */
export type TipoCimento =
  | "CP_V_ARI"
  | "CP_II_F"
  | "CP_II_E"
  | "CP_II_Z"
  | "CP_III"
  | "CP_IV"
  | "LC3";

/** Registro de cimento calibrado no banco Hydra4D */
export interface CimentoCalibrado {
  /** ID único (ex: "CIM-01") */
  id: string;
  /** Descrição comercial */
  descricao: string;
  /** Tipo de cimento */
  tipo: TipoCimento;
  /** Calor efetivo — kJ/kg (medido em ensaio semi-adiabático) */
  Q_ef_kJkg: number;
  /** Energia de ativação — J/mol */
  Ea_Jmol: number;
  /** Tempo característico FHP — h */
  tau_h: number;
  /** Expoente FHP — adimensional */
  beta: number;
  /** Temperatura de pico em pasta — °C */
  T_pico_pasta_C: number;
  /** Fonte dos dados: "ENSAIO REAL" | "Literatura" */
  fonte: string;
}

/** Registro de aditivo calibrado com efeito de retardo */
export interface AditivoCalibrado {
  /** Produto comercial */
  produto: string;
  /** Dosagem — % da massa de cimento */
  dosagem_percent: number;
  /** Cimento de referência */
  cimentoRef: string;
  /** Retardo absoluto — minutos */
  delta_t_retardo_min: number;
  /** Retardo relativo — % */
  retardo_percent: number;
  /** Fonte do dado */
  fonte: string;
}

/** Parâmetros de efeito de SCM no calor de hidratação */
export interface ScmCalibrado {
  /** Material */
  material: string;
  /** Tipo */
  tipo: string;
  /** Fator k de reatividade pozolânica (0–1) */
  k_reatividade: number;
  /** Q∞ próprio da reação pozolânica — kJ/kg */
  Q_inf_kJkg: number;
  /** Efeito no τ — multiplicador (>1 = retarda, <1 = acelera) */
  fator_tau: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class Hydra4DLeiturasInsuficientesError extends Error {
  constructor(n: number) {
    super(
      `[Hydra4D] Ensaio requer mínimo de 10 leituras de termopar. ` +
      `Fornecidas: ${n}. Aumente a duração ou reduza o intervalo de amostragem.`
    );
    this.name = "Hydra4DLeiturasInsuficientesError";
  }
}

export class Hydra4DRelacaoAcForaFaixaError extends Error {
  constructor(ac: number) {
    super(
      `[Hydra4D] Relação a/c (${ac.toFixed(3)}) fora da faixa ` +
      `válida para calorimetria [0.30, 0.50]. Ajuste a composição da pasta.`
    );
    this.name = "Hydra4DRelacaoAcForaFaixaError";
  }
}

export class Hydra4DCalibracaoFalhouError extends Error {
  constructor(motivo: string) {
    super(`[Hydra4D] Calibração FHP falhou: ${motivo}`);
    this.name = "Hydra4DCalibracaoFalhouError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BANCO DE CIMENTOS CALIBRADOS — Hydra4D Engine DB v1.0
// Fonte: CLAUDE.md + ensaios reais CONCRYA + literatura
// ─────────────────────────────────────────────────────────────────────────────

export const CIMENTOS_CALIBRADOS: Record<string, CimentoCalibrado> = {
  "CIM-01": {
    id: "CIM-01",
    descricao: "CP V-ARI MAX CNC",
    tipo: "CP_V_ARI",
    Q_ef_kJkg: 380,
    Ea_Jmol: 40000,
    tau_h: 8.5,
    beta: 1.08,
    T_pico_pasta_C: 97.2,
    fonte: "ENSAIO REAL",
  },
  "CIM-02": {
    id: "CIM-02",
    descricao: "CP V-ARI PLUS Holcim",
    tipo: "CP_V_ARI",
    Q_ef_kJkg: 360,
    Ea_Jmol: 40000,
    tau_h: 9.0,
    beta: 1.06,
    T_pico_pasta_C: 83.4,
    fonte: "ENSAIO REAL",
  },
  "CIM-03": {
    id: "CIM-03",
    descricao: "CP V-ARI CAUE",
    tipo: "CP_V_ARI",
    Q_ef_kJkg: 370,
    Ea_Jmol: 40000,
    tau_h: 8.8,
    beta: 1.07,
    T_pico_pasta_C: 93.7,
    fonte: "ENSAIO REAL",
  },
  "CIM-04": {
    id: "CIM-04",
    descricao: "CP II-E-40 CNC",
    tipo: "CP_II_E",
    Q_ef_kJkg: 310,
    Ea_Jmol: 35000,
    tau_h: 12.5,
    beta: 0.94,
    T_pico_pasta_C: 70.2,
    fonte: "ENSAIO REAL",
  },
  "CIM-05": {
    id: "CIM-05",
    descricao: "CP IV-32 RS",
    tipo: "CP_IV",
    Q_ef_kJkg: 270,
    Ea_Jmol: 35500,
    tau_h: 13.0,
    beta: 0.92,
    T_pico_pasta_C: 62.0,
    fonte: "Literatura",
  },
  "CIM-06": {
    id: "CIM-06",
    descricao: "CP III-40 RS",
    tipo: "CP_III",
    Q_ef_kJkg: 250,
    Ea_Jmol: 30000,
    tau_h: 16.0,
    beta: 0.88,
    T_pico_pasta_C: 55.0,
    fonte: "Literatura",
  },
};

/** Energia de ativação padrão por tipo de cimento — J/mol */
export const EA_POR_TIPO: Record<TipoCimento, number> = {
  CP_V_ARI: 40000,
  CP_II_F: 37000,
  CP_II_E: 35000,
  CP_II_Z: 35500,
  CP_III: 30000,
  CP_IV: 35500,
  LC3: 38000,
};

// ─────────────────────────────────────────────────────────────────────────────
// BANCO DE ADITIVOS CALIBRADOS
// ─────────────────────────────────────────────────────────────────────────────

export const ADITIVOS_CALIBRADOS: AditivoCalibrado[] = [
  {
    produto: "Powerflow 1180",
    dosagem_percent: 1.0,
    cimentoRef: "CP V-ARI MAX CNC",
    delta_t_retardo_min: 276,
    retardo_percent: 230,
    fonte: "ASSTEC-018",
  },
  {
    produto: "Techniflow 560",
    dosagem_percent: 0.6,
    cimentoRef: "CP V-ARI PLUS Holcim",
    delta_t_retardo_min: 159,
    retardo_percent: 102,
    fonte: "MC-Bauchemie",
  },
  {
    produto: "Techniflow 560",
    dosagem_percent: 0.6,
    cimentoRef: "CP V-ARI CAUE",
    delta_t_retardo_min: 156,
    retardo_percent: 153,
    fonte: "MC-Bauchemie",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BANCO DE SCMs CALIBRADOS
// ─────────────────────────────────────────────────────────────────────────────

export const SCMS_CALIBRADOS: ScmCalibrado[] = [
  {
    material: "Sílica Ativa Densificada",
    tipo: "Silica Fume",
    k_reatividade: 0.25,
    Q_inf_kJkg: 780,
    fator_tau: 0.85,
  },
  {
    material: "Cinza Volante Classe F",
    tipo: "Fly Ash",
    k_reatividade: 0.15,
    Q_inf_kJkg: 200,
    fator_tau: 1.20,
  },
  {
    material: "Metacaulim HRM",
    tipo: "Metacaulim",
    k_reatividade: 0.40,
    Q_inf_kJkg: 600,
    fator_tau: 0.90,
  },
  {
    material: "Escória GGBS",
    tipo: "Escória",
    k_reatividade: 0.50,
    Q_inf_kJkg: 450,
    fator_tau: 1.30,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/** Validação com mensagem tipada */
function _validar(condicao: boolean, msg: string): asserts condicao {
  if (!condicao) throw new Error(`[Hydra4D] ${msg}`);
}

/** Arredonda para n casas decimais */
function _ar(valor: number, casas: number): number {
  const f = Math.pow(10, casas);
  return Math.round(valor * f) / f;
}

/** Converte °C para Kelvin */
function _celsiusParaKelvin(c: number): number {
  return c + 273.15;
}

/**
 * Calcula derivada numérica central (dT/dt) para uma série temporal.
 * Usa diferenças finitas centrais para pontos internos e unilaterais nas bordas.
 */
function _calcularDerivada(
  tempos: number[],
  valores: number[]
): number[] {
  const n = tempos.length;
  const dv: number[] = new Array(n);

  // Forward difference para primeiro ponto
  dv[0] = n > 1 ? (valores[1] - valores[0]) / (tempos[1] - tempos[0]) : 0;

  // Central difference para pontos internos
  for (let i = 1; i < n - 1; i++) {
    dv[i] = (valores[i + 1] - valores[i - 1]) / (tempos[i + 1] - tempos[i - 1]);
  }

  // Backward difference para último ponto
  dv[n - 1] = n > 1
    ? (valores[n - 1] - valores[n - 2]) / (tempos[n - 1] - tempos[n - 2])
    : 0;

  return dv;
}

/**
 * Suaviza série temporal com média móvel simples.
 * janela deve ser ímpar; se par, incrementa 1.
 */
function _suavizar(valores: number[], janela: number): number[] {
  const j = janela % 2 === 0 ? janela + 1 : janela;
  const meia = Math.floor(j / 2);
  const n = valores.length;
  const result: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    let soma = 0;
    let count = 0;
    for (let k = Math.max(0, i - meia); k <= Math.min(n - 1, i + meia); k++) {
      soma += valores[k];
      count++;
    }
    result[i] = soma / count;
  }

  return result;
}

/**
 * Integração numérica trapezoidal.
 */
function _integrarTrapezoidal(
  tempos: number[],
  valores: number[]
): number[] {
  const n = tempos.length;
  const integral: number[] = new Array(n);
  integral[0] = 0;

  for (let i = 1; i < n; i++) {
    const dt = tempos[i] - tempos[i - 1];
    integral[i] = integral[i - 1] + 0.5 * (valores[i] + valores[i - 1]) * dt;
  }

  return integral;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 1 — CAPACIDADE CALORÍFICA DA PASTA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a capacidade calorífica específica da pasta por grama de cimento.
 *
 *   C_pasta = cp_cimento + (a/c) × cp_agua                        … (7)
 *
 * @param relacaoAc Relação água/cimento — adimensional
 * @returns         Capacidade calorífica — J/(g_cimento·°C)
 */
export function calcularCapacidadeCalorifica(relacaoAc: number): number {
  return CP_CIMENTO_J_G_C + relacaoAc * CP_AGUA_J_G_C;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 2 — CALOR ACUMULADO Q(t) a partir das leituras
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a curva de calor acumulado Q(t) [kJ/kg] a partir das leituras
 * de temperatura do ensaio semi-adiabático.
 *
 *   Q(t) = C_pasta × ΔT(t) × 1000 / 1000                         … (1')
 *   (J/g → kJ/kg: ×1, pois J/g = kJ/kg)
 *
 * @param leituras             Série temporal de temperatura
 * @param relacaoAc            Relação a/c do ensaio
 * @param temperaturaAmbiente  Temperatura inicial/ambiente — °C
 * @param coefPerda            Coeficiente de perda térmica — W/(°C·g) (default 0)
 * @returns                    Curva Q(t) em kJ/kg
 */
export function calcularCalorAcumulado(
  leituras: LeituraTermopar[],
  relacaoAc: number,
  temperaturaAmbiente: number,
  coefPerda: number = 0
): Array<{ tempo_h: number; Q_kJkg: number }> {
  const C = calcularCapacidadeCalorifica(relacaoAc);
  const tempos = leituras.map((l) => l.tempo_h);
  const deltaT = leituras.map((l) => l.temperatura_C - temperaturaAmbiente);

  if (coefPerda > 0) {
    // Semi-adiabático com correção de perda: Q(t) = C·ΔT + α∫ΔTdt
    const integralDeltaT = _integrarTrapezoidal(tempos, deltaT);
    return leituras.map((l, i) => ({
      tempo_h: l.tempo_h,
      Q_kJkg: _ar(C * deltaT[i] + coefPerda * 3600 * integralDeltaT[i], 2),
    }));
  }

  // Caso ideal (garrafa térmica): Q(t) = C × ΔT
  return leituras.map((l, i) => ({
    tempo_h: l.tempo_h,
    Q_kJkg: _ar(C * deltaT[i], 2),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 3 — GRAU DE HIDRATAÇÃO α(t)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o grau de hidratação α(t) = Q(t) / Q∞.
 *
 * @param curvaCalor Curva Q(t) em kJ/kg
 * @param qInfinito  Calor total de hidratação — kJ/kg
 * @returns          Curva α(t) (valores entre 0 e 1)
 */
export function calcularGrauHidratacao(
  curvaCalor: Array<{ tempo_h: number; Q_kJkg: number }>,
  qInfinito: number
): Array<{ tempo_h: number; alpha: number }> {
  _validar(qInfinito > 0, "Q∞ deve ser positivo");

  return curvaCalor.map((p) => ({
    tempo_h: p.tempo_h,
    alpha: _ar(Math.min(p.Q_kJkg / qInfinito, 1.0), 4),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 4 — TAXA DE CALOR dQ/dt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a taxa de geração de calor dQ/dt [kJ/(kg·h)].
 * Aplica suavização antes da derivada para reduzir ruído de sensor.
 *
 * @param curvaCalor Curva Q(t) em kJ/kg
 * @param janelaSuav Tamanho da janela de suavização (default 5)
 * @returns          Curva dQ/dt
 */
export function calcularTaxaCalor(
  curvaCalor: Array<{ tempo_h: number; Q_kJkg: number }>,
  janelaSuav: number = 5
): Array<{ tempo_h: number; dQdt_kJkgH: number }> {
  const tempos = curvaCalor.map((p) => p.tempo_h);
  const Q = curvaCalor.map((p) => p.Q_kJkg);
  const Qsuav = _suavizar(Q, janelaSuav);
  const dQdt = _calcularDerivada(tempos, Qsuav);

  return curvaCalor.map((p, i) => ({
    tempo_h: p.tempo_h,
    dQdt_kJkgH: _ar(Math.max(dQdt[i], 0), 3),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 5 — DETECÇÃO DAS 5 FASES DA HIDRATAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta automaticamente as 5 fases da hidratação a partir da curva
 * de temperatura e sua derivada.
 *
 * Algoritmo:
 *   1. Calcula dT/dt suavizado
 *   2. Fase I: primeiros 0.5h (dissolução rápida)
 *   3. Fase II: platô onde dT/dt < limiar (indução)
 *   4. Fase III: subida até pico de temperatura (aceleração)
 *   5. Fase IV: descida pós-pico até estabilização (desaceleração)
 *   6. Fase V: estabilização final (difusão)
 *
 * @param leituras Série temporal de temperatura
 * @param qInfinito Calor total para estimar α final
 * @param relacaoAc Para cálculo de α
 * @param tAmbiente Temperatura ambiente
 */
export function detectarFases(
  leituras: LeituraTermopar[],
  qInfinito: number,
  relacaoAc: number,
  tAmbiente: number
): FasesHidratacao {
  const tempos = leituras.map((l) => l.tempo_h);
  const temps = leituras.map((l) => l.temperatura_C);
  const n = leituras.length;

  // Suaviza e calcula derivada
  const tempsSuav = _suavizar(temps, 7);
  const dTdt = _calcularDerivada(tempos, tempsSuav);

  // Encontra pico principal de temperatura
  let iPico = 0;
  let Tpico = -Infinity;
  for (let i = 0; i < n; i++) {
    if (tempsSuav[i] > Tpico) {
      Tpico = tempsSuav[i];
      iPico = i;
    }
  }

  // Limiar para detecção de platô (5% do dTdt máximo)
  const dTdtMax = Math.max(...dTdt.map(Math.abs));
  const limiarPlato = dTdtMax * 0.05;

  // Fase I — Dissolução: primeiros 0.5h ou até primeiro mínimo de dT/dt
  const fimFaseI_h = Math.min(0.5, tempos[Math.min(5, n - 1)]);
  const iFimFaseI = tempos.findIndex((t) => t >= fimFaseI_h) || 1;

  // Fase II — Indução: do fim da Fase I até dT/dt > limiar de forma sustentada
  let iFimFaseII = iFimFaseI;
  for (let i = iFimFaseI; i < iPico; i++) {
    // Verifica 3 pontos consecutivos acima do limiar
    if (i + 2 < n && dTdt[i] > limiarPlato && dTdt[i + 1] > limiarPlato && dTdt[i + 2] > limiarPlato) {
      iFimFaseII = i;
      break;
    }
    iFimFaseII = i;
  }

  // Temperatura média do platô
  let somaPlato = 0;
  let countPlato = 0;
  for (let i = iFimFaseI; i <= iFimFaseII; i++) {
    somaPlato += tempsSuav[i];
    countPlato++;
  }
  const Tplato = countPlato > 0 ? somaPlato / countPlato : tempsSuav[iFimFaseI];

  // Fase III — Aceleração: do fim da Fase II até o pico
  // Encontra máximo de dT/dt na fase de aceleração
  let dTdtMaxFaseIII = 0;
  for (let i = iFimFaseII; i <= iPico; i++) {
    if (dTdt[i] > dTdtMaxFaseIII) dTdtMaxFaseIII = dTdt[i];
  }

  // Fase IV — Desaceleração: do pico até estabilização
  // Critério: dT/dt volta para dentro de ±limiarPlato
  let iFimFaseIV = iPico;
  for (let i = iPico + 1; i < n; i++) {
    if (Math.abs(dTdt[i]) < limiarPlato) {
      iFimFaseIV = i;
      break;
    }
    iFimFaseIV = i;
  }

  // Calcula α final
  const C = calcularCapacidadeCalorifica(relacaoAc);
  const deltaT_final = tempsSuav[n - 1] - tAmbiente;
  const Q_final = C * deltaT_final;
  const alpha_final = Math.min(Q_final / qInfinito, 1.0);

  // dT/dt máximo na Fase I
  let dTdtMaxFaseI = 0;
  for (let i = 0; i <= iFimFaseI && i < n; i++) {
    if (Math.abs(dTdt[i]) > dTdtMaxFaseI) dTdtMaxFaseI = Math.abs(dTdt[i]);
  }

  return {
    faseI: {
      t_inicio_h: 0,
      t_fim_h: _ar(tempos[iFimFaseI], 3),
      dTdt_max_Ch: _ar(dTdtMaxFaseI, 3),
    },
    faseII: {
      t_inicio_h: _ar(tempos[iFimFaseI], 3),
      t_fim_h: _ar(tempos[iFimFaseII], 3),
      T_plato_C: _ar(Tplato, 1),
      duracao_h: _ar(tempos[iFimFaseII] - tempos[iFimFaseI], 3),
    },
    faseIII: {
      t_inicio_h: _ar(tempos[iFimFaseII], 3),
      t_fim_h: _ar(tempos[iPico], 3),
      T_pico_C: _ar(Tpico, 1),
      t_pico_h: _ar(tempos[iPico], 3),
      dTdt_max_Ch: _ar(dTdtMaxFaseIII, 3),
    },
    faseIV: {
      t_inicio_h: _ar(tempos[iPico], 3),
      t_fim_h: _ar(tempos[iFimFaseIV], 3),
    },
    faseV: {
      t_inicio_h: _ar(tempos[iFimFaseIV], 3),
      T_assintotica_C: _ar(tempsSuav[n - 1], 1),
      alpha_final: _ar(alpha_final, 4),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 6 — CALIBRAÇÃO FHP (τ, β) por regressão OLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calibra os parâmetros τ e β do modelo FHP a partir da curva α(t).
 *
 * Linearização:
 *   ln(−ln(α / α_max)) = β × ln(τ) − β × ln(t)                   … (3')
 *   y = A + B × x
 *   Onde: x = ln(t), y = ln(−ln(α/α_max))
 *   Portanto: β = −B, τ = exp(A / β) = exp(−A/B)
 *
 * @param curvaAlpha Série α(t) — exclui α ≤ 0 e α ≥ α_max
 * @param alphaMax   Grau máximo de hidratação (default: max observado × 1.05)
 */
export function calibrarFHP(
  curvaAlpha: Array<{ tempo_h: number; alpha: number }>,
  alphaMax?: number
): ParamsFHP {
  // Filtra pontos válidos para linearização (0 < α < α_max)
  const aMax = alphaMax ?? Math.min(Math.max(...curvaAlpha.map((p) => p.alpha)) * 1.05, 1.0);

  const pontosValidos = curvaAlpha.filter(
    (p) => p.tempo_h > 0 && p.alpha > 0.01 && p.alpha < aMax * 0.98
  );

  if (pontosValidos.length < 5) {
    throw new Hydra4DCalibracaoFalhouError(
      `Pontos válidos insuficientes para regressão (${pontosValidos.length} < 5). ` +
      `Verifique a duração e qualidade do ensaio.`
    );
  }

  // Linearização
  const x: number[] = [];
  const y: number[] = [];
  for (const p of pontosValidos) {
    const ratio = p.alpha / aMax;
    const lnNeg = Math.log(-Math.log(ratio));
    if (isFinite(lnNeg)) {
      x.push(Math.log(p.tempo_h));
      y.push(lnNeg);
    }
  }

  const n = x.length;
  if (n < 5) {
    throw new Hydra4DCalibracaoFalhouError(
      `Pontos válidos após linearização: ${n} < 5. Ensaio pode ter ruído excessivo.`
    );
  }

  // OLS
  const Sx = x.reduce((a, v) => a + v, 0);
  const Sy = y.reduce((a, v) => a + v, 0);
  const Sxy = x.reduce((a, v, i) => a + v * y[i], 0);
  const Sx2 = x.reduce((a, v) => a + v * v, 0);

  const B = (n * Sxy - Sx * Sy) / (n * Sx2 - Sx * Sx);
  const A = (Sy - B * Sx) / n;

  // Extrai parâmetros físicos
  const beta = -B;
  const tau_h = Math.exp(-A / B);

  if (beta <= 0 || !isFinite(beta) || tau_h <= 0 || !isFinite(tau_h)) {
    throw new Hydra4DCalibracaoFalhouError(
      `Parâmetros inválidos: β=${beta.toFixed(3)}, τ=${tau_h.toFixed(3)}h. ` +
      `Dados provavelmente insuficientes ou com ruído.`
    );
  }

  // R²
  const yMean = Sy / n;
  const ssTot = y.reduce((a, v) => a + (v - yMean) ** 2, 0);
  const ssRes = x.reduce((a, v, i) => a + (y[i] - (A + B * v)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  return {
    tau_h: _ar(tau_h, 3),
    beta: _ar(beta, 4),
    alphaMax: _ar(aMax, 4),
    r2: _ar(r2, 4),
    nPontos: n,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 7 — PREDIÇÃO α(t) pelo modelo FHP calibrado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prediz α(t) usando os parâmetros FHP calibrados.
 *
 *   α(t) = α_max × exp[ −(τ/t)^β ]                                … (3)
 *
 * @param tempo_h   Tempo — horas
 * @param params    Parâmetros FHP calibrados
 * @returns         Grau de hidratação α (0 a α_max)
 */
export function predizAlphaFHP(
  tempo_h: number,
  params: ParamsFHP
): number {
  if (tempo_h <= 0) return 0;
  return params.alphaMax * Math.exp(-Math.pow(params.tau_h / tempo_h, params.beta));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 8 — ENERGIA DE ATIVAÇÃO (2 temperaturas)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a energia de ativação Ea a partir de dois ensaios em
 * temperaturas diferentes (ASTM C1074 §7.2 — método das velocidades).
 *
 *   Ea = R × ln(k₂/k₁) / (1/T₁ − 1/T₂)                          … (4)
 *   Onde k = 1/τ (constante de velocidade)
 *
 * @param tau1_h  τ do ensaio à temperatura T1 — horas
 * @param T1_C    Temperatura do ensaio 1 — °C
 * @param tau2_h  τ do ensaio à temperatura T2 — horas
 * @param T2_C    Temperatura do ensaio 2 — °C
 * @returns       Ea em J/mol
 */
export function calcularEaArrhenius(
  tau1_h: number,
  T1_C: number,
  tau2_h: number,
  T2_C: number
): number {
  _validar(tau1_h > 0 && tau2_h > 0, "τ deve ser positivo");
  _validar(T1_C !== T2_C, "Temperaturas devem ser diferentes");

  const T1_K = _celsiusParaKelvin(T1_C);
  const T2_K = _celsiusParaKelvin(T2_C);

  const k1 = 1 / tau1_h;
  const k2 = 1 / tau2_h;

  return _ar(R_GAS * Math.log(k2 / k1) / (1 / T1_K - 1 / T2_K), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 9 — EFEITO DE SCM NO CALOR TOTAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o calor efetivo Q∞ considerando substituição parcial por SCM.
 *
 *   Q∞_ef = Q∞_cim × (1 − %SCM) + Q∞_SCM × %SCM × k_reat         … (5)
 *
 * @param Q_inf_cimento  Q∞ do cimento — kJ/kg
 * @param scm            Parâmetros do SCM calibrado
 * @param percentualSCM  Percentual de substituição (0–1)
 * @returns              Q∞ efetivo — kJ/kg
 */
export function calcularQefComSCM(
  Q_inf_cimento: number,
  scm: ScmCalibrado,
  percentualSCM: number
): number {
  _validar(percentualSCM >= 0 && percentualSCM <= 1, "Percentual SCM deve estar entre 0 e 1");

  return _ar(
    Q_inf_cimento * (1 - percentualSCM) +
    scm.Q_inf_kJkg * percentualSCM * scm.k_reatividade,
    1
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 10 — EFEITO DE ADITIVO NO τ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o τ efetivo considerando aditivo retardador.
 *
 *   τ_ef = τ_base × (1 + Δt_retardo / τ_base)                     … (6)
 *   Equivalente a: τ_ef = τ_base + Δt_retardo (em horas)
 *
 * @param tau_base_h       τ base do cimento sem aditivo — h
 * @param delta_retardo_min Retardo absoluto do aditivo — minutos
 * @returns                 τ efetivo — h
 */
export function calcularTauComAditivo(
  tau_base_h: number,
  delta_retardo_min: number
): number {
  return _ar(tau_base_h + delta_retardo_min / 60, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 11 — DETECÇÃO DE PEGA (início e fim)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estima os tempos de início e fim de pega a partir da curva de taxa de calor.
 *
 * Definições (correlação térmica com Vicat / ASTM C191):
 *   - Início de pega: ponto de inflexão ascendente da curva dQ/dt
 *     (máximo da segunda derivada d²Q/dt²)
 *   - Fim de pega: pico da curva dQ/dt (máximo de dQ/dt)
 *
 * @param curvaTaxa Curva dQ/dt
 * @returns         { t_inicio_pega_h, t_fim_pega_h }
 */
export function detectarPega(
  curvaTaxa: Array<{ tempo_h: number; dQdt_kJkgH: number }>
): { t_inicio_pega_h: number; t_fim_pega_h: number } {
  const tempos = curvaTaxa.map((p) => p.tempo_h);
  const dQdt = curvaTaxa.map((p) => p.dQdt_kJkgH);

  // Fim de pega = pico de dQ/dt (ignora primeiros 30 min — dissolução)
  let iPicoDQdt = 0;
  let maxDQdt = -Infinity;
  for (let i = 0; i < dQdt.length; i++) {
    if (tempos[i] > 0.5 && dQdt[i] > maxDQdt) {
      maxDQdt = dQdt[i];
      iPicoDQdt = i;
    }
  }

  // Início de pega = máximo de d²Q/dt² antes do pico de dQ/dt
  const d2Qdt2 = _calcularDerivada(tempos, dQdt);
  let iInflexao = 0;
  let maxD2 = -Infinity;
  for (let i = 0; i < iPicoDQdt; i++) {
    if (tempos[i] > 0.5 && d2Qdt2[i] > maxD2) {
      maxD2 = d2Qdt2[i];
      iInflexao = i;
    }
  }

  return {
    t_inicio_pega_h: _ar(tempos[iInflexao], 3),
    t_fim_pega_h: _ar(tempos[iPicoDQdt], 3),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 12 — GERADOR DE CURVA TEÓRICA FHP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera curva teórica α(t) e Q(t) a partir dos parâmetros FHP.
 * Útil para plotar a curva calibrada sobreposta aos dados experimentais.
 *
 * @param params    Parâmetros FHP calibrados
 * @param qInfinito Calor total — kJ/kg
 * @param tMax_h    Tempo máximo — h (default 72)
 * @param nPontos   Número de pontos (default 200)
 */
export function gerarCurvaTeóricaFHP(
  params: ParamsFHP,
  qInfinito: number,
  tMax_h: number = 72,
  nPontos: number = 200
): Array<{ tempo_h: number; alpha: number; Q_kJkg: number }> {
  const curva: Array<{ tempo_h: number; alpha: number; Q_kJkg: number }> = [];
  const dt = tMax_h / nPontos;

  for (let i = 0; i <= nPontos; i++) {
    const t = i * dt;
    const alpha = t > 0 ? predizAlphaFHP(t, params) : 0;
    curva.push({
      tempo_h: _ar(t, 3),
      alpha: _ar(alpha, 4),
      Q_kJkg: _ar(alpha * qInfinito, 2),
    });
  }

  return curva;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 13 — ORQUESTRADOR PRINCIPAL — executarHydra4D
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa o pipeline completo do Hydra4D Engine em uma única chamada.
 *
 * Pipeline:
 *   1. Validação dos dados de entrada
 *   2. Cálculo de Q(t) — calor acumulado                           … (1')
 *   3. Cálculo de α(t) — grau de hidratação                        … (2)
 *   4. Cálculo de dQ/dt — taxa de calor
 *   5. Detecção das 5 fases
 *   6. Calibração FHP (τ, β)                                       … (3')
 *   7. Detecção de pega (início e fim)
 *   8. Montagem do resultado final
 *
 * @param entrada Dados do ensaio semi-adiabático
 * @returns       Resultado completo Hydra4D
 */
export function executarHydra4D(entrada: EntradaEnsaio): ResultadoHydra4D {
  // ── 1. Validação ──────────────────────────────────────────────
  if (entrada.leituras.length < 10) {
    throw new Hydra4DLeiturasInsuficientesError(entrada.leituras.length);
  }
  if (entrada.relacaoAc < 0.30 || entrada.relacaoAc > 0.50) {
    throw new Hydra4DRelacaoAcForaFaixaError(entrada.relacaoAc);
  }

  // Ordena leituras por tempo
  const leituras = [...entrada.leituras].sort((a, b) => a.tempo_h - b.tempo_h);

  // Busca Q∞ do banco ou usa valor fornecido
  const cimentoBanco = CIMENTOS_CALIBRADOS[entrada.cimentoId];
  const qInfinito = entrada.qInfinito_kJkg
    ?? cimentoBanco?.Q_ef_kJkg
    ?? 350; // fallback genérico

  const coefPerda = entrada.coefPerdaTermica_WC ?? 0;
  const tAmbiente = entrada.temperaturaAmbiente_C;

  // ── 2. Calor acumulado Q(t) ───────────────────────────────────
  const curvaCalor = calcularCalorAcumulado(
    leituras, entrada.relacaoAc, tAmbiente, coefPerda
  );

  // ── 3. Grau de hidratação α(t) ───────────────────────────────
  const curvaAlpha = calcularGrauHidratacao(curvaCalor, qInfinito);

  // ── 4. Taxa de calor dQ/dt ────────────────────────────────────
  const curvaTaxa = calcularTaxaCalor(curvaCalor);

  // ── 5. Detecção das 5 fases ───────────────────────────────────
  const fases = detectarFases(leituras, qInfinito, entrada.relacaoAc, tAmbiente);

  // ── 6. Calibração FHP ─────────────────────────────────────────
  const paramsFHP = calibrarFHP(curvaAlpha);

  // ── 7. Detecção de pega ───────────────────────────────────────
  const pega = detectarPega(curvaTaxa);

  // ── 8. Q efetivo (máximo medido) ──────────────────────────────
  const Q_ef = Math.max(...curvaCalor.map((p) => p.Q_kJkg));

  // ── 9. Ea — usa banco calibrado ou default por tipo ───────────
  const Ea = cimentoBanco?.Ea_Jmol
    ?? EA_POR_TIPO[cimentoBanco?.tipo as TipoCimento]
    ?? 35000;

  // ── 10. Efeito do aditivo (se presente) ───────────────────────
  let efeitoAditivo: ResultadoHydra4D["efeitoAditivo"];
  if (entrada.aditivo) {
    const aditivoBanco = ADITIVOS_CALIBRADOS.find(
      (a) =>
        a.produto === entrada.aditivo!.produto &&
        Math.abs(a.dosagem_percent - entrada.aditivo!.dosagem_percent) < 0.01
    );
    if (aditivoBanco) {
      efeitoAditivo = {
        produto: aditivoBanco.produto,
        dosagem_percent: aditivoBanco.dosagem_percent,
        delta_t_retardo_min: aditivoBanco.delta_t_retardo_min,
        retardo_percent: aditivoBanco.retardo_percent,
      };
    }
  }

  // ── Montagem do resultado ─────────────────────────────────────
  const curvaCalorComAlpha = curvaCalor.map((p, i) => ({
    tempo_h: p.tempo_h,
    Q_kJkg: p.Q_kJkg,
    alpha: curvaAlpha[i]?.alpha ?? 0,
  }));

  return {
    ensaioId: entrada.id,
    cimentoId: entrada.cimentoId,
    cimentoDescricao: entrada.cimentoDescricao,
    relacaoAc: entrada.relacaoAc,
    paramsFHP,
    fases,
    Q_ef_kJkg: _ar(Q_ef, 1),
    Ea_Jmol: Ea,
    T_pico_C: fases.faseIII.T_pico_C,
    t_pico_h: fases.faseIII.t_pico_h,
    curvaCalor: curvaCalorComAlpha,
    curvaTaxa,
    t_inicio_pega_h: pega.t_inicio_pega_h,
    t_fim_pega_h: pega.t_fim_pega_h,
    efeitoAditivo,
  };
}
