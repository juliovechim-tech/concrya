/**
 * @file lib/thermocore.ts
 * @description THERMOCORE — Motor de Maturidade, Idade Equivalente e Resistência f(t)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MODELO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O método da maturidade estima a resistência do concreto in-situ a partir
 * do histórico de temperatura (termopar embarcado), sem necessidade de
 * rompimento de corpos-de-prova.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MATURIDADE — Nurse-Saul (1949)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   M(t) = Σ (T_c − T₀) × Δt                                     … (1)
 *
 * Onde:
 *   M(t) = fator de maturidade — °C·h
 *   T_c  = temperatura do concreto no intervalo — °C
 *   T₀   = datum temperature — °C (padrão: −10°C)
 *   Δt   = intervalo de tempo — h
 *
 * ───────────────────────────────────────────────────────────────────────────
 * IDADE EQUIVALENTE — Arrhenius / ASTM C1074-19
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   t_e = Σ Δt × exp[ Ea/R × (1/T_r − 1/T_c) ]                   … (2)
 *
 * Onde:
 *   t_e  = idade equivalente à temperatura de referência — h
 *   Ea   = energia de ativação — J/mol
 *   R    = constante dos gases = 8.314 J/(mol·K)
 *   T_r  = temperatura de referência — K (padrão: 293.15 K = 20°C)
 *   T_c  = temperatura do concreto — K
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODELO FHP — Freiesleben Hansen & Pedersen (1977)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   α(t_e) = α_max × exp[ −(τ / t_e)^β ]                          … (3)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * RESISTÊNCIA EM FUNÇÃO DO TEMPO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Modelo calibrado (Su et al., 2001):
 *   S(t_e) = Su × exp[ −(τ / t_e)^β ]                              … (4)
 *
 * Fallback CEB-FIP MC90 / fib MC2010:
 *   β_cc(t) = exp( s × (1 − √(28/t)) )                            … (5)
 *   f(t) = fck_28 × β_cc(t)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * α_max — Powers (1949) + Bentz (1997)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   α_max = min(1.0, 1.031 × a/c / (0.194 + a/c))                 … (6)
 *
 * Para UHPC (a/c < 0.28): α_max = a/c / 0.36  [Bentz, 1997]       … (6')
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CRITÉRIO DE DESFORMA — ACI 207.1R + NBR 6118:2023
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   Condição 1: fck_pred ≥ 0.70 × fck_proj_28d                     … (7a)
 *   Condição 2: ΔT núcleo/superfície ≤ 20°C                        … (7b)
 *   Condição 3: T_núcleo ≤ 70°C                                    … (7c)
 *   Condição 4: t_e ≥ t_e_min_obra  (restrição de obra — opcional)  … (7d)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CALIBRAÇÃO Su/τ/β — Linearização ln-ln (ASTM C1074 §7.2.4)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   De S(t_e) = Su × exp[−(τ/t_e)^β]:
 *   ln(−ln(S/Su)) = β × ln(τ) − β × ln(t_e)                       … (8)
 *   y = A + B × x  onde  y = ln(−ln(S_i/Su)), x = ln(t_e_i)
 *   → β = −B,  τ = exp(−A/B)
 *
 *   Su é estimado iterativamente como 1.05–1.20 × max(S_i).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1]  Nurse, R.W. (1949). Steam Curing of Concrete. Magazine of Concrete
 *        Research, 1(2), 79–88.
 *   [2]  Saul, A.G.A. (1951). Principles Underlying the Steam Curing of
 *        Concrete at Atmospheric Pressure. Magazine of Concrete Research.
 *   [3]  ASTM C1074-19 — Standard Practice for Estimating Concrete Strength
 *        by the Maturity Method.
 *   [4]  Freiesleben Hansen, P. & Pedersen, E.J. (1977). Maturity computer
 *        for controlled curing and hardening of concrete. Nordisk Betong.
 *   [5]  Su, J.K. et al. (2001). Predicting concrete compressive strength
 *        using the maturity method. Journal of Testing and Evaluation.
 *   [6]  CEB-FIP Model Code 1990. fib Bulletins 1 & 2.
 *   [7]  fib Model Code 2010. fib Bulletin 65/66.
 *   [8]  Powers, T.C. (1949). The Non-evaporable Water Content of Hardened
 *        Portland Cement Paste. ASTM Proceedings.
 *   [9]  Bentz, D.P. (1997). Three-Dimensional Computer Simulation of
 *        Portland Cement Hydration. NISTIR 5756.
 *   [10] ACI 207.1R-05 — Guide to Mass Concrete.
 *   [11] NBR 6118:2023 — Projeto de estruturas de concreto.
 *   [12] NBR 12655:2022 — Concreto de cimento Portland.
 *   [13] Mehta, P.K. & Monteiro, P.J.M. (2014). Concrete: Microstructure,
 *        Properties, and Materials. 4th ed. McGraw-Hill.
 *   [14] Vechim, J. (2026). Método da maturidade aplicado ao controle
 *        tecnológico de estruturas — Dissertação de Mestrado. Unisinos.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES FÍSICAS
// ─────────────────────────────────────────────────────────────────────────────

/** Constante universal dos gases — J/(mol·K) */
export const R_GAS = 8.314;

