/**
 * @file lib/rheocore.ts
 * @description RHEOCORE — Motor de Reometria Rotacional para Concreto Fresco
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MODELO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Reometria rotacional aplicada ao concreto fresco, com conversão de
 * leituras de amperagem ADS1115 (parafusadeira Bosch) em parâmetros
 * reológicos fundamentais (tensão de escoamento + viscosidade plástica).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CONVERSÃO AMPERAGEM → TORQUE
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   T = k_motor × I                                                  … (1)
 *
 * Onde:
 *   T       = torque — N·m
 *   k_motor = constante do motor (torque por ampère) — N·m/A
 *   I       = corrente elétrica — A
 *
 * Para parafusadeira Bosch GSR 120-LI: k_motor ≈ 0.12 N·m/A (calibrado)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TENSÃO DE CISALHAMENTO — Geometria Coaxial (Couette)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   τ = T / (2π × R_i² × h)                                          … (2)
 *
 * Onde:
 *   τ   = tensão de cisalhamento — Pa
 *   R_i = raio interno (haste/pá) — m
 *   h   = altura efetiva imersa — m
 *
 * Ref: Tattersall & Banfill (1983), The Rheology of Fresh Concrete
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TAXA DE CISALHAMENTO — Couette Analítico
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   γ̇ = (2 × ω × R_e²) / (R_e² − R_i²)                             … (3)
 *
 *   ω = 2π × RPM / 60                                                … (4)
 *
 * Onde:
 *   γ̇   = taxa de cisalhamento — 1/s
 *   ω   = velocidade angular — rad/s
 *   R_e = raio externo (recipiente) — m
 *   R_i = raio interno (haste) — m
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODELO DE BINGHAM (1922)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   τ = τ₀ + μ_p × γ̇                                                 … (5)
 *
 * Onde:
 *   τ₀  = tensão de escoamento (yield stress) — Pa
 *   μ_p = viscosidade plástica — Pa·s
 *
 * Ajuste linear: τ = A + B × γ̇  → τ₀ = A, μ_p = B
 * Ref: Bingham, E.C. (1922), Fluidity and Plasticity
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODELO DE HERSCHEL-BULKLEY (1926)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   τ = τ₀ + K × γ̇^n                                                 … (6)
 *
 * Onde:
 *   K = índice de consistência — Pa·s^n
 *   n = índice de comportamento (n < 1 → pseudoplástico, SCC/UHPC)
 *
 * Ajuste: linearização log(τ − τ₀) = log(K) + n × log(γ̇)
 * Ref: Herschel, W.H. & Bulkley, R. (1926), Kolloid-Zeitschrift
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CORRELAÇÕES EMPÍRICAS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Slump (Roussel, 2006 — concretos convencionais):
 *   Slump_mm ≈ 300 − 0.27 × τ₀                                      … (7)
 *   Domínio: 0 ≤ τ₀ ≤ 1100 Pa → Slump 300 mm a 0 mm
 *
 * Espalhamento / Flow (Roussel & Coussot, 2005 — SCC):
 *   D_flow_mm ≈ √(2 × ρ × g × V / (3 × τ₀)) × 1000               … (8)
 *   Domínio: τ₀ < 300 Pa (concretos autoadensáveis)
 *
 * T500 (Wallevik, 2006):
 *   T500_s ≈ 0.026 × μ_p + 0.3                                      … (9)
 *   Domínio: SCC com μ_p entre 10–80 Pa·s
 *
 * Cone de Marsh (de Larrard, 1998 — pastas/argamassas):
 *   t_marsh_s ≈ 0.58 × μ_p + 25                                     … (10)
 *
 * Ref: Roussel, N. (2006), Cem. Concr. Res. 36(10) 1797–1806
 *      Roussel & Coussot (2005), J. Rheol. 49(3) 705–718
 *      Wallevik, O.H. (2006), Nordic Concrete Research 34(2)
 *      de Larrard, F. (1998), Structures granulaires et formulation des bétons
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PERDA DE TRABALHABILIDADE — Evolução τ₀(t)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   τ₀(t) = τ₀_ini × (1 + A_thix × t)                              … (11)
 *
 * Onde:
 *   A_thix = taxa de tixotropia — 1/s (Roussel, 2006)
 *   τ₀_ini = tensão de escoamento inicial — Pa
 *   t      = tempo em repouso — s
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES FÍSICAS
// ─────────────────────────────────────────────────────────────────────────────

/** Aceleração gravitacional — m/s² */
export const G_MS2 = 9.81;

