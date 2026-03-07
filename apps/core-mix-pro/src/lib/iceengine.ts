/**
 * @file lib/iceengine.ts
 * @description ICEENGINE — Motor de Concreto Massa: Fourier 1D + Gelo/LN₂
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MODELO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este motor resolve o problema térmico de concreto massa (blocos de
 * fundação, barragens, elementos com espessura > 0.80m) onde o calor de
 * hidratação pode gerar gradientes térmicos prejudiciais à integridade
 * estrutural (fissuração térmica).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EQUAÇÃO DE FOURIER 1D — Condução com geração interna de calor
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   ∂T/∂t = α_th × ∂²T/∂x² + q(t) / (ρ × cp)                    … (1)
 *
 * Onde:
 *   T(x,t)   = campo de temperatura — °C
 *   α_th     = difusividade térmica = k / (ρ × cp) — m²/s
 *   k        = condutividade térmica — W/(m·°C)
 *   ρ        = massa específica — kg/m³
 *   cp       = calor específico — J/(kg·°C)
 *   q(t)     = taxa de geração de calor — W/m³
 *
 * Discretização: Método de Diferenças Finitas Explícito (FTCS):
 *   T_i^(n+1) = T_i^n + Fo × (T_(i-1)^n − 2T_i^n + T_(i+1)^n) + Δt×q/(ρ×cp)
 *
 * Onde Fo = α_th × Δt / Δx²  (número de Fourier, Fo ≤ 0.5 para estabilidade)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * GERAÇÃO DE CALOR — Modelo FHP via Hydra4D Engine
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   α(t) = α_max × exp[−(τ/t)^β]                                  … (2)
 *   dα/dt = α_max × β × (τ^β / t^(β+1)) × exp[−(τ/t)^β]          … (2')
 *   q(t) = Q_total × dα/dt                                         … (3)
 *   Q_total = Q_ef × m_cimento / V   [J/m³]
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BALANÇO TÉRMICO — Gelo como refrigerante
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   Q_gelo = m_gelo × L_fusao                                      … (4)
 *   L_fusao = 334 kJ/kg (calor latente de fusão do gelo)
 *
 *   Redução de temperatura:
 *   ΔT_gelo = Q_gelo / (m_total × cp_concreto)                     … (4')
 *
 *   Substituição parcial da água de amassamento:
 *   T_lanc_ef = T_lanc − (m_gelo/m_agua) × [L/(cp_agua×1000) + T_agua]
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BALANÇO TÉRMICO — Nitrogênio Líquido (LN₂)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   Q_N2 = m_N2 × (L_N2 + cp_N2_gas × ΔT_aquec)                   … (5)
 *   L_N2 = 199 kJ/kg (calor latente de vaporização)
 *   cp_N2_gas ≈ 1.04 kJ/(kg·°C)
 *   ΔT_aquec = T_concreto − (−196°C) ≈ T_concreto + 196
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CRITÉRIOS DE CONFORMIDADE — ACI 207.1R-05 + NBR 6118:2023
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   Critério 1: ΔT_nucleo_superficie ≤ 20°C  (ACI 207.1R-05 §3.2)  … (6a)
 *   Critério 2: T_nucleo ≤ 70°C              (NBR 6118:2023 §7.7)   … (6b)
 *   Critério 3: T_lancamento ≤ 35°C          (prática brasileira)    … (6c)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1]  ACI 207.1R-05 — Guide to Mass Concrete
 *   [2]  ACI 207.2R-07 — Report on Thermal and Volume Change Effects
 *   [3]  NBR 6118:2023 — Projeto de estruturas de concreto
 *   [4]  Mehta, P.K. & Monteiro, P.J.M. (2014). Concrete: Microstructure,
 *        Properties, and Materials. 4th ed. McGraw-Hill.
 *   [5]  Neville, A.M. (2016). Properties of Concrete. 5th ed. Pearson.
 *   [6]  Schindler, A.K. & Folliard, K.J. (2005). Heat of Hydration Models.
 *        ACI Materials Journal, 102(1), 24–33.
 *   [7]  Freiesleben Hansen, P. & Pedersen, E.J. (1977). Maturity computer.
 *   [8]  Vechim, J. (2026). Simulação térmica de concreto massa — Mestrado.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES FÍSICAS
// ─────────────────────────────────────────────────────────────────────────────

/** Calor latente de fusão do gelo — kJ/kg */
export const L_FUSAO_GELO_KJKG = 334;