/** Temperatura de referência para Arrhenius — K (20°C) */
export const T_REF_K = 293.15;

/** Datum temperature para Nurse-Saul — °C */
export const T_DATUM_CELSIUS = -10;

/** Limite ΔT núcleo-superfície — °C (ACI 207.1R-05) */
export const LIMITE_DELTA_T_C = 20;

/** Limite T núcleo máximo — °C (NBR 6118:2023) */
export const LIMITE_T_NUCLEO_C = 70;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — INTERFACES DE DOMÍNIO
// ─────────────────────────────────────────────────────────────────────────────

/** Tipo de cimento — chave para lookup de Ea e defaults de calibração */
export type TipoCimento =
  | "CP_V_ARI"
  | "CP_II_F"
  | "CP_II_E"
  | "CP_III"
  | "CP_IV"
  | "LC3"
  | "UHPC";

/** Ponto de leitura de termopar embarcado (dados MQTT do Eletroterm) */
export interface LeituraTemperatura {
  /** Tempo desde a concretagem — horas */
  tempo_h: number;
  /** Temperatura do concreto — °C */
  temperatura_C: number;
}

/** Ponto de calibração resistência × idade equivalente (corpos-de-prova) */
export interface PontoCalibracao {
  /** Idade equivalente no momento da ruptura — h */
  te_h: number;
  /** Resistência medida — MPa */
  fck_MPa: number;
}

/** Parâmetros calibrados Su/τ/β para predição de resistência */
export interface ParamsCalibracao {
  /** Resistência última — MPa */
  Su_MPa: number;
  /** Tempo característico — h */
  tau_h: number;
  /** Expoente de forma — adimensional */
  beta: number;
  /** R² da calibração OLS */
  r2: number;
  /** Número de pontos usados na calibração */
  nPontos: number;
}

/** Coeficiente s do CEB-FIP MC90 por tipo de cimento */
export interface CoeficienteCebFip {
  /** Coeficiente s — adimensional */
  s: number;
  /** Descrição do tipo */
  descricao: string;
}

/** Entrada para o motor principal executarThermoCore */
export interface EntradaThermoCore {
  /** Série temporal de temperatura do concreto (termopar embarcado) */
  leituras: LeituraTemperatura[];
  /** Energia de ativação do cimento — J/mol */
  Ea_J_mol: number;
  /** Calibração Su/τ/β do cimento (ou default do banco) */
  calibracao: ParamsCalibracao;
  /** fck de projeto aos 28 dias — MPa */
  fck28_MPa: number;
  /** Coeficiente s do CEB-FIP (fallback quando calibração indisponível) */
  s_ceb?: number;
  /** Relação a/c do concreto — adimensional */
  relacaoAc?: number;
  /** T superfície do concreto — °C (para critério de desforma ΔT) */
  T_superficie_C?: number;
  /** Idade equivalente mínima de obra — h (restrição adicional, opcional) */
  te_min_obra_h?: number;
}

