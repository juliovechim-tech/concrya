/**
 * @file lib/lifeengine.ts
 * @description LIFEENGINE — Motor de Vida Útil, Análise Probabilística e Custo do Ciclo de Vida
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MODELO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Previsão probabilística de vida útil de estruturas de concreto armado,
 * com simulação Monte Carlo dos mecanismos de degradação e análise
 * econômica VPL (Valor Presente Líquido) do custo do ciclo de vida.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODELO DE TUUTTI (1982) — Duas Fases de Degradação
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   t_vida = t_iniciação + t_propagação                                … (1)
 *
 *   t_iniciação: tempo até despassivação da armadura
 *     - Cloretos: Fick 2ª Lei → C(cob, t) = C_crit
 *     - Carbonatação: x_c(t) = cob → t = (cob / K_c)²
 *
 *   t_propagação: tempo desde despassivação até reparo necessário
 *     - Corrosão ativa: perda de seção → critério de aceitação
 *     - Típico: 5–15 anos (depende de exposição e cobrimento)
 *
 * Ref: Tuutti, K. (1982). Corrosion of Steel in Concrete. CBI Report 4:82.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SIMULAÇÃO MONTE CARLO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Variáveis aleatórias (distribuição normal ou log-normal):
 *   - D_28: coeficiente de difusão (CoV = 0.20–0.30)
 *   - C_s:  concentração superficial (CoV = 0.15–0.25)
 *   - C_crit: concentração crítica (CoV = 0.20)
 *   - cob: cobrimento real (CoV = 0.10–0.15, bias -2mm)
 *   - K_c: coeficiente de carbonatação (CoV = 0.20)
 *   - m:   expoente de envelhecimento (CoV = 0.10)
 *
 * Para N simulações (N ≥ 1000):
 *   P_f(t) = N_falha(t) / N                                           … (2)
 *
 * Ref: Duracrete (2000). Final Technical Report. EU Brite-EuRam III.
 *      fib Bulletin 34 (2006). Model Code for Service Life Design.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÍNDICE DE CONFIABILIDADE β
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   β(t) = Φ⁻¹(1 − P_f(t))                                           … (3)
 *
 *   β_alvo = 1.5 (fib MC2010, RC2 — consequência moderada)
 *   → P_f_alvo ≈ 6.7% em 50 anos
 *
 * ───────────────────────────────────────────────────────────────────────────
 * VPL — VALOR PRESENTE LÍQUIDO DO CICLO DE VIDA
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   VPL = C_0 + Σ C_i / (1 + r)^t_i                                  … (4)
 *
 * Onde:
 *   C_0   = custo inicial de construção — R$/m²
 *   C_i   = custo de intervenção i — R$/m²
 *   r     = taxa de desconto real — % a.a. (default: 3%)
 *   t_i   = idade da intervenção i — anos
 *
 * Cenários de intervenção:
 *   - Reparo superficial (carbonatação): R$ 150–300/m²
 *   - Reparo profundo (cloretos): R$ 400–800/m²
 *   - Reforço estrutural: R$ 800–2000/m²
 *   - Demolição + reconstrução: R$ 2000–5000/m²
 *
 * Ref: EN 15978:2011 | ASTM E917-17 | ISO 15686-5:2017
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** Índice de confiabilidade alvo — fib MC2010 RC2 */
export const BETA_ALVO = 1.5;

/** Segundos em um ano */
export const SEGUNDOS_ANO = 365.25 * 24 * 3600;

/** Tempo de referência para difusão — s (28 dias) */
export const T_REF_S = 28 * 24 * 3600;

/** Concentração crítica de cloretos default — % massa cimento */
export const C_CRIT_DEFAULT = 0.4;

/** Taxa de desconto real default — % a.a. */
export const TAXA_DESCONTO_DEFAULT = 0.03;

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class LifeEngineParametroInvalidoError extends Error {
  constructor(msg: string) {
    super(`[LifeEngine] ${msg}`);
    this.name = "LifeEngineParametroInvalidoError";
  }
}

