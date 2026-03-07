/**
 * @file lib/microengine.ts
 * @description MICROENGINE — Motor de Microestrutura e Durabilidade do Concreto
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MODELO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Módulo que modela a microestrutura da pasta de cimento e prevê
 * propriedades de transporte (difusão, permeabilidade) e durabilidade
 * (frente de carbonatação, ingresso de cloretos, vida útil da armadura).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODELO DE POWERS (1946/1948) — Composição volumétrica da pasta
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Volumes por unidade de pasta (V_pasta = V_cimento + V_agua):
 *
 *   V_cimento = 1 / (1 + ρ_c × (a/c))                                … (1)
 *   V_agua    = ρ_c × (a/c) / (1 + ρ_c × (a/c))                     … (2)
 *
 * Na hidratação (grau α):
 *   V_gel      = 0.68 × α × V_cimento × ρ_c / ρ_w                   … (3)
 *   V_naoHid   = (1 − α) × V_cimento                                 … (4)
 *   V_capilares = V_pasta − V_gel − V_naoHid − V_quimRetracaoQuim    … (5)
 *
 * Gel-space ratio (X):
 *   X = V_gel / (V_gel + V_capilares)                                  … (6)
 *
 * Ref: Powers, T.C. (1946). J. Am. Concr. Inst. 43(9), 933–969.
 *      Powers, T.C. & Brownyard, T.L. (1948). ACI Proceedings 43.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * RESISTÊNCIA via GEL-SPACE RATIO — Powers (1958)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   fc = A × X^n                                                       … (7)
 *
 * Onde:
 *   A = resistência intrínseca do gel — MPa (≈ 230 MPa para Portland)
 *   n = expoente (≈ 2.6–3.0, típico 2.85)
 *   X = gel-space ratio — adimensional
 *
 * Ref: Powers, T.C. (1958). J. PCA R&D Lab. 1(1), 47–73.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ITZ — Zona de Transição Interfacial
 * ───────────────────────────────────────────────────────────────────────────
 *
 * A ITZ é a região de 10–50 μm ao redor dos agregados com:
 *   - Maior porosidade (fator ITZ_POROSITY_FACTOR ≈ 2–3× pasta bulk)
 *   - Menor gel-space ratio
 *   - Orientação preferencial de CH (portlandita)
 *
 *   ε_ITZ = ε_bulk × f_ITZ                                            … (8)
 *   D_ITZ = D_bulk × f_ITZ^m                                          … (9)
 *
 * Onde:
 *   f_ITZ = fator de porosidade da ITZ (2.0–3.0)
 *   m     = expoente de percolação (≈ 1.5)
 *
 * Ref: Scrivener, K.L., Crumbie, A.K. & Laugesen, P. (2004). Cem. Concr. Res. 34(9).
 *      Ollivier, J.P., Maso, J.C. & Bourdette, B. (1995). Adv. Cem. Based Mater. 2(1).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DIFUSÃO DE CLORETOS — 2ª Lei de Fick
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   C(x,t) = Cs × [1 − erf(x / (2 × √(D_ap × t)))]                 … (10)
 *
 * Onde:
 *   C(x,t) = concentração de cloretos na profundidade x e tempo t — % massa cimento
 *   Cs     = concentração superficial — % massa cimento
 *   D_ap   = coeficiente de difusão aparente — m²/s
 *   x      = profundidade — m
 *   t      = tempo — s
 *
 * Ref: Crank, J. (1975). The Mathematics of Diffusion. Oxford.
 *      NT BUILD 492 (1999) — Nordtest Method.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COEFICIENTE DE DIFUSÃO — Modelo de Xi et al. (1999)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   D_28 = D_ref × (a/c)^p                                            … (11)
 *
 * Decaimento temporal (Page et al., 1981):
 *   D(t) = D_28 × (t_ref / t)^m                                       … (12)
 *
 * Onde:
 *   D_ref = coeficiente de referência — m²/s
 *   p     = expoente a/c (≈ 4.5)
 *   m     = expoente de envelhecimento (0.2–0.6)
 *   t_ref = 28 dias (em segundos)
 *
 * Ref: Xi, Y. et al. (1999). Cem. Concr. Res. 29(7), 1055–1061.
 *      Page, C.L. et al. (1981). Cem. Concr. Res. 11(3), 395–406.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CARBONATAÇÃO — Modelo raiz quadrada (Tuutti, 1982)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   x_c(t) = K_c × √t                                                 … (13)
 *
 * Onde:
 *   x_c  = profundidade de carbonatação — mm
 *   K_c  = coeficiente de carbonatação — mm/√ano
 *   t    = tempo — anos
 *
 *   K_c depende de: a/c, tipo cimento, UR, [CO₂], cobrimento
 *
 * Ref: Tuutti, K. (1982). Corrosion of Steel in Concrete. CBI Report 4:82.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POROSIDADE CAPILAR — Powers simplificado
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   ε_cap = (a/c − 0.36 × α) / (a/c + 0.32)                         … (14)
 *
 * Ref: Powers, T.C. (1958); adaptação Hansen (1986).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES FÍSICAS
// ─────────────────────────────────────────────────────────────────────────────

/** Densidade do cimento Portland — kg/m³ */
export const RHO_CIMENTO_KGM3 = 3150;