/** Resultado ponto-a-ponto do processamento de maturidade */
export interface PontoMaturidade {
  /** Tempo real desde concretagem — h */
  tempo_h: number;
  /** Temperatura do concreto — °C */
  temperatura_C: number;
  /** Maturidade Nurse-Saul acumulada — °C·h */
  maturidade_Ch: number;
  /** Idade equivalente Arrhenius acumulada — h */
  te_h: number;
  /** Grau de hidratação FHP — adimensional (0–1) */
  alpha: number;
  /** fck predito pelo modelo calibrado — MPa */
  fck_pred_MPa: number;
  /** fck predito pelo CEB-FIP (fallback) — MPa */
  fck_ceb_MPa: number;
}

/** Resultado do critério de desforma */
export interface CriterioDesforma {
  /** Desforma liberada? (true = todas as condições atendidas) */
  liberado: boolean;
  /** fck predito no instante atual ≥ 70% fck_28 */
  condicao_resistencia: boolean;
  /** ΔT ≤ 20°C */
  condicao_deltaT: boolean;
  /** T_núcleo ≤ 70°C */
  condicao_T_nucleo: boolean;
  /** t_e ≥ t_e_min_obra */
  condicao_te_min: boolean;
  /** Detalhes numéricos */
  detalhes: {
    fck_pred_MPa: number;
    fck_alvo_MPa: number;
    deltaT_C: number | null;
    T_nucleo_C: number;
    te_h: number;
    te_min_h: number | null;
  };
}