export class LifeEngineSimulacaoError extends Error {
  constructor(msg: string) {
    super(`[LifeEngine] ${msg}`);
    this.name = "LifeEngineSimulacaoError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function _validar(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new LifeEngineParametroInvalidoError(msg);
}

function _ar(v: number, n = 4): number {
  const f = 10 ** n;
  return Math.round(v * f) / f;
}

/** erfc — Abramowitz & Stegun (1964) */
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

function _erf(x: number): number {
  return 1 - _erfc(x);
}

/**
 * Inversa da CDF normal padrão — aproximação Beasley-Springer-Moro
 * Precisão: |ε| < 1.5 × 10⁻⁹ para 10⁻⁷ < p < 1 − 10⁻⁷
 */
function _probit(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996, 3.754408661907416,
  ];

  const pLow = 0.02425;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pLow) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/**
 * Gerador de números pseudoaleatórios — Mulberry32 (determinístico com seed)
 */
function _mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Amostra de distribuição normal via Box-Muller */
function _normalSample(mean: number, std: number, rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(1e-15, u1))) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

/** Amostra de distribuição log-normal */
function _logNormalSample(mean: number, cov: number, rng: () => number): number {
  const sigma2 = Math.log(1 + cov * cov);
  const mu = Math.log(mean) - sigma2 / 2;
  const sigma = Math.sqrt(sigma2);
  return Math.exp(_normalSample(mu, sigma, rng));
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Variáveis estocásticas para simulação Monte Carlo */
export interface VariaveisEstocasticas {
  /** D_28 médio — m²/s */
  D28_mean: number;
  /** CoV de D_28 (default: 0.25) */
  D28_cov?: number;
  /** Cs médio — % massa cimento */
  Cs_mean: number;
  /** CoV de Cs (default: 0.20) */
  Cs_cov?: number;
  /** C_crit médio — % (default: 0.4) */
  Ccrit_mean?: number;
  /** CoV de C_crit (default: 0.20) */
  Ccrit_cov?: number;
  /** Cobrimento médio — mm */
  cob_mean_mm: number;
  /** CoV de cobrimento (default: 0.12) */
  cob_cov?: number;
  /** Bias do cobrimento — mm (negativo = menor que nominal, default: -2) */
  cob_bias_mm?: number;
  /** Expoente m médio */
  m_mean: number;
  /** CoV de m (default: 0.10) */
  m_cov?: number;
  /** K_c médio — mm/√ano (para carbonatação) */
  Kc_mean?: number;
  /** CoV de K_c (default: 0.20) */
  Kc_cov?: number;
}

/** Parâmetros da simulação Monte Carlo */
export interface ParamsMonteCarlo {
  /** Número de simulações (default: 5000) */
  N?: number;
  /** Seed do RNG (default: 42 — reprodutível) */
  seed?: number;
  /** Vida útil de projeto — anos (default: 50) */
  vidaProjeto_anos?: number;
  /** Tempo de propagação — anos (default: 10) */
  tPropagacao_anos?: number;
}

/** Resultado de uma simulação individual */
export interface ResultadoSimulacao {
  /** Tempo de iniciação (despassivação) — anos */
  tIniciacao_anos: number;
  /** Tempo total de vida — anos */
  tVida_anos: number;
  /** Mecanismo dominante: "cloretos" | "carbonatacao" */
  mecanismo: "cloretos" | "carbonatacao";
}

/** Ponto da curva de probabilidade de falha */
export interface PontoProbabilidade {
  /** Idade — anos */
  idade_anos: number;
  /** P_f acumulada (cloretos) */
  Pf_cloretos: number;
  /** P_f acumulada (carbonatação) */
  Pf_carbonatacao: number;
  /** P_f combinada (pior caso) */
  Pf_combinada: number;
  /** Índice β combinado */
  beta: number;
}

/** Intervenção de manutenção / reparo */
export interface Intervencao {
  /** Descrição */
  descricao: string;
  /** Idade da intervenção — anos */
  idade_anos: number;
  /** Custo unitário — R$/m² */
  custo_Rm2: number;
}

/** Cenário de custo do ciclo de vida */
export interface CenarioVPL {
  /** Nome do cenário */
  nome: string;
  /** Custo inicial — R$/m² */
  custoInicial_Rm2: number;
  /** Intervenções programadas */
  intervencoes: Intervencao[];
  /** Taxa de desconto — % a.a. */
  taxaDesconto: number;
  /** Vida útil de análise — anos */
  horizonte_anos: number;
}

/** Resultado do VPL */
export interface ResultadoVPL {
  /** Nome do cenário */
  nome: string;
  /** VPL total — R$/m² */
  vpl_Rm2: number;
  /** Custo inicial — R$/m² */
  custoInicial_Rm2: number;
  /** VP das intervenções — R$/m² */
  vpIntervencoes_Rm2: number;
  /** Detalhamento das intervenções */
  intervencoes: { descricao: string; idade_anos: number; custoNominal_Rm2: number; vpCusto_Rm2: number }[];
}

/** Resultado estatístico do Monte Carlo */
export interface EstatisticasMC {
  /** Média da vida útil — anos */
  media_anos: number;
  /** Desvio padrão — anos */
  desvio_anos: number;
  /** Percentil 5% — anos */
  p5_anos: number;
  /** Percentil 50% (mediana) — anos */
  p50_anos: number;
  /** Percentil 95% — anos */
  p95_anos: number;
  /** P_f na vida de projeto */
  Pf_projeto: number;
  /** β na vida de projeto */
  beta_projeto: number;
  /** Conforme β_alvo? */
  conforme: boolean;
}

/** Entrada completa do LifeEngine */
export interface EntradaLifeEngine {
  /** Variáveis estocásticas */
  variaveis: VariaveisEstocasticas;
  /** Parâmetros Monte Carlo */
  monteCarlo?: ParamsMonteCarlo;
  /** Cenários VPL (opcional) */
  cenariosVPL?: CenarioVPL[];
}

/** Resultado completo do LifeEngine */
export interface ResultadoLifeEngine {
  /** Estatísticas do Monte Carlo */
  estatisticas: EstatisticasMC;
  /** Curva P_f(t) */
  curvaPf: PontoProbabilidade[];
  /** Histograma de vida útil */
  histograma: { faixa: string; contagem: number; pct: number }[];
  /** Resultados VPL por cenário */
  vpl: ResultadoVPL[];
  /** Parâmetros utilizados */
  params: {
    N: number;
    seed: number;
    vidaProjeto_anos: number;
    tPropagacao_anos: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOS TÍPICOS DE INTERVENÇÃO — Defaults Brasil 2026
// ─────────────────────────────────────────────────────────────────────────────

export const CUSTOS_INTERVENCAO: Record<string, number> = {
  /** Reparo superficial (recomposição de cobrimento) — R$/m² */
  reparo_superficial: 250,
  /** Reparo profundo (extração + reconstituição) — R$/m² */
  reparo_profundo: 600,
  /** Reforço estrutural (CFRP / chapas) — R$/m² */
  reforco_estrutural: 1500,
  /** Demolição + reconstrução — R$/m² */
  demolicao: 3500,
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE DEGRADAÇÃO (determinísticas)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tempo de iniciação por cloretos — resolve Fick 2ª Lei por bisseção.
 *
 * @param cob_m  Cobrimento — m
 * @param D28    D aos 28 dias — m²/s
 * @param m      Expoente de envelhecimento
 * @param Cs     Concentração superficial — %
 * @param Ccrit  Concentração crítica — %
 * @returns t_iniciação — anos (ou Infinity se > 300 anos)
 */
export function tIniciacaoCloretos(
  cob_m: number, D28: number, m: number, Cs: number, Ccrit: number,
): number {
  if (Cs <= Ccrit || cob_m <= 0 || D28 <= 0) return Infinity;

  let tLow = 0.1 * SEGUNDOS_ANO;
  let tHigh = 300 * SEGUNDOS_ANO;

  for (let i = 0; i < 80; i++) {
    const tMid = (tLow + tHigh) / 2;
    const Dt = D28 * Math.pow(T_REF_S / tMid, m);
    const z = cob_m / (2 * Math.sqrt(Dt * tMid));
    const C = Cs * (1 - _erf(z));

    if (Math.abs(C - Ccrit) < 0.0005) return tMid / SEGUNDOS_ANO;
    if (C > Ccrit) tHigh = tMid;
    else tLow = tMid;
  }

  const resultado = tHigh / SEGUNDOS_ANO;
  return resultado <= 300 ? resultado : Infinity;
}

/**
 * Tempo de iniciação por carbonatação.
 * x_c(t) = K_c × √t → t = (cob / K_c)²
 *
 * @param cob_mm  Cobrimento — mm
 * @param Kc      Coeficiente de carbonatação — mm/√ano
 * @returns t_iniciação — anos
 */
export function tIniciacaoCarbonatacao(cob_mm: number, Kc: number): number {
  if (Kc <= 0 || cob_mm <= 0) return Infinity;
  return Math.pow(cob_mm / Kc, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// VPL — VALOR PRESENTE LÍQUIDO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula VPL de um cenário de ciclo de vida — Eq. (4)
 */
export function calcularVPL(cenario: CenarioVPL): ResultadoVPL {
  _validar(cenario.taxaDesconto >= 0 && cenario.taxaDesconto < 1,
    `Taxa de desconto inválida: ${cenario.taxaDesconto}`);

  const intervencoes = cenario.intervencoes
    .filter((i) => i.idade_anos <= cenario.horizonte_anos)
    .map((i) => {
      const fator = Math.pow(1 + cenario.taxaDesconto, i.idade_anos);
      const vp = i.custo_Rm2 / fator;
      return {
        descricao: i.descricao,
        idade_anos: i.idade_anos,
        custoNominal_Rm2: _ar(i.custo_Rm2, 2),
        vpCusto_Rm2: _ar(vp, 2),
      };
    });

  const vpTotal = intervencoes.reduce((s, i) => s + i.vpCusto_Rm2, 0);

  return {
    nome: cenario.nome,
    vpl_Rm2: _ar(cenario.custoInicial_Rm2 + vpTotal, 2),
    custoInicial_Rm2: cenario.custoInicial_Rm2,
    vpIntervencoes_Rm2: _ar(vpTotal, 2),
    intervencoes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULAÇÃO MONTE CARLO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa simulação Monte Carlo de vida útil.
 *
 * @param variaveis  Variáveis estocásticas
 * @param params     Parâmetros MC
 * @returns Array de ResultadoSimulacao
 */
export function simularMonteCarlo(
  variaveis: VariaveisEstocasticas,
  params: ParamsMonteCarlo = {},
): ResultadoSimulacao[] {
  const N = params.N ?? 5000;
  const seed = params.seed ?? 42;
  const tProp = params.tPropagacao_anos ?? 10;

  _validar(N >= 100 && N <= 100000, `N fora da faixa: ${N} (100–100000)`);

  const rng = _mulberry32(seed);
  const resultados: ResultadoSimulacao[] = [];

  const {
    D28_mean, D28_cov = 0.25,
    Cs_mean, Cs_cov = 0.20,
    Ccrit_mean = C_CRIT_DEFAULT, Ccrit_cov = 0.20,
    cob_mean_mm, cob_cov = 0.12, cob_bias_mm = -2,
    m_mean, m_cov = 0.10,
    Kc_mean, Kc_cov = 0.20,
  } = variaveis;

  for (let i = 0; i < N; i++) {
    // Amostrar variáveis
    const D28 = _logNormalSample(D28_mean, D28_cov, rng);
    const Cs = _logNormalSample(Cs_mean, Cs_cov, rng);
    const Ccrit = _logNormalSample(Ccrit_mean, Ccrit_cov, rng);
    const cob_mm = Math.max(5, _normalSample(cob_mean_mm + cob_bias_mm, cob_mean_mm * cob_cov, rng));
    const m = Math.max(0.05, Math.min(0.8, _normalSample(m_mean, m_mean * m_cov, rng)));

    // Cloretos
    const tCl = tIniciacaoCloretos(cob_mm / 1000, D28, m, Cs, Ccrit);

    // Carbonatação (se Kc fornecido)
    let tCarb = Infinity;
    if (Kc_mean && Kc_mean > 0) {
      const Kc = _logNormalSample(Kc_mean, Kc_cov, rng);
      tCarb = tIniciacaoCarbonatacao(cob_mm, Kc);
    }

    // Mecanismo dominante (menor t_iniciação)
    const mecanismo: "cloretos" | "carbonatacao" = tCl <= tCarb ? "cloretos" : "carbonatacao";
    const tIni = Math.min(tCl, tCarb);
    const tVida = tIni + tProp;

    resultados.push({
      tIniciacao_anos: _ar(Math.min(tIni, 300), 1),
      tVida_anos: _ar(Math.min(tVida, 310), 1),
      mecanismo,
    });
  }

  return resultados;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTATÍSTICAS E CURVAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula estatísticas a partir dos resultados MC.
 */
export function calcularEstatisticas(
  resultados: ResultadoSimulacao[],
  vidaProjeto: number,
): EstatisticasMC {
  const N = resultados.length;
  const vidas = resultados.map((r) => r.tVida_anos).sort((a, b) => a - b);

  const media = vidas.reduce((s, v) => s + v, 0) / N;
  const variancia = vidas.reduce((s, v) => s + (v - media) ** 2, 0) / N;
  const desvio = Math.sqrt(variancia);

  const p5 = vidas[Math.floor(N * 0.05)];
  const p50 = vidas[Math.floor(N * 0.50)];
  const p95 = vidas[Math.floor(N * 0.95)];

  const nFalha = vidas.filter((v) => v < vidaProjeto).length;
  const Pf = nFalha / N;
  const beta = Pf > 0 && Pf < 1 ? _probit(1 - Pf) : Pf === 0 ? 5.0 : 0;

  return {
    media_anos: _ar(media, 1),
    desvio_anos: _ar(desvio, 1),
    p5_anos: _ar(p5, 1),
    p50_anos: _ar(p50, 1),
    p95_anos: _ar(p95, 1),
    Pf_projeto: _ar(Pf, 4),
    beta_projeto: _ar(beta, 2),
    conforme: beta >= BETA_ALVO,
  };
}

/**
 * Gera curva P_f(t) e β(t) para idades discretas.
 */
export function gerarCurvaPf(
  resultados: ResultadoSimulacao[],
  tMax_anos = 100,
  nPontos = 50,
): PontoProbabilidade[] {
  const N = resultados.length;
  const curva: PontoProbabilidade[] = [];

  for (let i = 0; i <= nPontos; i++) {
    const t = (tMax_anos * i) / nPontos;

    const nCl = resultados.filter(
      (r) => r.mecanismo === "cloretos" && r.tVida_anos < t,
    ).length;
    const nCarb = resultados.filter(
      (r) => r.mecanismo === "carbonatacao" && r.tVida_anos < t,
    ).length;
    const nTotal = resultados.filter((r) => r.tVida_anos < t).length;

    const PfCl = nCl / N;
    const PfCarb = nCarb / N;
    const PfComb = nTotal / N;
    const beta = PfComb > 0 && PfComb < 1 ? _probit(1 - PfComb) : PfComb === 0 ? 5.0 : 0;

    curva.push({
      idade_anos: _ar(t, 1),
      Pf_cloretos: _ar(PfCl, 4),
      Pf_carbonatacao: _ar(PfCarb, 4),
      Pf_combinada: _ar(PfComb, 4),
      beta: _ar(beta, 2),
    });
  }

  return curva;
}

/**
 * Gera histograma de vida útil.
 */
export function gerarHistograma(
  resultados: ResultadoSimulacao[],
  nFaixas = 20,
  tMax = 150,
): { faixa: string; contagem: number; pct: number }[] {
  const N = resultados.length;
  const largura = tMax / nFaixas;
  const contagens = new Array(nFaixas).fill(0);

  for (const r of resultados) {
    const idx = Math.min(nFaixas - 1, Math.floor(r.tVida_anos / largura));
    if (idx >= 0) contagens[idx]++;
  }

  return contagens.map((c, i) => ({
    faixa: `${Math.round(i * largura)}-${Math.round((i + 1) * largura)}`,
    contagem: c,
    pct: _ar((c / N) * 100, 1),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// CENÁRIOS VPL DEFAULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera cenários VPL default baseados na vida útil estimada.
 */
export function gerarCenariosDefault(
  mediaVida: number,
  horizonte = 50,
  taxa = TAXA_DESCONTO_DEFAULT,
): CenarioVPL[] {
  return [
    {
      nome: "Preventivo — cobrimento adequado",
      custoInicial_Rm2: 120,
      intervencoes: [],
      taxaDesconto: taxa,
      horizonte_anos: horizonte,
    },
    {
      nome: "Corretivo — reparo aos " + Math.round(mediaVida * 0.7) + " anos",
      custoInicial_Rm2: 100,
      intervencoes: [
        {
          descricao: "Reparo superficial",
          idade_anos: Math.round(mediaVida * 0.7),
          custo_Rm2: CUSTOS_INTERVENCAO.reparo_superficial,
        },
      ],
      taxaDesconto: taxa,
      horizonte_anos: horizonte,
    },
    {
      nome: "Negligente — reforço aos " + Math.round(mediaVida * 0.5) + " anos",
      custoInicial_Rm2: 80,
      intervencoes: [
        {
          descricao: "Reparo profundo",
          idade_anos: Math.round(mediaVida * 0.5),
          custo_Rm2: CUSTOS_INTERVENCAO.reparo_profundo,
        },
        {
          descricao: "Reforço estrutural",
          idade_anos: Math.round(mediaVida * 0.8),
          custo_Rm2: CUSTOS_INTERVENCAO.reforco_estrutural,
        },
      ],
      taxaDesconto: taxa,
      horizonte_anos: horizonte,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa análise completa de vida útil.
 *
 * Fluxo:
 * 1. Simulação Monte Carlo (N realizações)
 * 2. Calcula estatísticas (média, percentis, P_f, β)
 * 3. Gera curva P_f(t) + β(t)
 * 4. Gera histograma de vida útil
 * 5. Calcula VPL dos cenários
 *
 * @param entrada EntradaLifeEngine
 * @returns ResultadoLifeEngine
 */
export function executarLifeEngine(entrada: EntradaLifeEngine): ResultadoLifeEngine {
  const { variaveis, monteCarlo = {} } = entrada;
  const vidaProjeto = monteCarlo.vidaProjeto_anos ?? 50;
  const N = monteCarlo.N ?? 5000;
  const seed = monteCarlo.seed ?? 42;
  const tProp = monteCarlo.tPropagacao_anos ?? 10;

  // 1. Monte Carlo
  const resultados = simularMonteCarlo(variaveis, { N, seed, vidaProjeto_anos: vidaProjeto, tPropagacao_anos: tProp });

  // 2. Estatísticas
  const estatisticas = calcularEstatisticas(resultados, vidaProjeto);

  // 3. Curva P_f
  const curvaPf = gerarCurvaPf(resultados, Math.max(vidaProjeto * 2, 100));

  // 4. Histograma
  const histograma = gerarHistograma(resultados);

  // 5. VPL
  const cenarios = entrada.cenariosVPL ?? gerarCenariosDefault(
    estatisticas.media_anos,
    vidaProjeto,
    TAXA_DESCONTO_DEFAULT,
  );
  const vpl = cenarios.map((c) => calcularVPL(c));

  return {
    estatisticas,
    curvaPf,
    histograma,
    vpl,
    params: { N, seed, vidaProjeto_anos: vidaProjeto, tPropagacao_anos: tProp },
  };
}