/** Calor latente de vaporização do N₂ líquido — kJ/kg */
export const L_VAPORIZ_LN2_KJKG = 199;

/** Calor específico do N₂ gasoso — kJ/(kg·°C) */
export const CP_N2_GAS_KJKGC = 1.04;

/** Temperatura de ebulição do N₂ líquido — °C */
export const T_EBULICAO_LN2_C = -196;

/** Calor específico da água — kJ/(kg·°C) */
export const CP_AGUA_KJKGC = 4.186;

/** Limite ΔT núcleo-superfície — °C (ACI 207.1R-05) */
export const LIMITE_DELTA_T_ACI207_C = 20;

/** Limite T núcleo máximo — °C (NBR 6118:2023) */
export const LIMITE_T_NUCLEO_NBR_C = 70;

/** Limite T de lançamento — °C (prática brasileira) */
export const LIMITE_T_LANCAMENTO_C = 35;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Propriedades térmicas do concreto */
export interface PropriedadesTermicas {
  /** Condutividade térmica — W/(m·°C) [tipicamente 1.5–2.5] */
  condutividade_WmC: number;
  /** Massa específica — kg/m³ [tipicamente 2300–2500] */
  densidade_kgm3: number;
  /** Calor específico — J/(kg·°C) [tipicamente 880–1050] */
  calorEspecifico_JkgC: number;
}

/** Parâmetros de geração de calor (vindos do Hydra4D Engine) */
export interface ParamsCalorHidratacao {
  /** Calor efetivo do cimento — kJ/kg */
  Q_ef_kJkg: number;
  /** Consumo de cimento — kg/m³ */
  consumoCimento_kgm3: number;
  /** Tempo característico FHP — h */
  tau_h: number;
  /** Expoente FHP — adimensional */
  beta: number;
  /** Grau máximo de hidratação — adimensional (0–1) */
  alphaMax: number;
}

/** Entrada para simulação Fourier 1D */
export interface EntradaIceEngine {
  /** Espessura do elemento — metros */
  espessura_m: number;
  /** Temperatura de lançamento do concreto — °C */
  T_lancamento_C: number;
  /** Temperatura ambiente — °C */
  T_ambiente_C: number;
  /** Propriedades térmicas do concreto */
  propriedades: PropriedadesTermicas;
  /** Parâmetros de geração de calor */
  calor: ParamsCalorHidratacao;
  /** Duração da simulação — horas (default 168 = 7 dias) */
  duracao_h?: number;
  /** Número de nós na malha espacial (default 21) */
  nNos?: number;
  /** Condição de contorno: superfície exposta ao ar ou com forma */
  condicaoContorno?: "exposta" | "forma";
  /** Coeficiente de convecção superficial — W/(m²·°C) [default 10] */
  h_conveccao_Wm2C?: number;
}

/** Entrada para balanço de gelo */
export interface EntradaBalancoGelo {
  /** Volume de concreto — m³ */
  volume_m3: number;
  /** Consumo de água total — kg/m³ (antes de substituir por gelo) */
  consumoAgua_kgm3: number;
  /** Temperatura inicial da água de amassamento — °C */
  T_agua_C: number;
  /** Temperatura desejada de lançamento — °C */
  T_alvo_C: number;
  /** Temperatura dos agregados — °C */
  T_agregados_C: number;
  /** Temperatura do cimento — °C */
  T_cimento_C: number;
  /** Consumo de cimento — kg/m³ */
  consumoCimento_kgm3: number;
  /** Consumo de agregados — kg/m³ */
  consumoAgregados_kgm3: number;
  /** Calor específico dos agregados — kJ/(kg·°C) [default 0.84] */
  cpAgregados_kJkgC?: number;
  /** Calor específico do cimento — kJ/(kg·°C) [default 0.75] */
  cpCimento_kJkgC?: number;
}