/** Resultado completo do motor ThermoCore */
export interface ResultadoThermoCore {
  /** Série temporal de maturidade processada */
  curva: PontoMaturidade[];
  /** Critério de desforma no instante final */
  desforma: CriterioDesforma;
  /** α_max teórico (Powers / Bentz) */
  alphaMax: number;
  /** Idade equivalente final — h */
  te_final_h: number;
  /** fck final predito — MPa */
  fck_final_MPa: number;
  /** Maturidade Nurse-Saul final — °C·h */
  maturidade_final_Ch: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROS DE DOMÍNIO
// ─────────────────────────────────────────────────────────────────────────────

export class ThermoCoreLeiturasInsuficientesError extends Error {
  constructor(n: number) {
    super(
      `[ThermoCore] Mínimo de 3 leituras de temperatura requerido. ` +
      `Fornecidas: ${n}. Aumente a duração do monitoramento.`
    );
    this.name = "ThermoCoreLeiturasInsuficientesError";
  }
}

export class ThermoCoreCalibraçãoInvalidaError extends Error {
  constructor(motivo: string) {
    super(`[ThermoCore] Calibração inválida: ${motivo}`);
    this.name = "ThermoCoreCalibraçãoInvalidaError";
  }
}

export class ThermoCoreRelacaoAcInvalidaError extends Error {
  constructor(ac: number) {
    super(
      `[ThermoCore] Relação a/c (${ac.toFixed(3)}) fora da faixa válida ` +
      `[0.20, 0.80]. Verifique os dados de entrada.`
    );
    this.name = "ThermoCoreRelacaoAcInvalidaError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BANCOS DE DADOS — ENERGIAS DE ATIVAÇÃO POR TIPO DE CIMENTO
// Fonte: ASTM C1074-19, Schindler & Folliard (2005), CLAUDE.md
// ─────────────────────────────────────────────────────────────────────────────

/** Energias de ativação aparente por tipo de cimento — J/mol */
export const EA_J_MOL: Record<TipoCimento, number> = {
  CP_V_ARI: 40000,
  CP_II_F:  37000,
  CP_II_E:  35000,
  CP_III:   30000,
  CP_IV:    35500,
  LC3:      38000,
  UHPC:     42000,
};

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRAÇÕES DEFAULT — Su/τ/β por tipo de cimento
// Fonte: ASTM C1074-19 §7.2.4, ensaios CONCRYA (a/c ≈ 0.50)
// ─────────────────────────────────────────────────────────────────────────────

/** Calibrações default para fck_28 ≈ 40 MPa (a/c ≈ 0.50) */
export const CALIBRACAO_DEFAULT: Record<string, ParamsCalibracao> = {
  CP_V_ARI: {
    Su_MPa: 52,
    tau_h:   14,
    beta:    0.92,
    r2:      0.98,
    nPontos: 6,
  },
  CP_II_F: {
    Su_MPa: 48,
    tau_h:   18,
    beta:    0.88,
    r2:      0.97,
    nPontos: 6,
  },
  CP_II_E: {
    Su_MPa: 46,
    tau_h:   22,
    beta:    0.85,
    r2:      0.97,
    nPontos: 6,
  },
  CP_III: {
    Su_MPa: 44,
    tau_h:   28,
    beta:    0.80,
    r2:      0.96,
    nPontos: 6,
  },
  CP_IV: {
    Su_MPa: 42,
    tau_h:   26,
    beta:    0.82,
    r2:      0.96,
    nPontos: 6,
  },
  LC3: {
    Su_MPa: 50,
    tau_h:   16,
    beta:    0.90,
    r2:      0.97,
    nPontos: 6,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COEFICIENTES CEB-FIP MC90 / fib MC2010
// ─────────────────────────────────────────────────────────────────────────────

/** Coeficiente s por classe de cimento — CEB-FIP MC90 */
export const S_CEB_FIP: Record<string, CoeficienteCebFip> = {
  /** CEM 42.5R, CEM 52.5N, CEM 52.5R — endurecimento rápido */
  R: { s: 0.20, descricao: "Endurecimento rápido (CP V-ARI, 42.5R, 52.5)" },
  /** CEM 32.5R, CEM 42.5N — endurecimento normal */
  N: { s: 0.25, descricao: "Endurecimento normal (CP II-F, CP II-E)" },
  /** CEM 32.5N — endurecimento lento (escórias, pozolanas) */
  S: { s: 0.38, descricao: "Endurecimento lento (CP III, CP IV)" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/** Arredonda para n casas decimais */
function _ar(valor: number, casas: number = 2): number {
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}

/** Validação com mensagem de erro descritiva */
function _validar(condicao: boolean, mensagem: string): void {
  if (!condicao) {
    throw new Error(`[ThermoCore] ${mensagem}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — α_max
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o grau de hidratação máximo α_max pela equação de Powers (1949).
 *
 * Para a/c normais (≥ 0.28):
 *   α_max = min(1.0, 1.031 × a/c / (0.194 + a/c))       [Powers 1949]
 *
 * Para UHPC (a/c < 0.28):
 *   α_max = a/c / 0.36                                   [Bentz 1997]
 *
 * @param relacaoAC Relação água/cimento — adimensional
 * @returns α_max — adimensional (0–1)
 * @throws ThermoCoreRelacaoAcInvalidaError se a/c ∉ [0.20, 0.80]
 *
 * @example
 * calcularAlphaMax(0.50)  // → 0.743
 * calcularAlphaMax(0.25)  // → 0.694 (Bentz UHPC)
 */
export function calcularAlphaMax(relacaoAC: number): number {
  if (relacaoAC < 0.20 || relacaoAC > 0.80) {
    throw new ThermoCoreRelacaoAcInvalidaError(relacaoAC);
  }

  if (relacaoAC < 0.28) {
    // Bentz (1997) — UHPC com deficiência de água
    return _ar(relacaoAC / 0.36, 4);
  }

  // Powers (1949) — faixa convencional
  return _ar(Math.min(1.0, 1.031 * relacaoAC / (0.194 + relacaoAC)), 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — Idade Equivalente (Arrhenius)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o incremento de idade equivalente ΔtE pelo método de Arrhenius.
 *
 *   Δt_e = Δt × exp[ Ea/R × (1/T_r − 1/T_c) ]           [ASTM C1074-19]
 *
 * @param deltaT_h     Intervalo de tempo — h
 * @param temperaturaMed_C Temperatura média do concreto no intervalo — °C
 * @param Ea_J_mol     Energia de ativação — J/mol
 * @returns Incremento de idade equivalente — h
 *
 * @example
 * calcularDeltaTeArrhenius(1, 30, 40000)  // → ~1.48 h (quente = envelhece mais rápido)
 * calcularDeltaTeArrhenius(1, 10, 40000)  // → ~0.63 h (frio = envelhece mais devagar)
 */
export function calcularDeltaTeArrhenius(
  deltaT_h: number,
  temperaturaMed_C: number,
  Ea_J_mol: number,
): number {
  const T_c_K = temperaturaMed_C + 273.15;
  const expoente = (Ea_J_mol / R_GAS) * (1 / T_REF_K - 1 / T_c_K);
  return deltaT_h * Math.exp(expoente);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — Maturidade Nurse-Saul
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o incremento de maturidade Nurse-Saul.
 *
 *   ΔM = (T_c − T₀) × Δt                                [Nurse 1949]
 *
 * Se T_c < T₀, contribuição é zero (concreto congelado não ganha maturidade).
 *
 * @param deltaT_h         Intervalo de tempo — h
 * @param temperaturaMed_C Temperatura média do concreto — °C
 * @param T0_C             Datum temperature — °C (padrão: −10°C)
 * @returns Incremento de maturidade — °C·h
 */
export function calcularDeltaMaturidade(
  deltaT_h: number,
  temperaturaMed_C: number,
  T0_C: number = T_DATUM_CELSIUS,
): number {
  const diff = temperaturaMed_C - T0_C;
  return diff > 0 ? diff * deltaT_h : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — Grau de hidratação FHP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o grau de hidratação α pelo modelo FHP.
 *
 *   α(t_e) = α_max × exp[ −(τ / t_e)^β ]                [FHP 1977]
 *
 * @param te_h     Idade equivalente — h
 * @param tau_h    Tempo característico — h
 * @param beta     Expoente de forma
 * @param alphaMax Grau de hidratação máximo
 * @returns α — adimensional (0–1)
 */
export function calcularAlphaFHP(
  te_h: number,
  tau_h: number,
  beta: number,
  alphaMax: number,
): number {
  if (te_h <= 0) return 0;
  return alphaMax * Math.exp(-Math.pow(tau_h / te_h, beta));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — Predição de fck
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prediz fck na idade equivalente te usando calibração Su/τ/β.
 *
 *   S(t_e) = Su × exp[ −(τ / t_e)^β ]                    [Su et al. 2001]
 *
 * @param te_h Idade equivalente — h
 * @param cal  Parâmetros calibrados Su/τ/β
 * @returns fck predito — MPa
 */
export function predizFckTeCalibrado(
  te_h: number,
  cal: ParamsCalibracao,
): number {
  if (te_h <= 0) return 0;
  const fck = cal.Su_MPa * Math.exp(-Math.pow(cal.tau_h / te_h, cal.beta));
  return _ar(fck, 2);
}

/**
 * Prediz fck pela equação CEB-FIP MC90 / fib MC2010 (fallback).
 *
 *   β_cc(t) = exp( s × (1 − √(28/t)) )
 *   f(t) = fck_28 × β_cc(t)
 *
 * @param idade_h   Idade do concreto — horas (pode ser te ou real)
 * @param fck28_MPa fck de projeto aos 28 dias — MPa
 * @param s         Coeficiente s do CEB-FIP (0.20=R, 0.25=N, 0.38=S)
 * @returns fck predito — MPa
 */
export function predizFckCebFip(
  idade_h: number,
  fck28_MPa: number,
  s: number,
): number {
  if (idade_h <= 0) return 0;
  const idade_d = idade_h / 24;
  if (idade_d <= 0) return 0;
  const beta_cc = Math.exp(s * (1 - Math.sqrt(28 / idade_d)));
  return _ar(fck28_MPa * beta_cc, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — Calibração OLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calibra os parâmetros Su/τ/β a partir de pontos (t_e, fck) de CPs rompidos.
 *
 * Procedimento (ASTM C1074 §7.2.4):
 * 1. Estima Su como 1.05–1.20 × max(fck_i), testa múltiplos candidatos
 * 2. Lineariza: y = ln(−ln(S_i/Su)), x = ln(t_e_i)
 * 3. OLS → β = −B, τ = exp(−A/B)
 * 4. Escolhe o Su com melhor R²
 *
 * @param pontos Pontos de calibração (mínimo 3)
 * @returns Parâmetros calibrados Su/τ/β
 * @throws ThermoCoreLeiturasInsuficientesError se < 3 pontos
 * @throws ThermoCoreCalibraçãoInvalidaError se calibração falhar
 */
export function calibrarSuTauBeta(pontos: PontoCalibracao[]): ParamsCalibracao {
  if (pontos.length < 3) {
    throw new ThermoCoreLeiturasInsuficientesError(pontos.length);
  }

  const maxFck = Math.max(...pontos.map(p => p.fck_MPa));

  // Testa Su candidatos: 1.05, 1.08, 1.10, 1.12, 1.15, 1.20 × max(fck)
  const multipliers = [1.05, 1.08, 1.10, 1.12, 1.15, 1.20];
  let melhor: ParamsCalibracao | null = null;

  for (const m of multipliers) {
    const Su_cand = maxFck * m;
    const result = _tentarCalibracao(pontos, Su_cand);
    if (result && (melhor === null || result.r2 > melhor.r2)) {
      melhor = result;
    }
  }

  if (!melhor || melhor.r2 < 0.80) {
    throw new ThermoCoreCalibraçãoInvalidaError(
      `R² = ${melhor?.r2.toFixed(3) ?? "N/A"} — ajuste insuficiente. ` +
      `Verifique se os CPs foram ensaiados corretamente.`
    );
  }

  return melhor;
}

/**
 * Tenta calibração OLS para um Su candidato.
 * @internal
 */
function _tentarCalibracao(
  pontos: PontoCalibracao[],
  Su: number,
): ParamsCalibracao | null {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const p of pontos) {
    const ratio = p.fck_MPa / Su;
    if (ratio <= 0 || ratio >= 1) continue;
    const lnRatio = Math.log(-Math.log(ratio));
    xs.push(Math.log(p.te_h));
    ys.push(lnRatio);
  }

  if (xs.length < 3) return null;

  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const sumY2 = ys.reduce((a, y) => a + y * y, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;

  const B = (n * sumXY - sumX * sumY) / denom;
  const A = (sumY - B * sumX) / n;

  // β = −B, τ = exp(−A/B)
  const beta = -B;
  if (beta <= 0 || beta > 3) return null;

  if (Math.abs(B) < 1e-12) return null;
  const tau = Math.exp(-A / B);
  if (tau <= 0 || tau > 200) return null;

  // R²
  const yMean = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssRes = xs.reduce((a, x, i) => {
    const yPred = A + B * x;
    return a + (ys[i] - yPred) ** 2;
  }, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    Su_MPa: _ar(Su, 2),
    tau_h: _ar(tau, 2),
    beta: _ar(beta, 4),
    r2: _ar(r2, 4),
    nPontos: n,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — Idade equivalente para desforma
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a idade equivalente necessária para atingir fck_alvo usando calibração.
 *
 * Inverte S(t_e) = Su × exp[−(τ/t_e)^β]:
 *   t_e = τ / [−ln(fck_alvo/Su)]^(1/β)
 *
 * @param fckAlvo_MPa fck mínimo para desforma — MPa
 * @param cal Parâmetros calibrados
 * @returns Idade equivalente necessária — h (ou Infinity se fck_alvo > Su)
 */
export function calcularTeDesforma(
  fckAlvo_MPa: number,
  cal: ParamsCalibracao,
): number {
  if (fckAlvo_MPa >= cal.Su_MPa) return Infinity;
  if (fckAlvo_MPa <= 0) return 0;

  const ratio = fckAlvo_MPa / cal.Su_MPa;
  const lnRatio = -Math.log(ratio); // > 0 pois ratio < 1
  const te = cal.tau_h / Math.pow(lnRatio, 1 / cal.beta);
  return _ar(te, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES EXPORTADAS — Gerador de curva teórica
// ─────────────────────────────────────────────────────────────────────────────

/** Ponto da curva teórica de maturidade/resistência */
export interface PontoCurvaTeórica {
  te_h: number;
  fck_calibrado_MPa: number;
  fck_ceb_MPa: number;
  alpha: number;
}

/**
 * Gera curva teórica fck(t_e) para sobreposição nos gráficos.
 *
 * @param cal      Parâmetros calibrados Su/τ/β
 * @param fck28    fck de projeto aos 28d — MPa (para CEB-FIP)
 * @param s        Coeficiente s CEB-FIP (0.20, 0.25 ou 0.38)
 * @param teMax_h  Idade equivalente máxima — h (padrão: 672 = 28d)
 * @param nPontos  Número de pontos na curva (padrão: 100)
 * @returns Array de pontos da curva teórica
 */
export function gerarCurvaMaturidade(
  cal: ParamsCalibracao,
  fck28: number,
  s: number,
  teMax_h: number = 672,
  nPontos: number = 100,
): PontoCurvaTeórica[] {
  const alphaMax = 0.9; // estimativa razoável para curva teórica
  const curva: PontoCurvaTeórica[] = [];

  for (let i = 1; i <= nPontos; i++) {
    const te = (teMax_h * i) / nPontos;
    const fck_cal = predizFckTeCalibrado(te, cal);
    const fck_ceb = predizFckCebFip(te, fck28, s);
    const alpha = calcularAlphaFHP(te, cal.tau_h, cal.beta, alphaMax);

    curva.push({
      te_h: _ar(te, 2),
      fck_calibrado_MPa: fck_cal,
      fck_ceb_MPa: fck_ceb,
      alpha: _ar(alpha, 4),
    });
  }

  return curva;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR PRINCIPAL — executarThermoCore
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa série temporal de temperatura e retorna curva de maturidade,
 * predição de fck e decisão de desforma.
 *
 * Fluxo:
 *   1. Valida leituras
 *   2. Calcula α_max (se a/c fornecido)
 *   3. Para cada intervalo: ΔM (Nurse-Saul) + Δt_e (Arrhenius)
 *   4. Para cada t_e: α(FHP) + fck(calibrado) + fck(CEB-FIP)
 *   5. Avalia critério de desforma no instante final
 *
 * @param entrada Dados de monitoramento + parâmetros de cálculo
 * @returns Resultado completo com curva, desforma, fck
 * @throws ThermoCoreLeiturasInsuficientesError se < 3 leituras
 */
export function executarThermoCore(entrada: EntradaThermoCore): ResultadoThermoCore {
  const { leituras, Ea_J_mol, calibracao, fck28_MPa } = entrada;
  const s_ceb = entrada.s_ceb ?? 0.25; // default: endurecimento normal

  // Validação
  if (leituras.length < 3) {
    throw new ThermoCoreLeiturasInsuficientesError(leituras.length);
  }

  // Ordena por tempo
  const sorted = [...leituras].sort((a, b) => a.tempo_h - b.tempo_h);

  // α_max
  const alphaMax = entrada.relacaoAc
    ? calcularAlphaMax(entrada.relacaoAc)
    : 0.9; // default conservador

  // Acumuladores
  let maturidade_Ch = 0;
  let te_h = 0;

  const curva: PontoMaturidade[] = [];

  // Primeiro ponto
  const p0 = sorted[0];
  curva.push({
    tempo_h: _ar(p0.tempo_h, 2),
    temperatura_C: _ar(p0.temperatura_C, 1),
    maturidade_Ch: 0,
    te_h: 0,
    alpha: 0,
    fck_pred_MPa: 0,
    fck_ceb_MPa: 0,
  });

  // Integração numérica (trapezoidal)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const dt = curr.tempo_h - prev.tempo_h;
    if (dt <= 0) continue;

    const Tmed = (prev.temperatura_C + curr.temperatura_C) / 2;

    // Nurse-Saul
    maturidade_Ch += calcularDeltaMaturidade(dt, Tmed);

    // Arrhenius
    te_h += calcularDeltaTeArrhenius(dt, Tmed, Ea_J_mol);

    // FHP
    const alpha = calcularAlphaFHP(te_h, calibracao.tau_h, calibracao.beta, alphaMax);

    // Predições de fck
    const fck_pred = predizFckTeCalibrado(te_h, calibracao);
    const fck_ceb = predizFckCebFip(te_h, fck28_MPa, s_ceb);

    curva.push({
      tempo_h: _ar(curr.tempo_h, 2),
      temperatura_C: _ar(curr.temperatura_C, 1),
      maturidade_Ch: _ar(maturidade_Ch, 1),
      te_h: _ar(te_h, 2),
      alpha: _ar(alpha, 4),
      fck_pred_MPa: fck_pred,
      fck_ceb_MPa: fck_ceb,
    });
  }

  // Último ponto
  const ultimo = curva[curva.length - 1];

  // Critério de desforma
  const fckAlvo = fck28_MPa * 0.70;
  const cond_resist = ultimo.fck_pred_MPa >= fckAlvo;

  const deltaT = entrada.T_superficie_C != null
    ? Math.abs(ultimo.temperatura_C - entrada.T_superficie_C)
    : null;
  const cond_deltaT = deltaT == null || deltaT <= LIMITE_DELTA_T_C;
  const cond_T_nucleo = ultimo.temperatura_C <= LIMITE_T_NUCLEO_C;
  const cond_te_min = entrada.te_min_obra_h == null || ultimo.te_h >= entrada.te_min_obra_h;

  const desforma: CriterioDesforma = {
    liberado: cond_resist && cond_deltaT && cond_T_nucleo && cond_te_min,
    condicao_resistencia: cond_resist,
    condicao_deltaT: cond_deltaT,
    condicao_T_nucleo: cond_T_nucleo,
    condicao_te_min: cond_te_min,
    detalhes: {
      fck_pred_MPa: ultimo.fck_pred_MPa,
      fck_alvo_MPa: _ar(fckAlvo, 2),
      deltaT_C: deltaT != null ? _ar(deltaT, 1) : null,
      T_nucleo_C: ultimo.temperatura_C,
      te_h: ultimo.te_h,
      te_min_h: entrada.te_min_obra_h ?? null,
    },
  };

  return {
    curva,
    desforma,
    alphaMax: _ar(alphaMax, 4),
    te_final_h: ultimo.te_h,
    fck_final_MPa: ultimo.fck_pred_MPa,
    maturidade_final_Ch: ultimo.maturidade_Ch,
  };
}