/** Densidade da água — kg/m³ */
export const RHO_AGUA_KGM3 = 1000;

/** Resistência intrínseca do gel — MPa (Powers, 1958) */
export const A_GEL_MPA = 230;

/** Expoente gel-space ratio — adimensional (Powers, 1958) */
export const N_GEL_SPACE = 2.85;

/** Fator de porosidade ITZ — adimensional (Scrivener 2004) */
export const ITZ_POROSITY_FACTOR = 2.5;

/** Espessura típica da ITZ — μm */
export const ITZ_ESPESSURA_UM = 30;

/** Expoente de percolação ITZ */
export const ITZ_PERCOLACAO_M = 1.5;

/** Coeficiente de difusão de referência (cloretos) — m²/s (a/c = 0.50, 28d) */
export const D_REF_M2S = 5.0e-12;

/** Expoente a/c para difusão — adimensional */
export const D_AC_EXPOENTE = 4.5;

/** Tempo de referência para difusão — s (28 dias) */
export const T_REF_DIFUSAO_S = 28 * 24 * 3600;

/** Concentração superficial de cloretos default — % massa cimento */
export const CS_CLORETOS_DEFAULT = 0.6;

/** Concentração crítica de cloretos para despassivação — % massa cimento */
export const C_CRIT_CLORETOS = 0.4;

/** Segundos em um ano */
export const SEGUNDOS_ANO = 365.25 * 24 * 3600;

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class MicroEngineParametroInvalidoError extends Error {
  constructor(msg: string) {
    super(`[MicroEngine] ${msg}`);
    this.name = "MicroEngineParametroInvalidoError";
  }
}

export class MicroEngineForaFaixaError extends Error {
  constructor(msg: string) {
    super(`[MicroEngine] ${msg}`);
    this.name = "MicroEngineForaFaixaError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function _validar(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new MicroEngineParametroInvalidoError(msg);
}

function _ar(v: number, n = 4): number {
  const f = 10 ** n;
  return Math.round(v * f) / f;
}

/**
 * Função erro complementar (erfc) — Abramowitz & Stegun (1964), eq. 7.1.26
 * Precisão: |ε| < 1.5 × 10⁻⁷
 */
function _erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t * (0.254829592 +
    t * (-0.284496736 +
    t * (1.421413741 +
    t * (-1.453152027 +
    t * 1.061405429))));
  const result = poly * Math.exp(-x * x);
  return x >= 0 ? result : 2 - result;
}