/** Entrada para balanço de LN₂ */
export interface EntradaBalancoLN2 {
  /** Volume de concreto — m³ */
  volume_m3: number;
  /** Massa total do concreto — kg/m³ */
  densidadeConcreto_kgm3: number;
  /** Calor específico do concreto — kJ/(kg·°C) */
  cpConcreto_kJkgC: number;
  /** Temperatura atual do concreto — °C */
  T_atual_C: number;
  /** Temperatura alvo — °C */
  T_alvo_C: number;
}

/** Resultado de um ponto no tempo da simulação Fourier */
export interface PontoSimulacao {
  /** Tempo — horas */
  tempo_h: number;
  /** Temperatura no núcleo (centro da peça) — °C */
  T_nucleo_C: number;
  /** Temperatura na superfície — °C */
  T_superficie_C: number;
  /** Gradiente térmico ΔT = T_nucleo − T_superficie — °C */
  deltaT_C: number;
  /** Grau de hidratação no núcleo — adimensional */
  alpha_nucleo: number;
  /** Taxa de geração de calor no núcleo — W/m³ */
  q_nucleo_Wm3: number;
}

/** Resultado da verificação de conformidade */
export interface VerificacaoConformidade {
  /** ΔT máximo atingido — °C */
  deltaT_max_C: number;
  /** T máxima no núcleo — °C */
  T_nucleo_max_C: number;
  /** Tempo do pico térmico — h */
  t_pico_h: number;
  /** Atende critério ACI 207: ΔT ≤ 20°C */
  conforme_ACI207_deltaT: boolean;
  /** Atende critério NBR: T_nucleo ≤ 70°C */
  conforme_NBR_Tmax: boolean;
  /** Atende critério T_lançamento ≤ 35°C */
  conforme_T_lancamento: boolean;
  /** Decisão global: CONFORME / NÃO CONFORME */
  conforme: boolean;
  /** Mensagem de decisão para o operador */
  decisao: string;
}

/** Resultado do balanço de gelo */
export interface ResultadoBalancoGelo {
  /** Massa de gelo necessária — kg/m³ */
  massaGelo_kgm3: number;
  /** Massa de gelo total — kg */
  massaGelo_total_kg: number;
  /** Percentual de substituição da água — % */
  percentualSubstituicao: number;
  /** Calor removido pelo gelo — kJ/m³ */
  calorRemovido_kJm3: number;
  /** Temperatura de lançamento resultante — °C */
  T_lancamento_resultante_C: number;
  /** Viável: substituição ≤ 75% da água (prática) */
  viavel: boolean;
  /** Mensagem */
  mensagem: string;
}

/** Resultado do balanço de LN₂ */
export interface ResultadoBalancoLN2 {
  /** Massa de LN₂ necessária — kg/m³ */
  massaLN2_kgm3: number;
  /** Massa de LN₂ total — kg */
  massaLN2_total_kg: number;
  /** Calor absorvido pelo LN₂ — kJ/m³ */
  calorAbsorvido_kJm3: number;
  /** Custo estimado — R$/m³ (LN₂ ≈ R$ 3,50/kg) */
  custoEstimado_Rm3: number;
  /** Custo total — R$ */
  custoEstimado_total_R: number;
  /** Mensagem */
  mensagem: string;
}