/** Densidade típica do concreto fresco — kg/m³ */
export const RHO_CONCRETO_KGM3 = 2400;

/** Volume do cone de Abrams — m³ (≈ 5.5 L) */
export const V_CONE_ABRAMS_M3 = 0.0055;

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class RheoCoreLeituraInsuficienteError extends Error {
  constructor(msg: string) {
    super(`[RheoCore] ${msg}`);
    this.name = "RheoCoreLeituraInsuficienteError";
  }
}

export class RheoCoreParametroInvalidoError extends Error {
  constructor(msg: string) {
    super(`[RheoCore] ${msg}`);
    this.name = "RheoCoreParametroInvalidoError";
  }
}

export class RheoCoreAjusteError extends Error {
  constructor(msg: string) {
    super(`[RheoCore] ${msg}`);
    this.name = "RheoCoreAjusteError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function _validar(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new RheoCoreParametroInvalidoError(msg);
}

/** Arredonda para n casas */
function _ar(v: number, n = 4): number {
  const f = 10 ** n;
  return Math.round(v * f) / f;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Leitura bruta do ADS1115 / NEXUS */
export interface LeituraAmperagem {
  /** Tempo desde início — segundos */
  tempo_s: number;
  /** Corrente elétrica — ampères */
  amperagem_A: number;
}

/** Configuração da geometria do reômetro improvisado */
export interface ConfigGeometria {
  /** Constante do motor: torque por ampère — N·m/A (default: 0.12 para Bosch GSR 120-LI) */
  k_motor_NmA: number;
  /** Raio interno (haste/pá misturadora) — m (default: 0.025) */
  raio_int_m: number;
  /** Raio externo (recipiente) — m (default: 0.075) */
  raio_ext_m: number;
  /** Altura efetiva imersa — m (default: 0.10) */
  altura_m: number;
  /** Rotação — RPM (default: 400) */
  rpm: number;
}

/** Ponto no espaço τ × γ̇ (para ajuste Bingham / HB) */
export interface PontoReologico {
  /** Taxa de cisalhamento — 1/s */
  gamma_dot_1s: number;
  /** Tensão de cisalhamento — Pa */
  tau_Pa: number;
}

/** Parâmetros Bingham ajustados */
export interface ParamsBingham {
  /** Tensão de escoamento — Pa */
  tau0_Pa: number;
  /** Viscosidade plástica — Pa·s */
  mu_p_Pas: number;
  /** Coeficiente de determinação */
  r2: number;
  /** Número de pontos usados no ajuste */
  nPontos: number;
}

/** Parâmetros Herschel-Bulkley ajustados */
export interface ParamsHerschelBulkley {
  /** Tensão de escoamento — Pa */
  tau0_Pa: number;
  /** Índice de consistência — Pa·s^n */
  K_Pasn: number;
  /** Índice de comportamento (n < 1 → pseudoplástico) */
  n: number;
  /** Coeficiente de determinação */
  r2: number;
  /** Número de pontos usados no ajuste */
  nPontos: number;
}

/** Correlações empíricas estimadas */
export interface CorrelacoesEmpiricas {
  /** Slump estimado — mm (Roussel 2006) */
  slump_mm: number | null;
  /** Espalhamento estimado — mm (Roussel & Coussot 2005) */
  flow_mm: number | null;
  /** T500 estimado — s (Wallevik 2006) */
  t500_s: number | null;
  /** Tempo Cone de Marsh estimado — s (de Larrard 1998) */
  marsh_s: number | null;
}

/** Classificação reológica do concreto */
export type ClasseReologica =
  | "CCV"    // Concreto Convencional Vibrado (τ₀ > 500 Pa)
  | "CAA_1"  // SCC classe SF1 — slump flow 550–650 mm
  | "CAA_2"  // SCC classe SF2 — slump flow 660–750 mm
  | "CAA_3"  // SCC classe SF3 — slump flow 760–850 mm
  | "UHPC"   // Ultra-alto desempenho (τ₀ < 30 Pa, n < 0.8)
  | "FLUIDO" // Argamassa fluida / graute (τ₀ < 10 Pa)
  ;

/** Ponto da evolução temporal */
export interface PontoEvolucaoTemporal {
  /** Tempo — s */
  tempo_s: number;
  /** Tempo — min */
  tempo_min: number;
  /** Torque — N·m */
  torque_Nm: number;
  /** Tensão de cisalhamento — Pa */
  tau_Pa: number;
  /** Viscosidade aparente — Pa·s */
  eta_ap_Pas: number;
}

/** Resultado da análise de perda de trabalhabilidade */
export interface AnalisePerda {
  /** Pontos da evolução temporal */
  pontos: PontoEvolucaoTemporal[];
  /** Taxa de crescimento de τ — Pa/min (regressão linear) */
  taxaCrescimento_PaMin: number;
  /** Tempo estimado para τ dobrar — min */
  tempoDobraTau_min: number | null;
  /** τ₀ inicial estimado — Pa */
  tau_inicial_Pa: number;
  /** τ₀ final — Pa */
  tau_final_Pa: number;
  /** Variação relativa (%) */
  variacaoRelativa_pct: number;
  /** r² da regressão linear τ(t) */
  r2: number;
}

/** Entrada completa do executarRheoCore */
export interface EntradaRheoCore {
  /** Leituras de amperagem do ADS1115 */
  leituras: LeituraAmperagem[];
  /** Configuração geométrica */
  geometria?: Partial<ConfigGeometria>;
  /** Pontos multi-velocidade para ajuste Bingham (opcional) */
  pontosMultiVel?: PontoReologico[];
  /** Densidade do concreto — kg/m³ (default: 2400) */
  rho_kgm3?: number;
}

/** Resultado completo do RheoCore */
export interface ResultadoRheoCore {
  /** Evolução temporal τ(t) + η_ap(t) */
  evolucao: PontoEvolucaoTemporal[];
  /** Análise de perda de trabalhabilidade */
  perda: AnalisePerda;
  /** Ajuste Bingham (se pontosMultiVel fornecidos, ou estimativa single-speed) */
  bingham: ParamsBingham;
  /** Ajuste Herschel-Bulkley (se pontosMultiVel com ≥ 4 pontos) */
  herschelBulkley: ParamsHerschelBulkley | null;
  /** Correlações empíricas */
  correlacoes: CorrelacoesEmpiricas;
  /** Classificação reológica */
  classe: ClasseReologica;
  /** Geometria utilizada */
  geometria: ConfigGeometria;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS CALIBRADOS
// ─────────────────────────────────────────────────────────────────────────────

/** Geometria default — Parafusadeira Bosch GSR 120-LI + balde 20L */
export const GEOMETRIA_DEFAULT: ConfigGeometria = {
  k_motor_NmA: 0.12,
  raio_int_m: 0.025,
  raio_ext_m: 0.075,
  altura_m: 0.10,
  rpm: 400,
};

/** Faixas de τ₀ para classificação (Pa) */
export const FAIXAS_TAU0: Record<ClasseReologica, { min: number; max: number }> = {
  FLUIDO: { min: 0, max: 10 },
  UHPC: { min: 10, max: 30 },
  CAA_3: { min: 30, max: 60 },
  CAA_2: { min: 60, max: 120 },
  CAA_1: { min: 120, max: 500 },
  CCV: { min: 500, max: Infinity },
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE CONVERSÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte amperagem em torque — Eq. (1)
 *
 * @param I_A       Corrente elétrica — A
 * @param k_motor   Constante do motor — N·m/A
 * @returns Torque — N·m
 */
export function converterAmperagemTorque(I_A: number, k_motor: number): number {
  _validar(I_A >= 0, `Amperagem inválida: ${I_A} A (deve ser ≥ 0)`);
  _validar(k_motor > 0, `k_motor inválido: ${k_motor} (deve ser > 0)`);
  return _ar(k_motor * I_A, 6);
}

/**
 * Calcula tensão de cisalhamento a partir do torque — Eq. (2)
 * Geometria Couette (cilindros coaxiais).
 *
 * @param T_Nm  Torque — N·m
 * @param Ri    Raio interno — m
 * @param h     Altura imersa — m
 * @returns τ — Pa
 */
export function calcularTensaoCisalhamento(T_Nm: number, Ri: number, h: number): number {
  _validar(T_Nm >= 0, `Torque inválido: ${T_Nm} N·m`);
  _validar(Ri > 0, `Raio interno inválido: ${Ri} m`);
  _validar(h > 0, `Altura inválida: ${h} m`);
  return _ar(T_Nm / (2 * Math.PI * Ri * Ri * h), 2);
}

/**
 * Calcula taxa de cisalhamento Couette — Eq. (3) e (4)
 *
 * @param rpm Rotação — RPM
 * @param Ri  Raio interno — m
 * @param Re  Raio externo — m
 * @returns γ̇ — 1/s
 */
export function calcularTaxaCisalhamento(rpm: number, Ri: number, Re: number): number {
  _validar(rpm > 0, `RPM inválido: ${rpm}`);
  _validar(Ri > 0 && Re > Ri, `Geometria inválida: Ri=${Ri}, Re=${Re} (Re > Ri > 0)`);
  const omega = (2 * Math.PI * rpm) / 60;
  return _ar((2 * omega * Re * Re) / (Re * Re - Ri * Ri), 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTE LINEAR (OLS) — usado em Bingham e perda de trabalhabilidade
// ─────────────────────────────────────────────────────────────────────────────

interface _RegressaoLinear {
  a: number; // intercepto
  b: number; // inclinação
  r2: number;
}

function _regressaoLinear(pontos: { x: number; y: number }[]): _RegressaoLinear {
  const n = pontos.length;
  if (n < 2) return { a: 0, b: 0, r2: 0 };

  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (const p of pontos) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
    syy += p.y * p.y;
  }

  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-12) return { a: sy / n, b: 0, r2: 0 };

  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;

  // R²
  const yMean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const p of pontos) {
    const yPred = a + b * p.x;
    ssTot += (p.y - yMean) ** 2;
    ssRes += (p.y - yPred) ** 2;
  }
  const r2 = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { a, b, r2 };
}

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTE BINGHAM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ajusta modelo de Bingham — Eq. (5)
 * Regressão linear τ = τ₀ + μ_p × γ̇
 *
 * @param pontos Array de {gamma_dot_1s, tau_Pa} com ≥ 3 pontos
 * @returns ParamsBingham ajustado
 *
 * Ref: Bingham, E.C. (1922). Fluidity and Plasticity.
 *      Tattersall, G.H. & Banfill, P.F.G. (1983).
 */
export function ajustarBingham(pontos: PontoReologico[]): ParamsBingham {
  _validar(
    pontos.length >= 3,
    `Mínimo 3 pontos para ajuste Bingham (recebido: ${pontos.length})`
  );

  const reg = _regressaoLinear(
    pontos.map((p) => ({ x: p.gamma_dot_1s, y: p.tau_Pa }))
  );

  return {
    tau0_Pa: _ar(Math.max(0, reg.a), 2),
    mu_p_Pas: _ar(Math.max(0, reg.b), 4),
    r2: _ar(reg.r2),
    nPontos: pontos.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTE HERSCHEL-BULKLEY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ajusta modelo de Herschel-Bulkley — Eq. (6)
 * Linearização: log(τ − τ₀) = log(K) + n × log(γ̇)
 * τ₀ estimado por busca iterativa (mínimo τ₀ que mantém todos τ − τ₀ > 0).
 *
 * @param pontos Array de {gamma_dot_1s, tau_Pa} com ≥ 4 pontos
 * @returns ParamsHerschelBulkley ajustado
 *
 * Ref: Herschel, W.H. & Bulkley, R. (1926). Kolloid-Zeitschrift, 39, 291–300.
 */
export function ajustarHerschelBulkley(pontos: PontoReologico[]): ParamsHerschelBulkley {
  _validar(
    pontos.length >= 4,
    `Mínimo 4 pontos para Herschel-Bulkley (recebido: ${pontos.length})`
  );

  // Ordenar por γ̇
  const sorted = [...pontos].sort((a, b) => a.gamma_dot_1s - b.gamma_dot_1s);
  const tauMin = Math.min(...sorted.map((p) => p.tau_Pa));

  // Busca iterativa de τ₀: de 0 até 0.95 × tauMin, 20 candidatos
  let bestR2 = -Infinity;
  let bestResult: ParamsHerschelBulkley = {
    tau0_Pa: 0, K_Pasn: 0, n: 1, r2: 0, nPontos: pontos.length,
  };

  const nCandidatos = 20;
  for (let i = 0; i <= nCandidatos; i++) {
    const tau0Cand = (tauMin * 0.95 * i) / nCandidatos;

    const logPontos: { x: number; y: number }[] = [];
    let valido = true;
    for (const p of sorted) {
      const diff = p.tau_Pa - tau0Cand;
      if (diff <= 0 || p.gamma_dot_1s <= 0) { valido = false; break; }
      logPontos.push({ x: Math.log(p.gamma_dot_1s), y: Math.log(diff) });
    }
    if (!valido || logPontos.length < 3) continue;

    const reg = _regressaoLinear(logPontos);
    if (reg.r2 > bestR2) {
      bestR2 = reg.r2;
      bestResult = {
        tau0_Pa: _ar(tau0Cand, 2),
        K_Pasn: _ar(Math.exp(reg.a), 4),
        n: _ar(reg.b, 4),
        r2: _ar(reg.r2),
        nPontos: pontos.length,
      };
    }
  }

  return bestResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRELAÇÕES EMPÍRICAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estima Slump a partir de τ₀ — Eq. (7)
 * Válido para CCV (τ₀ entre 50–1100 Pa).
 *
 * Ref: Roussel, N. (2006). Cem. Concr. Res. 36(10), 1797–1806.
 */
export function estimarSlump(tau0_Pa: number): number | null {
  if (tau0_Pa < 50 || tau0_Pa > 1100) return null;
  return _ar(Math.max(0, 300 - 0.27 * tau0_Pa), 0);
}

/**
 * Estima espalhamento (flow) a partir de τ₀ — Eq. (8)
 * Válido para SCC (τ₀ < 300 Pa).
 *
 * @param tau0_Pa   Tensão de escoamento — Pa
 * @param rho_kgm3  Densidade — kg/m³ (default: 2400)
 * @param V_m3      Volume do cone — m³ (default: cone de Abrams = 0.0055)
 * @returns Diâmetro de espalhamento — mm
 *
 * Ref: Roussel, N. & Coussot, P. (2005). J. Rheol. 49(3), 705–718.
 */
export function estimarFlow(
  tau0_Pa: number,
  rho_kgm3 = RHO_CONCRETO_KGM3,
  V_m3 = V_CONE_ABRAMS_M3,
): number | null {
  if (tau0_Pa <= 0 || tau0_Pa > 300) return null;
  const D_m = Math.sqrt((2 * rho_kgm3 * G_MS2 * V_m3) / (3 * tau0_Pa));
  return _ar(D_m * 1000, 0);
}

/**
 * Estima T500 a partir de μ_p — Eq. (9)
 * Válido para SCC (μ_p entre 10–80 Pa·s).
 *
 * Ref: Wallevik, O.H. (2006). Nordic Concrete Research, 34(2).
 */
export function estimarT500(mu_p_Pas: number): number | null {
  if (mu_p_Pas < 10 || mu_p_Pas > 80) return null;
  return _ar(0.026 * mu_p_Pas + 0.3, 1);
}

/**
 * Estima tempo Cone de Marsh a partir de μ_p — Eq. (10)
 * Válido para pastas e argamassas (μ_p entre 0.5–30 Pa·s).
 *
 * Ref: de Larrard, F. (1998). Structures granulaires et formulation des bétons.
 */
export function estimarMarsh(mu_p_Pas: number): number | null {
  if (mu_p_Pas < 0.5 || mu_p_Pas > 30) return null;
  return _ar(0.58 * mu_p_Pas + 25, 1);
}

/**
 * Calcula todas as correlações empíricas de uma vez.
 */
export function calcularCorrelacoes(
  tau0_Pa: number,
  mu_p_Pas: number,
  rho_kgm3 = RHO_CONCRETO_KGM3,
): CorrelacoesEmpiricas {
  return {
    slump_mm: estimarSlump(tau0_Pa),
    flow_mm: estimarFlow(tau0_Pa, rho_kgm3),
    t500_s: estimarT500(mu_p_Pas),
    marsh_s: estimarMarsh(mu_p_Pas),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICAÇÃO REOLÓGICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifica o concreto com base em τ₀ e opcionalmente n (HB).
 */
export function classificar(tau0_Pa: number, n_hb?: number): ClasseReologica {
  if (n_hb !== undefined && n_hb < 0.8 && tau0_Pa < 30) return "UHPC";
  for (const [classe, faixa] of Object.entries(FAIXAS_TAU0) as [ClasseReologica, { min: number; max: number }][]) {
    if (tau0_Pa >= faixa.min && tau0_Pa < faixa.max) return classe;
  }
  return "CCV";
}

// ─────────────────────────────────────────────────────────────────────────────
// EVOLUÇÃO TEMPORAL — Análise de perda de trabalhabilidade
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa série temporal de amperagem → evolução τ(t), η_ap(t).
 * Também ajusta regressão linear para quantificar taxa de perda.
 *
 * @param leituras  Array de {tempo_s, amperagem_A}
 * @param geo       Configuração geométrica
 * @returns AnalisePerda completa
 */
export function analisarPerdaTrabalhabilidade(
  leituras: LeituraAmperagem[],
  geo: ConfigGeometria,
): AnalisePerda {
  if (leituras.length < 3) {
    throw new RheoCoreLeituraInsuficienteError(
      `Mínimo 3 leituras para análise de perda (recebido: ${leituras.length})`
    );
  }

  const gammaDot = calcularTaxaCisalhamento(geo.rpm, geo.raio_int_m, geo.raio_ext_m);

  const pontos: PontoEvolucaoTemporal[] = leituras.map((l) => {
    const torque = converterAmperagemTorque(l.amperagem_A, geo.k_motor_NmA);
    const tau = calcularTensaoCisalhamento(torque, geo.raio_int_m, geo.altura_m);
    const eta_ap = gammaDot > 0 ? _ar(tau / gammaDot, 4) : 0;
    return {
      tempo_s: l.tempo_s,
      tempo_min: _ar(l.tempo_s / 60, 2),
      torque_Nm: torque,
      tau_Pa: tau,
      eta_ap_Pas: eta_ap,
    };
  });

  // Regressão linear τ(t_min)
  const regPontos = pontos.map((p) => ({ x: p.tempo_min, y: p.tau_Pa }));
  const reg = _regressaoLinear(regPontos);

  const tauInicial = pontos[0].tau_Pa;
  const tauFinal = pontos[pontos.length - 1].tau_Pa;
  const variacao = tauInicial > 0 ? _ar(((tauFinal - tauInicial) / tauInicial) * 100, 1) : 0;

  // Tempo para τ dobrar: τ_ini + taxa × t = 2 × τ_ini → t = τ_ini / taxa
  let tempoDobraTau: number | null = null;
  if (reg.b > 0) {
    tempoDobraTau = _ar(tauInicial / reg.b, 1);
  }

  return {
    pontos,
    taxaCrescimento_PaMin: _ar(reg.b, 2),
    tempoDobraTau_min: tempoDobraTau,
    tau_inicial_Pa: _ar(tauInicial, 2),
    tau_final_Pa: _ar(tauFinal, 2),
    variacaoRelativa_pct: variacao,
    r2: _ar(reg.r2),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTIMATIVA BINGHAM SINGLE-SPEED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quando temos apenas 1 velocidade (caso do NEXUS), estimamos τ₀ e μ_p
 * a partir da primeira leitura (t≈0) assumindo:
 *   - τ_medido = τ₀ + μ_p × γ̇
 *   - Partição empírica: τ₀ ≈ 0.65 × τ_medido, μ_p ≈ 0.35 × τ / γ̇
 *
 * Esta é uma estimativa grosseira — para valores precisos, usar pontosMultiVel.
 *
 * Ref: Wallevik, O.H. (2006) — observações empíricas para CCV.
 */
function _estimarBinghamSingleSpeed(
  tau_Pa: number,
  gammaDot: number,
): ParamsBingham {
  const tau0 = 0.65 * tau_Pa;
  const mu_p = gammaDot > 0 ? (0.35 * tau_Pa) / gammaDot : 0;
  return {
    tau0_Pa: _ar(Math.max(0, tau0), 2),
    mu_p_Pas: _ar(Math.max(0, mu_p), 4),
    r2: 0, // sem ajuste real
    nPontos: 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa análise reológica completa.
 *
 * Fluxo:
 * 1. Mescla geometria com defaults
 * 2. Converte leituras → evolução τ(t) + η_ap(t)
 * 3. Analisa perda de trabalhabilidade (regressão linear)
 * 4. Ajusta Bingham (multi-vel ou single-speed estimation)
 * 5. Ajusta Herschel-Bulkley (se ≥ 4 pontos multi-vel)
 * 6. Calcula correlações empíricas (Slump, Flow, T500, Marsh)
 * 7. Classifica o concreto
 *
 * @param entrada EntradaRheoCore
 * @returns ResultadoRheoCore
 */
export function executarRheoCore(entrada: EntradaRheoCore): ResultadoRheoCore {
  const { leituras, pontosMultiVel, rho_kgm3 = RHO_CONCRETO_KGM3 } = entrada;

  if (leituras.length < 3) {
    throw new RheoCoreLeituraInsuficienteError(
      `Mínimo 3 leituras (recebido: ${leituras.length})`
    );
  }

  // 1. Geometria
  const geo: ConfigGeometria = { ...GEOMETRIA_DEFAULT, ...entrada.geometria };

  // 2–3. Evolução temporal + perda de trabalhabilidade
  const perda = analisarPerdaTrabalhabilidade(leituras, geo);

  // 4. Bingham
  let bingham: ParamsBingham;
  if (pontosMultiVel && pontosMultiVel.length >= 3) {
    bingham = ajustarBingham(pontosMultiVel);
  } else {
    // Estimativa single-speed usando primeiro ponto (t ≈ 0)
    const gammaDot = calcularTaxaCisalhamento(geo.rpm, geo.raio_int_m, geo.raio_ext_m);
    bingham = _estimarBinghamSingleSpeed(perda.tau_inicial_Pa, gammaDot);
  }

  // 5. Herschel-Bulkley (apenas se multi-vel ≥ 4)
  let herschelBulkley: ParamsHerschelBulkley | null = null;
  if (pontosMultiVel && pontosMultiVel.length >= 4) {
    herschelBulkley = ajustarHerschelBulkley(pontosMultiVel);
  }

  // 6. Correlações
  const correlacoes = calcularCorrelacoes(bingham.tau0_Pa, bingham.mu_p_Pas, rho_kgm3);

  // 7. Classificação
  const classe = classificar(bingham.tau0_Pa, herschelBulkley?.n);

  return {
    evolucao: perda.pontos,
    perda,
    bingham,
    herschelBulkley,
    correlacoes,
    classe,
    geometria: geo,
  };
}