/** Função erro (erf) */
function _erf(x: number): number {
  return 1 - _erfc(x);
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Composição volumétrica da pasta (Powers) */
export interface ComposicaoPasta {
  /** Fração volumétrica de cimento não-hidratado */
  V_naoHid: number;
  /** Fração volumétrica de gel (C-S-H + produtos) */
  V_gel: number;
  /** Fração volumétrica de poros capilares */
  V_capilares: number;
  /** Gel-space ratio (X) */
  gelSpaceRatio: number;
  /** Porosidade capilar total */
  porosidadeCapilar: number;
}

/** Propriedades da ITZ */
export interface PropriedadesITZ {
  /** Espessura da ITZ — μm */
  espessura_um: number;
  /** Porosidade da ITZ */
  porosidade_ITZ: number;
  /** Fator de aumento de difusividade pela ITZ */
  fatorDifusao: number;
  /** Volume relativo de ITZ na pasta (depende de V_agregado e d_max) */
  volumeRelativo: number;
}

/** Resultado da análise de difusão de cloretos */
export interface ResultadoDifusaoCloretos {
  /** Coeficiente de difusão aos 28 dias — m²/s */
  D28_m2s: number;
  /** Coeficiente de difusão na idade t — m²/s */
  Dt_m2s: number;
  /** Profundidade da frente de cloretos (C = C_crit) na idade t — mm */
  profundidadeFrente_mm: number;
  /** Tempo para cloretos atingirem o cobrimento — anos */
  tempoDespassivacao_anos: number | null;
  /** Perfil C(x) em profundidades discretas */
  perfil: { x_mm: number; C_pct: number }[];
}

/** Resultado da análise de carbonatação */
export interface ResultadoCarbonatacao {
  /** Coeficiente de carbonatação K_c — mm/√ano */
  Kc_mmRaizAno: number;
  /** Profundidade de carbonatação na idade t — mm */
  profundidade_mm: number;
  /** Tempo para carbonatação atingir armadura — anos */
  tempoDespassivacao_anos: number | null;
  /** Evolução x_c(t) em idades discretas */
  evolucao: { idade_anos: number; xc_mm: number }[];
}

/** Parâmetros de exposição ambiental */
export interface ParamsExposicao {
  /** Classe de agressividade (NBR 6118) — I, II, III, IV */
  classeAgressividade: "I" | "II" | "III" | "IV";
  /** Umidade relativa — % (default: 65%) */
  UR_pct?: number;
  /** Concentração superficial de cloretos — % massa cimento (default: 0.6) */
  Cs_pct?: number;
  /** Concentração de CO₂ — % (default: 0.04) */
  CO2_pct?: number;
  /** Cobrimento nominal — mm */
  cobrimento_mm: number;
}

/** Entrada completa do MicroEngine */
export interface EntradaMicroEngine {
  /** Relação água/cimento */
  relacaoAc: number;
  /** Grau de hidratação α (0–1). Se omitido, estima por idade */
  alpha?: number;
  /** Idade do concreto — dias (para estimar α e D(t)) */
  idade_dias?: number;
  /** Tipo de cimento para estimativa de parâmetros */
  tipoCimento?: string;
  /** Fração volumétrica de agregado no concreto (0.60–0.75, default: 0.70) */
  V_agregado?: number;
  /** Diâmetro máximo do agregado — mm (default: 19) */
  dmax_mm?: number;
  /** Expoente de envelhecimento m para difusão (default por tipo de cimento) */
  m_envelhecimento?: number;
  /** Parâmetros de exposição ambiental */
  exposicao?: ParamsExposicao;
  /** Vida útil de projeto — anos (default: 50) */
  vidaUtilProjeto_anos?: number;
}

/** Resultado completo do MicroEngine */
export interface ResultadoMicroEngine {
  /** Composição volumétrica da pasta (Powers) */
  composicao: ComposicaoPasta;
  /** Resistência estimada pelo gel-space ratio — MPa */
  fcGelSpace_MPa: number;
  /** Propriedades da ITZ */
  itz: PropriedadesITZ;
  /** Difusão de cloretos (se exposicao fornecida) */
  cloretos: ResultadoDifusaoCloretos | null;
  /** Carbonatação (se exposicao fornecida) */
  carbonatacao: ResultadoCarbonatacao | null;
  /** Parâmetros de entrada utilizados */
  params: {
    relacaoAc: number;
    alpha: number;
    idade_dias: number;
    m_envelhecimento: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS POR TIPO DE CIMENTO
// ─────────────────────────────────────────────────────────────────────────────

/** Expoente de envelhecimento m por tipo de cimento (Page 1981, Life-365) */
export const M_ENVELHECIMENTO: Record<string, number> = {
  CP_V_ARI: 0.26,
  CP_II_F: 0.30,
  CP_II_E: 0.40,
  CP_III: 0.55,
  CP_IV: 0.50,
  LC3: 0.45,
};

/** Coeficiente de carbonatação K_c por classe de agressividade (mm/√ano)
 *  Valores típicos para a/c = 0.50, ajustados por (a/c / 0.50)^2.5
 *  Ref: EN 16757, RILEM TC 230-PSC
 */
export const KC_BASE: Record<string, number> = {
  I: 2.5,    // Rural / interno seco
  II: 4.0,   // Urbano
  III: 5.5,  // Marítimo / industrial
  IV: 7.0,   // Spray marinho / químico
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSIÇÃO VOLUMÉTRICA — POWERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula composição volumétrica da pasta pelo modelo de Powers.
 *
 * @param ac    Relação água/cimento
 * @param alpha Grau de hidratação (0–1)
 * @returns ComposicaoPasta
 *
 * Ref: Powers & Brownyard (1948); Hansen (1986).
 */
export function calcularComposicaoPasta(ac: number, alpha: number): ComposicaoPasta {
  _validar(ac >= 0.20 && ac <= 0.80, `a/c fora da faixa: ${ac} (0.20–0.80)`);
  _validar(alpha >= 0 && alpha <= 1, `α fora da faixa: ${alpha} (0–1)`);

  // Porosidade capilar — Powers simplificado (Eq. 14)
  const eps_cap = Math.max(0, (ac - 0.36 * alpha) / (ac + 0.32));

  // Volumes relativos na pasta (normalizado: V_cim + V_agua = 1)
  const rho_ratio = RHO_CIMENTO_KGM3 / RHO_AGUA_KGM3; // 3.15
  const V_cim = 1 / (1 + rho_ratio * ac);
  const V_agua_ini = 1 - V_cim;

  // Cimento consumido → gel
  const V_naoHid = (1 - alpha) * V_cim;

  // Volume de gel ≈ 2.06× volume de cimento consumido (gel + água de gel)
  // Simplificação: V_gel_solido + V_gel_poros = 0.68 × α × V_cim × ρ_c/ρ_w
  const V_gel = 0.68 * alpha * V_cim * rho_ratio;

  // Retração química: ~6.4 mL por 100g cimento hidratado
  const V_retrQuim = 0.064 * alpha * V_cim * rho_ratio;

  // Capilares = total - gel - não-hidratado - retração
  const V_capilares = Math.max(0, 1 - V_naoHid - V_gel + V_retrQuim);

  // Gel-space ratio
  const gelSpaceRatio = V_gel > 0 ? V_gel / (V_gel + V_capilares) : 0;

  return {
    V_naoHid: _ar(V_naoHid),
    V_gel: _ar(V_gel),
    V_capilares: _ar(V_capilares, 4),
    gelSpaceRatio: _ar(gelSpaceRatio),
    porosidadeCapilar: _ar(eps_cap),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESISTÊNCIA via GEL-SPACE RATIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estima resistência à compressão pelo gel-space ratio — Eq. (7)
 *
 * @param gelSpaceRatio X — adimensional (0–1)
 * @param A_MPa  Resistência intrínseca do gel — MPa (default: 230)
 * @param n      Expoente (default: 2.85)
 * @returns fc — MPa
 *
 * Ref: Powers, T.C. (1958). J. PCA R&D Lab. 1(1), 47–73.
 */
export function calcularFcGelSpace(
  gelSpaceRatio: number,
  A_MPa = A_GEL_MPA,
  n = N_GEL_SPACE,
): number {
  _validar(gelSpaceRatio >= 0 && gelSpaceRatio <= 1,
    `Gel-space ratio fora da faixa: ${gelSpaceRatio}`);
  return _ar(A_MPa * Math.pow(gelSpaceRatio, n), 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTIMATIVA DO GRAU DE HIDRATAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estima α pela idade usando modelo FHP simplificado.
 * α(t) = α_max × [1 − exp(−(t/τ)^β)]
 * Com defaults conservadores: τ ≈ 15h, β ≈ 0.95, α_max por a/c (Powers/Bentz)
 *
 * @param idade_dias Idade — dias
 * @param ac         Relação a/c
 * @returns α estimado (0–1)
 */
export function estimarAlpha(idade_dias: number, ac: number): number {
  _validar(idade_dias > 0, `Idade inválida: ${idade_dias} dias`);
  const alpha_max = ac >= 0.28 ? Math.min(1, ac / 0.44) : 0.44 * ac / (0.44 * ac + 0.19);
  const tau_h = 15;
  const beta = 0.95;
  const t_h = idade_dias * 24;
  const alpha = alpha_max * (1 - Math.exp(-Math.pow(t_h / tau_h, beta)));
  return _ar(Math.min(alpha, alpha_max));
}

// ─────────────────────────────────────────────────────────────────────────────
// ITZ — Zona de Transição Interfacial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula propriedades da ITZ.
 *
 * @param porosidadeBulk  Porosidade capilar da pasta bulk
 * @param V_agregado      Fração volumétrica de agregados no concreto
 * @param dmax_mm         Diâmetro máximo do agregado — mm
 * @returns PropriedadesITZ
 *
 * Ref: Scrivener et al. (2004); Ollivier et al. (1995).
 */
export function calcularITZ(
  porosidadeBulk: number,
  V_agregado: number,
  dmax_mm: number,
): PropriedadesITZ {
  _validar(V_agregado > 0 && V_agregado < 1, `V_agregado fora da faixa: ${V_agregado}`);
  _validar(dmax_mm > 0, `dmax inválido: ${dmax_mm} mm`);

  const eps_itz = Math.min(1, porosidadeBulk * ITZ_POROSITY_FACTOR);
  const fatorDif = Math.pow(ITZ_POROSITY_FACTOR, ITZ_PERCOLACAO_M);

  // Volume relativo de ITZ: modelo simplificado esférico
  // V_ITZ/V_agregado ≈ 3 × espessura_ITZ / (dmax/2) para partículas esféricas
  const volRel = _ar(3 * (ITZ_ESPESSURA_UM / 1000) / (dmax_mm / 2) * V_agregado, 4);

  return {
    espessura_um: ITZ_ESPESSURA_UM,
    porosidade_ITZ: _ar(eps_itz),
    fatorDifusao: _ar(fatorDif, 2),
    volumeRelativo: Math.min(volRel, 0.30), // capped
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFUSÃO DE CLORETOS — 2ª Lei de Fick
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula coeficiente de difusão D aos 28 dias — Eq. (11)
 *
 * @param ac  Relação a/c
 * @returns D_28 — m²/s
 */
export function calcularD28(ac: number): number {
  _validar(ac >= 0.20 && ac <= 0.80, `a/c fora da faixa: ${ac}`);
  return _ar(D_REF_M2S * Math.pow(ac / 0.50, D_AC_EXPOENTE), 15);
}

/**
 * Aplica decaimento temporal ao D — Eq. (12)
 *
 * @param D28     D aos 28 dias — m²/s
 * @param t_s     Tempo — s
 * @param m       Expoente de envelhecimento
 * @returns D(t) — m²/s
 */
export function calcularDt(D28: number, t_s: number, m: number): number {
  _validar(t_s > 0, `Tempo inválido: ${t_s} s`);
  return D28 * Math.pow(T_REF_DIFUSAO_S / t_s, m);
}

/**
 * Concentração de cloretos na profundidade x e tempo t — Eq. (10)
 *
 * @param x_m   Profundidade — m
 * @param t_s   Tempo — s
 * @param Dap   D aparente — m²/s
 * @param Cs    Concentração superficial — %
 * @returns C(x,t) — %
 */
export function concentracaoCloretos(
  x_m: number, t_s: number, Dap: number, Cs: number,
): number {
  if (t_s <= 0 || Dap <= 0) return 0;
  const z = x_m / (2 * Math.sqrt(Dap * t_s));
  return _ar(Cs * (1 - _erf(z)), 4);
}

/**
 * Tempo para cloretos atingirem concentração crítica no cobrimento.
 * Resolve Eq. (10) para t: C_crit = Cs × [1 − erf(x/(2√(D×t)))]
 * Busca numérica por bisseção.
 *
 * @param cob_m   Cobrimento — m
 * @param Cs      Concentração superficial — %
 * @param D28     D aos 28 dias — m²/s
 * @param m       Expoente de envelhecimento
 * @param Ccrit   Concentração crítica — %
 * @returns Tempo — anos (ou null se > 200 anos)
 */
export function tempoDespassivacaoCloretos(
  cob_m: number, Cs: number, D28: number, m: number, Ccrit = C_CRIT_CLORETOS,
): number | null {
  if (Cs <= Ccrit) return null; // nunca atinge

  // Bisseção: buscar t tal que C(cob, t) = Ccrit
  let tLow = 1; // 1 segundo
  let tHigh = 200 * SEGUNDOS_ANO; // 200 anos

  for (let iter = 0; iter < 100; iter++) {
    const tMid = (tLow + tHigh) / 2;
    const Dt = calcularDt(D28, tMid, m);
    const C = concentracaoCloretos(cob_m, tMid, Dt, Cs);

    if (Math.abs(C - Ccrit) < 0.001) {
      return _ar(tMid / SEGUNDOS_ANO, 1);
    }
    if (C > Ccrit) tHigh = tMid;
    else tLow = tMid;
  }

  const resultado = tHigh / SEGUNDOS_ANO;
  return resultado <= 200 ? _ar(resultado, 1) : null;
}

/**
 * Gera perfil completo de cloretos C(x) para uma idade.
 */
export function gerarPerfilCloretos(
  D28: number, m: number, t_anos: number, Cs: number,
  xMax_mm = 100, nPontos = 50,
): { x_mm: number; C_pct: number }[] {
  const t_s = t_anos * SEGUNDOS_ANO;
  const Dt = calcularDt(D28, t_s, m);
  const perfil: { x_mm: number; C_pct: number }[] = [];

  for (let i = 0; i <= nPontos; i++) {
    const x_mm = (xMax_mm * i) / nPontos;
    const C = concentracaoCloretos(x_mm / 1000, t_s, Dt, Cs);
    perfil.push({ x_mm: _ar(x_mm, 1), C_pct: _ar(C, 4) });
  }
  return perfil;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARBONATAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coeficiente de carbonatação K_c — Eq. (13)
 * Ajustado por a/c e classe de agressividade.
 *
 * @param ac     Relação a/c
 * @param classe Classe de agressividade (I–IV)
 * @returns K_c — mm/√ano
 */
export function calcularKcCarbonatacao(ac: number, classe: string): number {
  _validar(ac >= 0.20 && ac <= 0.80, `a/c fora da faixa: ${ac}`);
  const Kbase = KC_BASE[classe] ?? KC_BASE.II;
  // Ajuste por a/c: K ∝ (a/c)^2.5 relativo a 0.50
  return _ar(Kbase * Math.pow(ac / 0.50, 2.5), 2);
}

/**
 * Profundidade de carbonatação na idade t — Eq. (13)
 */
export function profundidadeCarbonatacao(Kc: number, t_anos: number): number {
  _validar(t_anos >= 0, `Idade inválida: ${t_anos}`);
  return _ar(Kc * Math.sqrt(t_anos), 1);
}

/**
 * Tempo para carbonatação atingir o cobrimento.
 * x_c = K_c × √t → t = (x_c / K_c)²
 */
export function tempoDespassivacaoCarbonatacao(
  Kc: number, cobrimento_mm: number,
): number | null {
  if (Kc <= 0) return null;
  const t = Math.pow(cobrimento_mm / Kc, 2);
  return t <= 200 ? _ar(t, 1) : null;
}

/**
 * Gera evolução x_c(t) para idades discretas.
 */
export function gerarEvolucaoCarbonatacao(
  Kc: number, tMax_anos = 100, nPontos = 50,
): { idade_anos: number; xc_mm: number }[] {
  const evolucao: { idade_anos: number; xc_mm: number }[] = [];
  for (let i = 0; i <= nPontos; i++) {
    const t = (tMax_anos * i) / nPontos;
    evolucao.push({
      idade_anos: _ar(t, 1),
      xc_mm: profundidadeCarbonatacao(Kc, t),
    });
  }
  return evolucao;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa análise microestrutural + durabilidade completa.
 *
 * Fluxo:
 * 1. Estima α (se não fornecido) pela idade
 * 2. Calcula composição volumétrica (Powers)
 * 3. Estima fc pelo gel-space ratio
 * 4. Calcula propriedades da ITZ
 * 5. Análise de cloretos (Fick 2ª Lei) — se exposicao fornecida
 * 6. Análise de carbonatação (Tuutti) — se exposicao fornecida
 *
 * @param entrada EntradaMicroEngine
 * @returns ResultadoMicroEngine
 */
export function executarMicroEngine(entrada: EntradaMicroEngine): ResultadoMicroEngine {
  const {
    relacaoAc,
    tipoCimento = "CP_V_ARI",
    V_agregado = 0.70,
    dmax_mm = 19,
    idade_dias = 28,
    vidaUtilProjeto_anos = 50,
  } = entrada;

  _validar(relacaoAc >= 0.20 && relacaoAc <= 0.80,
    `a/c fora da faixa: ${relacaoAc} (0.20–0.80)`);

  // 1. Grau de hidratação
  const alpha = entrada.alpha ?? estimarAlpha(idade_dias, relacaoAc);

  // 2. Composição volumétrica
  const composicao = calcularComposicaoPasta(relacaoAc, alpha);

  // 3. Resistência gel-space
  const fcGelSpace = calcularFcGelSpace(composicao.gelSpaceRatio);

  // 4. ITZ
  const itz = calcularITZ(composicao.porosidadeCapilar, V_agregado, dmax_mm);

  // 5. Expoente de envelhecimento
  const m = entrada.m_envelhecimento ?? M_ENVELHECIMENTO[tipoCimento] ?? 0.30;

  // 6. Cloretos
  let cloretos: ResultadoDifusaoCloretos | null = null;
  if (entrada.exposicao) {
    const { cobrimento_mm, Cs_pct = CS_CLORETOS_DEFAULT } = entrada.exposicao;
    const D28 = calcularD28(relacaoAc);
    const t_s = vidaUtilProjeto_anos * SEGUNDOS_ANO;
    const Dt = calcularDt(D28, t_s, m);

    const profundidade_m = (() => {
      // Busca x onde C = C_crit no tempo vidaUtil
      let xLow = 0, xHigh = 0.200; // 0–200 mm
      for (let i = 0; i < 60; i++) {
        const xMid = (xLow + xHigh) / 2;
        const C = concentracaoCloretos(xMid, t_s, Dt, Cs_pct);
        if (C > C_CRIT_CLORETOS) xLow = xMid;
        else xHigh = xMid;
      }
      return (xLow + xHigh) / 2;
    })();

    const tempoDesp = tempoDespassivacaoCloretos(
      cobrimento_mm / 1000, Cs_pct, D28, m,
    );

    const perfil = gerarPerfilCloretos(D28, m, vidaUtilProjeto_anos, Cs_pct);

    cloretos = {
      D28_m2s: D28,
      Dt_m2s: Dt,
      profundidadeFrente_mm: _ar(profundidade_m * 1000, 1),
      tempoDespassivacao_anos: tempoDesp,
      perfil,
    };
  }

  // 7. Carbonatação
  let carbonatacao: ResultadoCarbonatacao | null = null;
  if (entrada.exposicao) {
    const { cobrimento_mm, classeAgressividade } = entrada.exposicao;
    const Kc = calcularKcCarbonatacao(relacaoAc, classeAgressividade);
    const xc = profundidadeCarbonatacao(Kc, vidaUtilProjeto_anos);
    const tempoDesp = tempoDespassivacaoCarbonatacao(Kc, cobrimento_mm);
    const evolucao = gerarEvolucaoCarbonatacao(Kc, Math.max(vidaUtilProjeto_anos, 50));

    carbonatacao = {
      Kc_mmRaizAno: Kc,
      profundidade_mm: xc,
      tempoDespassivacao_anos: tempoDesp,
      evolucao,
    };
  }

  return {
    composicao,
    fcGelSpace_MPa: fcGelSpace,
    itz,
    cloretos,
    carbonatacao,
    params: {
      relacaoAc,
      alpha: _ar(alpha),
      idade_dias,
      m_envelhecimento: m,
    },
  };
}