/** Resultado completo do IceEngine */
export interface ResultadoIceEngine {
  /** Série temporal da simulação */
  curvaTermica: PontoSimulacao[];
  /** Perfil de temperatura na seção no momento do pico */
  perfilPico: Array<{ posicao_m: number; T_C: number }>;
  /** Verificação de conformidade */
  conformidade: VerificacaoConformidade;
  /** Parâmetros de entrada resumidos */
  resumo: {
    espessura_m: number;
    T_lancamento_C: number;
    T_ambiente_C: number;
    Q_ef_kJkg: number;
    consumoCimento_kgm3: number;
    duracao_h: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPRIEDADES TÉRMICAS PADRÃO POR TIPO DE CONCRETO
// ─────────────────────────────────────────────────────────────────────────────

/** Propriedades térmicas de referência para concretos brasileiros */
export const PROPRIEDADES_TERMICAS_DEFAULT: Record<string, PropriedadesTermicas> = {
  /** Concreto convencional com agregado calcário */
  CCV_CALCARIO: {
    condutividade_WmC: 2.0,
    densidade_kgm3: 2400,
    calorEspecifico_JkgC: 1000,
  },
  /** Concreto convencional com agregado granítico */
  CCV_GRANITO: {
    condutividade_WmC: 2.3,
    densidade_kgm3: 2450,
    calorEspecifico_JkgC: 920,
  },
  /** Concreto convencional com agregado basáltico */
  CCV_BASALTO: {
    condutividade_WmC: 1.8,
    densidade_kgm3: 2500,
    calorEspecifico_JkgC: 880,
  },
  /** Concreto de Alto Desempenho (CAD) */
  CAD: {
    condutividade_WmC: 2.1,
    densidade_kgm3: 2450,
    calorEspecifico_JkgC: 950,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class IceEngineEspessuraInvalidaError extends Error {
  constructor(e: number) {
    super(
      `[IceEngine] Espessura (${e.toFixed(2)}m) fora da faixa válida [0.10, 20.0]m. ` +
      `Verifique as dimensões do elemento.`
    );
    this.name = "IceEngineEspessuraInvalidaError";
  }
}

export class IceEngineInstabilidadeError extends Error {
  constructor(fo: number) {
    super(
      `[IceEngine] Número de Fourier (${fo.toFixed(4)}) > 0.5 — simulação instável. ` +
      `Aumente o número de nós ou reduza o passo de tempo.`
    );
    this.name = "IceEngineInstabilidadeError";
  }
}

export class IceEngineGeloExcessivoError extends Error {
  constructor(pct: number) {
    super(
      `[IceEngine] Substituição de água por gelo (${pct.toFixed(0)}%) excede 100%. ` +
      `Considere usar LN₂ como complemento ou reduzir T_alvo.`
    );
    this.name = "IceEngineGeloExcessivoError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function _validar(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(`[IceEngine] ${msg}`);
}

function _ar(v: number, n: number): number {
  const f = Math.pow(10, n);
  return Math.round(v * f) / f;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 1 — DIFUSIVIDADE TÉRMICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a difusividade térmica do concreto.
 *
 *   α_th = k / (ρ × cp)                                            … (7)
 *
 * @returns Difusividade térmica — m²/s
 */
export function calcularDifusividade(props: PropriedadesTermicas): number {
  return props.condutividade_WmC / (props.densidade_kgm3 * props.calorEspecifico_JkgC);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 2 — TAXA DE GERAÇÃO DE CALOR q(t) via FHP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a taxa de geração de calor q(t) [W/m³] no tempo t.
 *
 *   dα/dt = α_max × β × (τ/t)^β × (1/t) × exp[−(τ/t)^β]          … (2')
 *   q(t) = Q_total [J/m³] × dα/dt [1/s]                            … (3)
 *
 * @param t_h    Tempo — horas
 * @param params Parâmetros de geração de calor
 * @returns      q(t) — W/m³
 */
export function calcularTaxaCalorFHP(
  t_h: number,
  params: ParamsCalorHidratacao
): number {
  if (t_h <= 0) return 0;

  const t_s = t_h * 3600; // horas → segundos
  const tau_s = params.tau_h * 3600;

  const ratio = tau_s / t_s;
  const ratioBeta = Math.pow(ratio, params.beta);
  const dAlphaDt = params.alphaMax * params.beta * ratioBeta / t_s * Math.exp(-ratioBeta);

  // Q_total em J/m³
  const Q_total_Jm3 = params.Q_ef_kJkg * 1000 * params.consumoCimento_kgm3;

  return Q_total_Jm3 * dAlphaDt; // W/m³ = J/(m³·s)
}

/**
 * Calcula o grau de hidratação α(t) via FHP.
 */
export function calcularAlphaFHP(
  t_h: number,
  params: ParamsCalorHidratacao
): number {
  if (t_h <= 0) return 0;
  return params.alphaMax * Math.exp(-Math.pow(params.tau_h / t_h, params.beta));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 3 — SIMULAÇÃO FOURIER 1D (FTCS explícito)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa simulação térmica Fourier 1D com geração interna de calor.
 *
 * Método: Forward-Time Central-Space (FTCS) — diferenças finitas explícitas.
 *
 * Malha: 0 (superfície inferior) → e/2 (núcleo) → e (superfície superior)
 * Simetria: resolve metade da peça (0 → e/2), espelha.
 *
 * Condições de contorno:
 *   - Superfície: T = T_ambiente (Dirichlet) ou convecção (Robin)
 *   - Núcleo: ∂T/∂x = 0 (simetria — Neumann)
 *
 * Estabilidade: Fo = α_th × Δt / Δx² ≤ 0.5
 *
 * @param entrada Parâmetros da simulação
 * @returns       Resultado completo com série temporal e conformidade
 */
export function simularFourier1D(entrada: EntradaIceEngine): ResultadoIceEngine {
  // ── Validação ─────────────────────────────────────────────────
  if (entrada.espessura_m < 0.10 || entrada.espessura_m > 20.0) {
    throw new IceEngineEspessuraInvalidaError(entrada.espessura_m);
  }

  const e = entrada.espessura_m;
  const nNos = entrada.nNos ?? 21;
  const duracao_h = entrada.duracao_h ?? 168;
  const props = entrada.propriedades;
  const calor = entrada.calor;
  const Tamb = entrada.T_ambiente_C;
  const Tlanc = entrada.T_lancamento_C;
  const hConv = entrada.h_conveccao_Wm2C ?? 10;

  // ── Malha espacial (meia peça por simetria) ────────────────────
  const meiaEspessura = e / 2;
  const dx = meiaEspessura / (nNos - 1);

  // ── Propriedades derivadas ────────────────────────────────────
  const alpha_th = calcularDifusividade(props); // m²/s
  const rho = props.densidade_kgm3;
  const cp = props.calorEspecifico_JkgC;

  // ── Passo de tempo (limitado por estabilidade Fo ≤ 0.45) ──────
  const Fo_max = 0.45;
  const dt_max = Fo_max * dx * dx / alpha_th; // segundos
  const dt = Math.min(dt_max, 60); // máximo 60s
  const Fo = alpha_th * dt / (dx * dx);

  if (Fo > 0.5) {
    throw new IceEngineInstabilidadeError(Fo);
  }

  const nSteps = Math.ceil(duracao_h * 3600 / dt);
  const intervaloSaida = Math.max(1, Math.floor(3600 / dt)); // 1 ponto/hora

  // ── Condição inicial: T = T_lancamento em todos os nós ────────
  let T = new Float64Array(nNos);
  T.fill(Tlanc);

  // ── Arrays de saída ───────────────────────────────────────────
  const curvaTermica: PontoSimulacao[] = [];
  let T_nucleo_max = -Infinity;
  let deltaT_max = -Infinity;
  let t_pico_h = 0;
  let perfilPico: Array<{ posicao_m: number; T_C: number }> = [];

  // Registra ponto inicial
  const iNucleo = nNos - 1; // último nó = centro (simetria)
  curvaTermica.push({
    tempo_h: 0,
    T_nucleo_C: _ar(Tlanc, 2),
    T_superficie_C: _ar(Tlanc, 2),
    deltaT_C: 0,
    alpha_nucleo: 0,
    q_nucleo_Wm3: 0,
  });

  // ── Loop temporal FTCS ────────────────────────────────────────
  for (let step = 1; step <= nSteps; step++) {
    const t_s = step * dt;
    const t_h = t_s / 3600;

    // Taxa de calor no tempo atual
    const q = calcularTaxaCalorFHP(t_h, calor);

    // Novo array de temperatura
    const Tnew = new Float64Array(nNos);

    // Nó 0 = superfície: condição de contorno
    if (entrada.condicaoContorno === "forma") {
      // Robin (convecção): −k × dT/dx = h × (T_sup − T_amb)
      // Discretizado: T_0^(n+1) = T_0^n + Fo × (T_1^n − T_0^n) × 2 − 2×Fo×Bi×(T_0^n − T_amb)
      const Bi = hConv * dx / props.condutividade_WmC;
      Tnew[0] = T[0] + 2 * Fo * (T[1] - T[0]) - 2 * Fo * Bi * (T[0] - Tamb) + dt * q / (rho * cp);
    } else {
      // Dirichlet: T_superfície = T_ambiente
      Tnew[0] = Tamb;
    }

    // Nós internos: FTCS
    for (let i = 1; i < nNos - 1; i++) {
      Tnew[i] = T[i] + Fo * (T[i - 1] - 2 * T[i] + T[i + 1]) + dt * q / (rho * cp);
    }

    // Nó N-1 = núcleo (simetria): ∂T/∂x = 0 → T_N = T_(N-2) espelhado
    // T_nucleo^(n+1) = T_nucleo^n + 2×Fo×(T_(N-2)^n − T_nucleo^n) + dt×q/(ρ×cp)
    Tnew[iNucleo] = T[iNucleo] + 2 * Fo * (T[iNucleo - 1] - T[iNucleo]) + dt * q / (rho * cp);

    T = Tnew;

    // ── Registro a cada hora ───────────────────────────────────
    if (step % intervaloSaida === 0 || step === nSteps) {
      const Tnuc = T[iNucleo];
      const Tsup = T[0];
      const dT = Tnuc - Tsup;
      const alpha = calcularAlphaFHP(t_h, calor);

      curvaTermica.push({
        tempo_h: _ar(t_h, 2),
        T_nucleo_C: _ar(Tnuc, 2),
        T_superficie_C: _ar(Tsup, 2),
        deltaT_C: _ar(dT, 2),
        alpha_nucleo: _ar(alpha, 4),
        q_nucleo_Wm3: _ar(q, 1),
      });

      // Rastreia máximos
      if (Tnuc > T_nucleo_max) {
        T_nucleo_max = Tnuc;
        t_pico_h = t_h;

        // Salva perfil de temperatura no pico
        perfilPico = [];
        for (let i = 0; i < nNos; i++) {
          perfilPico.push({
            posicao_m: _ar(i * dx, 4),
            T_C: _ar(T[i], 2),
          });
        }
      }
      if (dT > deltaT_max) {
        deltaT_max = dT;
      }
    }
  }

  // ── Verificação de conformidade ───────────────────────────────
  const conforme_ACI = deltaT_max <= LIMITE_DELTA_T_ACI207_C;
  const conforme_NBR = T_nucleo_max <= LIMITE_T_NUCLEO_NBR_C;
  const conforme_Tlanc = Tlanc <= LIMITE_T_LANCAMENTO_C;
  const conforme = conforme_ACI && conforme_NBR && conforme_Tlanc;

  const decisoes: string[] = [];
  if (!conforme_ACI) {
    decisoes.push(
      `ΔT=${_ar(deltaT_max, 1)}°C > ${LIMITE_DELTA_T_ACI207_C}°C (ACI 207 — risco de fissuração)`
    );
  }
  if (!conforme_NBR) {
    decisoes.push(
      `T_núcleo=${_ar(T_nucleo_max, 1)}°C > ${LIMITE_T_NUCLEO_NBR_C}°C (NBR 6118 — risco de DEF)`
    );
  }
  if (!conforme_Tlanc) {
    decisoes.push(
      `T_lançamento=${Tlanc}°C > ${LIMITE_T_LANCAMENTO_C}°C (prática brasileira)`
    );
  }

  const decisao = conforme
    ? `CONFORME — ΔT=${_ar(deltaT_max, 1)}°C, T_max=${_ar(T_nucleo_max, 1)}°C. Seguro para concretagem.`
    : `NÃO CONFORME — ${decisoes.join("; ")}. Medidas de controle térmico necessárias.`;

  return {
    curvaTermica,
    perfilPico,
    conformidade: {
      deltaT_max_C: _ar(deltaT_max, 1),
      T_nucleo_max_C: _ar(T_nucleo_max, 1),
      t_pico_h: _ar(t_pico_h, 1),
      conforme_ACI207_deltaT: conforme_ACI,
      conforme_NBR_Tmax: conforme_NBR,
      conforme_T_lancamento: conforme_Tlanc,
      conforme,
      decisao,
    },
    resumo: {
      espessura_m: e,
      T_lancamento_C: Tlanc,
      T_ambiente_C: Tamb,
      Q_ef_kJkg: calor.Q_ef_kJkg,
      consumoCimento_kgm3: calor.consumoCimento_kgm3,
      duracao_h,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 4 — BALANÇO DE GELO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a massa de gelo necessária para atingir a temperatura de
 * lançamento alvo, substituindo parcialmente a água de amassamento.
 *
 * Balanço térmico simplificado (ACI 207.4R):
 *   Calor a remover = Σ(m_i × cp_i × ΔT_i)
 *   Calor do gelo = m_gelo × (L + cp_agua × T_alvo)
 *
 * @param entrada Parâmetros do balanço
 * @returns       Resultado com massa de gelo e viabilidade
 */
export function calcularBalancoGelo(entrada: EntradaBalancoGelo): ResultadoBalancoGelo {
  const cpAgg = entrada.cpAgregados_kJkgC ?? 0.84;
  const cpCim = entrada.cpCimento_kJkgC ?? 0.75;
  const Talvo = entrada.T_alvo_C;

  // Calor sensível dos materiais (que precisam ser resfriados até T_alvo)
  const Q_agua = entrada.consumoAgua_kgm3 * CP_AGUA_KJKGC * (entrada.T_agua_C - Talvo);
  const Q_agg = entrada.consumoAgregados_kgm3 * cpAgg * (entrada.T_agregados_C - Talvo);
  const Q_cim = entrada.consumoCimento_kgm3 * cpCim * (entrada.T_cimento_C - Talvo);

  const Q_total_kJm3 = Q_agua + Q_agg + Q_cim; // kJ/m³ a remover

  if (Q_total_kJm3 <= 0) {
    return {
      massaGelo_kgm3: 0,
      massaGelo_total_kg: 0,
      percentualSubstituicao: 0,
      calorRemovido_kJm3: 0,
      T_lancamento_resultante_C: Talvo,
      viavel: true,
      mensagem: "Temperatura dos materiais já atende o alvo. Gelo não necessário.",
    };
  }

  // Capacidade de resfriamento por kg de gelo (gelo a 0°C → água a T_alvo)
  // Q_gelo_unitario = L_fusao + cp_agua × T_alvo [kJ/kg]
  const Q_gelo_unitario = L_FUSAO_GELO_KJKG + CP_AGUA_KJKGC * Talvo;

  // Massa de gelo necessária
  const massaGelo_kgm3 = Q_total_kJm3 / Q_gelo_unitario;
  const massaGelo_total = massaGelo_kgm3 * entrada.volume_m3;
  const percentual = (massaGelo_kgm3 / entrada.consumoAgua_kgm3) * 100;

  if (massaGelo_kgm3 > entrada.consumoAgua_kgm3) {
    throw new IceEngineGeloExcessivoError(percentual);
  }

  const viavel = percentual <= 75;

  return {
    massaGelo_kgm3: _ar(massaGelo_kgm3, 1),
    massaGelo_total_kg: _ar(massaGelo_total, 1),
    percentualSubstituicao: _ar(percentual, 1),
    calorRemovido_kJm3: _ar(Q_total_kJm3, 1),
    T_lancamento_resultante_C: _ar(Talvo, 1),
    viavel,
    mensagem: viavel
      ? `Substituir ${_ar(percentual, 0)}% da água por gelo (${_ar(massaGelo_kgm3, 0)} kg/m³).`
      : `Substituição de ${_ar(percentual, 0)}% excede recomendação de 75%. Considere LN₂ como complemento.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 5 — BALANÇO DE LN₂
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a massa de nitrogênio líquido necessária para resfriar o concreto.
 *
 *   Q_N2 = m_N2 × (L_N2 + cp_N2 × ΔT_aquec)                       … (5)
 *   ΔT_aquec = T_alvo − T_ebulicao = T_alvo + 196
 *
 * @param entrada Parâmetros do balanço
 * @returns       Resultado com massa de LN₂ e custo estimado
 */
export function calcularBalancoLN2(entrada: EntradaBalancoLN2): ResultadoBalancoLN2 {
  const deltaT = entrada.T_atual_C - entrada.T_alvo_C;

  if (deltaT <= 0) {
    return {
      massaLN2_kgm3: 0,
      massaLN2_total_kg: 0,
      calorAbsorvido_kJm3: 0,
      custoEstimado_Rm3: 0,
      custoEstimado_total_R: 0,
      mensagem: "Temperatura já atende o alvo. LN₂ não necessário.",
    };
  }

  // Calor a remover do concreto
  const Q_remover_kJm3 = entrada.densidadeConcreto_kgm3 *
    entrada.cpConcreto_kJkgC * deltaT;

  // Capacidade de resfriamento por kg de LN₂
  const deltaT_aquec = entrada.T_alvo_C - T_EBULICAO_LN2_C;
  const Q_LN2_unitario = L_VAPORIZ_LN2_KJKG + CP_N2_GAS_KJKGC * deltaT_aquec;

  const massaLN2_kgm3 = Q_remover_kJm3 / Q_LN2_unitario;
  const massaLN2_total = massaLN2_kgm3 * entrada.volume_m3;

  // Custo estimado: R$ 3,50/kg (referência mercado brasileiro 2026)
  const PRECO_LN2_RKG = 3.50;
  const custoM3 = massaLN2_kgm3 * PRECO_LN2_RKG;
  const custoTotal = massaLN2_total * PRECO_LN2_RKG;

  return {
    massaLN2_kgm3: _ar(massaLN2_kgm3, 1),
    massaLN2_total_kg: _ar(massaLN2_total, 1),
    calorAbsorvido_kJm3: _ar(Q_remover_kJm3, 1),
    custoEstimado_Rm3: _ar(custoM3, 2),
    custoEstimado_total_R: _ar(custoTotal, 2),
    mensagem: `LN₂: ${_ar(massaLN2_kgm3, 0)} kg/m³ · Custo: R$ ${_ar(custoM3, 2)}/m³`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 6 — TEMPERATURA DE LANÇAMENTO ESTIMADA (ACI 207.4R)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estima a temperatura de lançamento do concreto pela média ponderada
 * das temperaturas dos materiais constituintes (ACI 207.4R).
 *
 *   T_lanc ≈ Σ(m_i × cp_i × T_i) / Σ(m_i × cp_i)                 … (8)
 *
 * @param T_cimento   Temperatura do cimento — °C
 * @param T_agua      Temperatura da água — °C
 * @param T_agregados Temperatura dos agregados — °C
 * @param consumoCimento   kg/m³
 * @param consumoAgua      kg/m³
 * @param consumoAgregados kg/m³
 * @param cpCimento   kJ/(kg·°C) [default 0.75]
 * @param cpAgregados kJ/(kg·°C) [default 0.84]
 */
export function estimarTLancamento(
  T_cimento: number,
  T_agua: number,
  T_agregados: number,
  consumoCimento: number,
  consumoAgua: number,
  consumoAgregados: number,
  cpCimento: number = 0.75,
  cpAgregados: number = 0.84,
): number {
  const num =
    consumoCimento * cpCimento * T_cimento +
    consumoAgua * CP_AGUA_KJKGC * T_agua +
    consumoAgregados * cpAgregados * T_agregados;

  const den =
    consumoCimento * cpCimento +
    consumoAgua * CP_AGUA_KJKGC +
    consumoAgregados * cpAgregados;

  _validar(den > 0, "Soma dos consumos × cp deve ser positiva");

  return _ar(num / den, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 7 — ORQUESTRADOR: executarIceEngine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa o pipeline completo do IceEngine:
 *   1. Validação
 *   2. Simulação Fourier 1D
 *   3. Verificação de conformidade
 *
 * @param entrada Parâmetros completos da simulação
 * @returns       Resultado com curva térmica, perfil e conformidade
 */
export function executarIceEngine(entrada: EntradaIceEngine): ResultadoIceEngine {
  return simularFourier1D(entrada);
}
