/**
 * @file lib/empacotamento.ts
 * @description CORE MIX PRO — Motor de Otimização de Empacotamento de Agregados
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA E FUNDAMENTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O empacotamento de partículas determina diretamente o volume de pasta
 * necessário para preencher os vazios entre os agregados. Quanto melhor
 * o empacotamento, menor o consumo de cimento e maior a resistência e
 * durabilidade do concreto.
 *
 * Este módulo implementa múltiplos modelos de curva ideal e dois algoritmos
 * de otimização para encontrar a proporção de agregados que minimiza o
 * desvio em relação ao empacotamento teórico ótimo.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CURVAS DE REFERÊNCIA IMPLEMENTADAS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1. FULLER (1907) — Curva de distribuição de Fuller-Thompson:
 *    P(D) = (D / D_max)^0.5 × 100                                        … (Fu)
 *    Referência clássica para agregados graúdos. Não tem capping.
 *
 * 2. BOLOMEY (1935) — Modelo com teor de finos variável:
 *    P(D) = A + (100 − A) × (D / D_max)^0.5                              … (Bo)
 *    A = teor de finos residual (geralmente 8–15%)
 *    Vantagem sobre Fuller: considera a contribuição dos finos à trabalhabilidade.
 *
 * 3. ANDREASEN MODIFICADO — Mulcahy P.E. (2023):
 *    P(D) = [(D^q − D_min^q) / (D_max^q − D_min^q)] × 100              … (And)
 *    q ∈ [0.25, 0.50] — módulo de distribuição
 *    Modelo mais completo: cobre toda a faixa de partículas incluindo finos.
 *    Não aplica capping — valores > 100% são extrapolações válidas do modelo.
 *
 * 4. FAURY — Equivalente a Andreasen com q = 0.45 (validado da planilha Densus Engine).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MÉTRICAS DE EMPACOTAMENTO (Mulcahy, 2023)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * RMSE entre retida acumulada da mistura e passante da curva ideal:
 *   RMSE = √[ Σ(R_mis_i − P_ideal_i)² / N ]                             … (RMSE)
 *   (convenção Densus Engine: R_mis = retida acumulada%; P_ideal = passante% sem cap)
 *
 * Eficiência de empacotamento:
 *   E = max(0,  1 − RMSE / ε₀) × (φ_ideal − φ_ini)                     … (E)
 *
 * Fração de sólidos estimada:
 *   φ_est = φ_ini + E                                                     … (φ)
 *
 * Teor de vazios:
 *   V_v = (1 − φ_est) × 100                                               … (Vv)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ALGORITMOS DE OTIMIZAÇÃO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * A) BUSCA EXAUSTIVA (Grid Search)
 *    - Varre todas as combinações de proporções em passos de `passo`%
 *    - Complexidade: O(C(N+k,N)) onde k=100/passo, N=nAgregados
 *    - Garantia global: encontra o ótimo dentro da resolução do passo
 *    - Limitação: cresce combinatorialmente com N e 1/passo
 *
 * B) MONTE CARLO COM REFINAMENTO (Simulated Annealing Simplificado)
 *    - Fase 1: amostragem aleatória uniforme (exploração global)
 *    - Fase 2: perturbações locais em torno do melhor candidato (exploração local)
 *    - Complexidade: O(iterações) — controlada pelo usuário
 *    - Vantagem: escala bem para N > 4 agregados
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SHILSTONE CF/WF (Shilstone Sr., 1990)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O Gráfico de Shilstone representa a mistura em 2D:
 *   CF = Coarseness Factor — proporção de material grosso
 *   WF = Workability Factor — proporção de finos
 *
 * Definições implementadas (convenção Densus Engine):
 *   WF = R_mis(0.3mm)   — retida acumulada na peneira 0.3mm              … (WF)
 *   CF = R_mis(9.5mm) / R_mis(4.75mm) × 100   (quando R_mis(4.75mm) > 0)  … (CF)
 *
 * Zonas de Shilstone:
 *   Zona I  : CF < 60, WF > 35      → Alta trabalhabilidade
 *   Zona II : CF 60-75, WF 32-45    → Ótima (gap graduado)
 *   Zona III: CF > 75, WF > 32      → Trabalhável
 *   Zona IV : CF > 75, WF < 32      → Seco / rígido
 *   Zona V  : CF < 60, WF < 35      → Deficiente em finos
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TARANTULA CURVE (Cook et al., 2013)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Faixas de passante % por peneira para concreto convencional.
 * Cada peneira tem um limite inferior e superior; a mistura deve estar
 * dentro da faixa para ser classificada como "OK".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1] Fuller, W.B. & Thompson, S.E. (1907). Trans. ASCE.
 *   [2] Bolomey, J. (1935). Revue des Matériaux de Construction.
 *   [3] Andreasen, A.H.M. & Andersen, J. (1930). Kolloid-Zeitschrift.
 *   [4] Mulcahy, P.E. (2023). Optimized Particle Packing for Concrete.
 *   [5] Shilstone, J.M. Sr. (1990). Concrete International.
 *   [6] Cook, M.D. et al. (2013). Tarantula Curve. TxDOT Research Report.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  comporMisturaAgregados,
  gerarCurvaIdealAndreasen,
  gerarCurvaAIM,
  calcularCPM,
  calcularRmseAndreasenAtivo,
  SERIE_COMPLETA_MM,
  SERIE_LASER_MM,
  PARAMS_ANDREASEN_PADRAO,
  PARAMS_EMPACOTAMENTO_PADRAO,
  type CurvaGranulometrica,
  type ParamsAndreasen,
  type ParamsAIM,
  type ParamsEmpacotamento,
  type ClasseCPM,
  type ResultadoComposicao,
} from "./granulometria";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE REFERÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

/** Limites da curva Tarantula por peneira (passante %) — Cook et al. (2013) */
export const TARANTULA_LIMITES: ReadonlyArray<{
  aberturaMm:  number;
  limiteInfPct: number;
  limiteSupPct: number;
}> = [
  { aberturaMm: 50,    limiteInfPct: 95,  limiteSupPct: 100 },
  { aberturaMm: 37.5,  limiteInfPct: 90,  limiteSupPct: 100 },
  { aberturaMm: 25,    limiteInfPct: 80,  limiteSupPct: 100 },
  { aberturaMm: 19,    limiteInfPct: 70,  limiteSupPct: 90  },
  { aberturaMm: 12.5,  limiteInfPct: 50,  limiteSupPct: 70  },
  { aberturaMm: 9.5,   limiteInfPct: 40,  limiteSupPct: 60  },
  { aberturaMm: 4.75,  limiteInfPct: 20,  limiteSupPct: 38  },
  { aberturaMm: 2.36,  limiteInfPct: 10,  limiteSupPct: 25  },
  { aberturaMm: 1.18,  limiteInfPct: 5,   limiteSupPct: 17  },
  { aberturaMm: 0.6,   limiteInfPct: 2,   limiteSupPct: 10  },
  { aberturaMm: 0.3,   limiteInfPct: 1,   limiteSupPct: 5   },
  { aberturaMm: 0.15,  limiteInfPct: 0.5, limiteSupPct: 3   },
  { aberturaMm: 0.075, limiteInfPct: 0,   limiteSupPct: 2   },
] as const;

/** Proporção mínima permitida por agregado (evita zeros triviais em busca) */
const PROPORCAO_MINIMA = 0;

/** Tolerância de fechamento da soma das frações */
const TOLERANCIA_SOMA = 0.001;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tipo de modelo de curva de referência para otimização.
 *
 * | Modelo     | Equação                                        | Referência          |
 * |------------|------------------------------------------------|---------------------|
 * | ANDREASEN  | P=(D^q−Dmin^q)/(Dmax^q−Dmin^q)×100           | Dinger-Funk (1994)  |
 * | FULLER     | P=(D/Dmax)^0.5×100                            | Fuller (1907)       |
 * | BOLOMEY    | P=A+(100-A)×(D/Dmax)^0.5                     | Bolomey (1935)      |
 * | AIM        | P=100×(D/Dmax)^q×exp(−q×(1−D/Dmax))         | Brouwers (2006)     |
 * | CPM        | β* via De Larrard (1999) — não é curva %      | De Larrard (1999)   |
 * | ROSIN_RAMM | P=100×[1−exp(−(D/D63)^n)]                     | Rosin-Rammler       |
 */
export type ModeloCurvaReferencia = "ANDREASEN" | "FULLER" | "BOLOMEY" | "AIM" | "ROSIN_RAMMLER";

/**
 * Função objetivo para otimização — como medir o desvio da mistura.
 *
 * | Método  | Descrição                                        |
 * |---------|--------------------------------------------------|
 * | RMSE    | Raiz do erro quadrático médio (todos os pontos)  |
 * | RMSE_A  | RMSE apenas com peneiras ativas (0<P_ideal<100)  |
 * | WLS     | Mínimos quadrados ponderados (pesos log-intervalo)|
 */
export type FuncaoObjetivoOtimizacao = "RMSE" | "RMSE_ATIVO" | "WLS";

/**
 * Parâmetros adicionais para o modelo CPM na otimização.
 * Quando incluídos no ParamsGridSearch/ParamsMonteCarlo, o CPM é calculado
 * para cada candidato como métrica diagnóstica (não como função objetivo).
 */
export interface ParamsCPMOtimizacao {
  /**
   * β* monofracional de cada agregado — { id: betaStar }.
   * Fallback: BETA_STAR_CPM_DEFAULTS quando não informado.
   */
  betaStarPorId?: Record<string, number>;
  /** Limiar de interação d_j/d_i (default: 0.01) */
  limiarInteracao?: number;
}

/** Parâmetros de controle da busca exaustiva */
export interface ParamsGridSearch {
  /**
   * Incremento de cada proporção — % inteiro (1–10 recomendado)
   * Passo 1 → 176k combinações para 4 agregados (≈80ms)
   * Passo 5 → 1.8k combinações para 4 agregados (< 1ms)
   */
  passoPercent: number;
  /** Modelo de curva ideal para função objetivo */
  modelo?: ModeloCurvaReferencia;
  /** Parâmetros Andreasen (quando modelo = "ANDREASEN") */
  paramsAndreasen?: ParamsAndreasen;
  /** Parâmetros AIM (quando modelo = "AIM") */
  paramsAIM?: ParamsAIM;
  /** Parâmetros Rosin-Rammler (quando modelo = "ROSIN_RAMMLER") */
  paramsRosinRammler?: ParamsRosinRammler;
  /** Parâmetros de empacotamento Mulcahy */
  paramsEmpacotamento?: ParamsEmpacotamento;
  /**
   * Função objetivo para minimização (default: "RMSE").
   * "RMSE_ATIVO" é recomendado para UHPC e misturas com laser.
   */
  funcaoObjetivo?: FuncaoObjetivoOtimizacao;
  /** Parâmetros CPM para cálculo diagnóstico de β* (opcional) */
  paramsCPM?: ParamsCPMOtimizacao;
  /** Proporção mínima obrigatória por agregado — % (0 = sem restrição) */
  propMinimaPercent?: number;
  /** Proporção máxima por agregado — % (100 = sem restrição) */
  propMaximaPercent?: number;
  /** Restrições fixas: { id: percentual } — agregados com fração fixada */
  restricoesFixes?: Record<string, number>;
}

/** Parâmetros de controle do Monte Carlo */
export interface ParamsMonteCarlo {
  /** Número de amostras aleatórias na fase de exploração global */
  nIteracoesGlobal?: number;
  /** Número de iterações na fase de refinamento local */
  nIteracoesLocal?: number;
  /** Magnitude das perturbações locais (0–1, típico: 0.05–0.15) */
  magnitudePerturbacao?: number;
  /** Semente para reprodutibilidade (0 = aleatório) */
  semente?: number;
  /** Modelo de curva ideal */
  modelo?: ModeloCurvaReferencia;
  paramsAndreasen?: ParamsAndreasen;
  paramsAIM?: ParamsAIM;
  paramsRosinRammler?: ParamsRosinRammler;
  paramsEmpacotamento?: ParamsEmpacotamento;
  /** Função objetivo (default: "RMSE") */
  funcaoObjetivo?: FuncaoObjetivoOtimizacao;
  /** Parâmetros CPM para diagnóstico β* em cada candidato */
  paramsCPM?: ParamsCPMOtimizacao;
}

/** Candidato da otimização — uma combinação de proporções com seu RMSE */
export interface CandidatoOtimizacao {
  /** Frações de cada agregado (chave: id) */
  proporcoes:           Record<string, number>;
  /** RMSE da mistura em relação à curva ideal */
  rmse:                 number;
  /**
   * RMSE ativo — apenas peneiras onde 0 < P_ideal < 100.
   * Mais discriminante para UHPC e misturas com análise laser.
   */
  rmseAtivo?:           number;
  /**
   * WLS — Weighted Least Squares com pesos log-intervalo.
   * Peneiras finas têm peso maior (maior resolução relativa).
   */
  wls?:                 number;
  /** Eficiência de empacotamento E */
  eficiencia:           number;
  /** Fração de sólidos estimada φ_est */
  phiEstimado:          number;
  /** Teor de vazios % */
  teorVaziosPct:        number;
  /**
   * β* CPM de De Larrard — adimensional.
   * Calculado quando paramsCPM está presente no ParamsGridSearch/MonteCarlo.
   */
  betaStarCPM?:         number;
  /** Teor de vazios estimado pelo CPM — % */
  teorVaziosCPM?:       number;
  /** Módulo de finura da mistura resultante */
  moduloFinuraMistura:  number;
  /** DMC da mistura resultante — mm */
  dmcMisturaMm:         number;
}

/** Resultado completo da otimização */
export interface ResultadoOtimizacao {
  /** Algoritmo utilizado */
  algoritmo:              "GRID_SEARCH" | "MONTE_CARLO";
  /** Modelo de curva de referência */
  modeloCurva:            ModeloCurvaReferencia;
  /** Função objetivo usada */
  funcaoObjetivo:         FuncaoObjetivoOtimizacao;
  /** Parâmetros de Andreasen usados */
  paramsAndreasen:        ParamsAndreasen;
  /** Melhor candidato encontrado */
  otimo:                  CandidatoOtimizacao;
  /** Composição completa do ótimo (curva resultante + métricas) */
  composicaoOtima:        ResultadoComposicao;
  /** Número de combinações avaliadas */
  nCombinacoes:           number;
  /** Tempo de execução — ms */
  tempoExecucaoMs:        number;
  /** Top-N candidatos (para análise de sensibilidade) */
  topCandidatos:          CandidatoOtimizacao[];
  /** Métricas Shilstone da composição ótima */
  shilstone:              ResultadoShilstone;
  /** Verificação Tarantula */
  tarantula:              VerificacaoTarantula[];
  /** Curvas de referência para comparação */
  curvasReferencia:       CurvasReferencia;
}

/** Métricas do gráfico de Shilstone */
export interface ResultadoShilstone {
  /** WF — Workability Factor: retida acumulada na peneira 0.3mm */
  workabilityFactor: number;
  /** CF — Coarseness Factor: R(9.5mm)/R(4.75mm)×100 */
  coarsenessFactor: number;
  /** Zona do diagrama de Shilstone */
  zona: "I" | "II" | "III" | "IV" | "V" | "indefinida";
  /** Descrição da zona */
  descricaoZona: string;
}

/** Verificação de um ponto da curva Tarantula */
export interface VerificacaoTarantula {
  aberturaMm:   number;
  passantePct:  number;
  limiteInfPct: number;
  limiteSupPct: number;
  /** true = dentro da faixa */
  aprovado:     boolean;
  status:       "OK" | "ACIMA" | "ABAIXO";
}

/** Conjunto de curvas de referência calculadas para a série de peneiras */
export interface CurvasReferencia {
  peneiras:    number[];
  andreasen:   number[];  // passante % — Andreasen Modificado (Dinger-Funk)
  fuller:      number[];  // passante % — Fuller (1907)
  bolomey:     number[];  // passante % — Bolomey (1935)
  bolomeyA:    number;    // coeficiente A de Bolomey calibrado
  /**
   * AIM — Alfred Improved Model (Brouwers 2006).
   * Presente quando paramsAIM foi fornecido na chamada.
   */
  aim?:        number[];
  /**
   * Rosin-Rammler (Weibull) — passante % calculado com D63 e n fornecidos.
   * Presente quando paramsRosinRammler foi fornecido.
   */
  rosinRammler?: number[];
  /**
   * Pesos WLS log-intervalo — normalizados, soma = 1.
   * Presente quando funcaoObjetivo = "WLS".
   */
  pesosWLS?:   number[];
}

/** Parâmetros para distribuição Rosin-Rammler (Weibull de partículas) */
export interface ParamsRosinRammler {
  /** Tamanho característico em mm (tamanho a 63.2% passante) */
  d63Mm: number;
  /** Módulo de distribuição (tipicamente 0.8–1.5 para agregados) */
  n: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class EmpacotamentoSemAgregadosError extends Error {
  constructor() {
    super("É necessário ao menos 2 agregados para otimizar a composição.");
    this.name = "EmpacotamentoSemAgregadosError";
  }
}

export class EmpacotamentoPassoInvalidoError extends Error {
  constructor(passo: number) {
    super(`Passo de busca ${passo}% inválido. Use um valor inteiro entre 1 e 20.`);
    this.name = "EmpacotamentoPassoInvalidoError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DAS CURVAS DE REFERÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera a curva de Fuller (1907) para uma série de peneiras.
 *
 *   P(D) = (D / D_max)^0.5 × 100                                         … (Fu)
 *
 * Valores > 100 são produzidos para D > D_max (extrapolação válida).
 *
 * @param peneiras  Aberturas em mm
 * @param dMaxMm    Dimensão máxima do traço — mm
 */
export function gerarCurvaFuller(peneiras: readonly number[], dMaxMm: number): number[] {
  return peneiras.map((d) => _r2(Math.sqrt(d / dMaxMm) * 100));
}

/**
 * Gera a curva de Rosin-Rammler (Weibull) para uma série de peneiras.
 *
 *   P(D) = 100 × [1 − exp(−(D / D_63)^n)]
 *
 * Onde D_63 é o tamanho característico (63.2% passante) e n é o módulo
 * de distribuição (shape parameter). Tipicamente n ∈ [0.8, 1.5] para agregados.
 *
 * @param peneiras  Aberturas em mm
 * @param d63Mm     Tamanho característico (63.2% passante) — mm
 * @param n         Módulo de distribuição (shape parameter)
 */
export function gerarCurvaRosinRammler(
  peneiras: readonly number[],
  d63Mm: number,
  n: number
): number[] {
  return peneiras.map((d) =>
    d <= 0 ? 0 : _r2(100 * (1 - Math.exp(-Math.pow(d / d63Mm, n))))
  );
}

/**
 * Gera a curva de Bolomey (1935) para uma série de peneiras.
 *
 *   P(D) = A + (100 − A) × (D / D_max)^0.5                              … (Bo)
 *
 * O coeficiente A representa o teor de finos residual do traço.
 * Tipicamente A ∈ [8, 15] para concreto convencional.
 * Se não informado, A é calibrado para passar pelo ponto (D_min, 0).
 *
 * @param peneiras  Aberturas em mm
 * @param dMaxMm    Dimensão máxima — mm
 * @param A         Teor de finos (default: calibrado pelo D_min)
 * @param dMinMm    D_min para calibração automática de A (default: 0.075)
 */
export function gerarCurvaBolomey(
  peneiras: readonly number[],
  dMaxMm:   number,
  A?:       number,
  dMinMm:   number = 0.075
): { passante: number[]; A: number } {
  // Calibração automática de A — convenção Densus Engine:
  // A é calibrado para P(D_min) = 15.9% (passante residual típico na abertura mínima)
  //   A + (100-A)*(D_min/D_max)^0.5 = P_min
  //   A = (P_min - 100*x) / (1 - x)   onde x = sqrt(D_min/D_max)
  // Com D_min=0.075, D_max=25 → A ≈ 11.03 (validado contra planilha Densus Engine PRO 2025)
  const P_MIN_BOLOMEY = 15.9; // passante residual na abertura mínima
  const aCalibrado: number = A ?? (() => {
    const x = Math.sqrt(dMinMm / dMaxMm);
    return _r2((P_MIN_BOLOMEY - 100 * x) / (1 - x));
  })();

  const passante = peneiras.map((d) =>
    _r2(aCalibrado + (100 - aCalibrado) * Math.sqrt(d / dMaxMm))
  );

  return { passante, A: aCalibrado };
}

/**
 * Calcula as métricas de Shilstone (CF e WF) para uma curva da mistura.
 *
 * Convenção Densus Engine (validada contra a planilha):
 *   WF = R_mis(0.3mm)   — retida acumulada na peneira 0.3mm              … (WF)
 *   CF = R_mis(9.5mm) / R_mis(4.75mm) × 100                              … (CF)
 *
 * Zonas do diagrama de Shilstone (Shilstone 1990):
 *   Zona I  : WF > 40                        → Alta trabalhabilidade
 *   Zona II : WF 32–40, CF 40–75             → Ótima
 *   Zona III: WF 32–40, CF > 75              → Trabalhável
 *   Zona IV : WF < 32, CF > 75              → Seco / rígido
 *   Zona V  : WF < 32, CF < 40              → Deficiente em finos
 */
export function calcularShilstone(
  peneiras:        readonly number[],
  retidaAcumPct:   readonly number[]
): ResultadoShilstone {
  // Indexar retida acumulada por peneira para acesso O(1)
  const idx: Record<number, number> = {};
  peneiras.forEach((p, i) => { idx[p] = retidaAcumPct[i]; });

  const wf = idx[0.3] ?? 0;
  const r475 = idx[4.75] ?? 0;
  const r95  = idx[9.5]  ?? 0;
  const cf   = r475 > 0 ? _r2(r95 / r475 * 100) : 0;

  // Classificação de zona
  let zona: ResultadoShilstone["zona"] = "indefinida";
  let descricaoZona = "";

  if (wf > 40) {
    zona = "I"; descricaoZona = "Alta trabalhabilidade — excesso de finos";
  } else if (wf >= 32 && wf <= 40 && cf >= 40 && cf <= 75) {
    zona = "II"; descricaoZona = "Ótima — gap graduado ideal";
  } else if (wf >= 32 && cf > 75) {
    zona = "III"; descricaoZona = "Trabalhável — mistura aceitável";
  } else if (wf < 32 && cf > 75) {
    zona = "IV"; descricaoZona = "Seco / rígido — deficiente em finos";
  } else if (wf < 32 && cf < 40) {
    zona = "V"; descricaoZona = "Deficiente em finos — trabalhabilidade comprometida";
  }

  return { workabilityFactor: wf, coarsenessFactor: cf, zona, descricaoZona };
}

/**
 * Verifica a curva de passante da mistura contra os limites da curva Tarantula.
 */
export function verificarTarantula(
  peneiras:     readonly number[],
  passantePct:  readonly number[]
): VerificacaoTarantula[] {
  const idxPass: Record<number, number> = {};
  peneiras.forEach((p, i) => { idxPass[p] = passantePct[i]; });

  return TARANTULA_LIMITES.map((limite) => {
    const pv = idxPass[limite.aberturaMm] ?? -1;
    if (pv < 0) {
      return {
        aberturaMm:   limite.aberturaMm,
        passantePct:  pv,
        limiteInfPct: limite.limiteInfPct,
        limiteSupPct: limite.limiteSupPct,
        aprovado:     false,
        status:       "ABAIXO" as const,
      };
    }
    const aprovado = pv >= limite.limiteInfPct && pv <= limite.limiteSupPct;
    const status: VerificacaoTarantula["status"] = aprovado
      ? "OK"
      : pv > limite.limiteSupPct
        ? "ACIMA"
        : "ABAIXO";

    return {
      aberturaMm:   limite.aberturaMm,
      passantePct:  _r2(pv),
      limiteInfPct: limite.limiteInfPct,
      limiteSupPct: limite.limiteSupPct,
      aprovado,
      status,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO OBJETIVO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o RMSE (função objetivo) entre a mistura e a curva ideal.
 *
 * Convenção Densus Engine: compara retida acumulada % da mistura com passante %
 * da curva ideal (sem capping — válido para extrapolação além de D_max).
 *
 * RMSE = √[ Σ(R_mistura_i − P_ideal_i)² / N ]                           … (RMSE)
 *
 * @param passanteMistura  Array de % passante de cada peneira da mistura
 * @param passanteIdeal    Array de % passante ideal (Andreasen/Fuller/Bolomey)
 * @returns                RMSE adimensional
 */
export function calcularRmse(
  passanteMistura: readonly number[],
  passanteIdeal:   readonly number[]
): number {
  const N = passanteMistura.length;
  if (N === 0) return Infinity;

  const soma = passanteMistura.reduce((acc, _p, i) => {
    const retidaMistura = 100 - passanteMistura[i]; // R_mis_i
    const diff = retidaMistura - passanteIdeal[i];   // convenção Densus Engine
    return acc + diff * diff;
  }, 0);

  return Math.sqrt(soma / N);
}

/**
 * Calcula todas as métricas de empacotamento a partir de um RMSE.
 *
 * @param rmse         RMSE da mistura em relação à curva ideal
 * @param params       Parâmetros do modelo Mulcahy
 * @returns            { eficiencia, phiEstimado, teorVaziosPct }
 */
export function calcularMetricasEmpacotamento(
  rmse:   number,
  params: ParamsEmpacotamento = PARAMS_EMPACOTAMENTO_PADRAO
): { eficiencia: number; phiEstimado: number; teorVaziosPct: number } {
  const { phiInicial, phiIdeal, epsilonReferencia } = params;
  // E = max(0, 1 − RMSE/ε₀) × (φ_ideal − φ_ini)                        … (E)
  const eficiencia  = _r4(Math.max(0, 1 - rmse / epsilonReferencia) * (phiIdeal - phiInicial));
  const phiEstimado = _r4(phiInicial + eficiencia);
  const teorVaziosPct = _r2((1 - phiEstimado) * 100);
  return { eficiencia, phiEstimado, teorVaziosPct };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITMO A — BUSCA EXAUSTIVA (Grid Search)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Otimiza as proporções de mistura de agregados por busca exaustiva em grade.
 *
 * Varre todas as combinações discretas de proporções (φ₁, φ₂, …, φ_N) com
 * Σφ_i = 1 e φ_i ≥ 0, com passo de `passoPercent`%.
 *
 * Complexidade: C(N + k − 1, N − 1) onde k = 100/passoPercent.
 * Exemplos:
 *   passo=5,  N=4 → 1.771 combinações
 *   passo=1,  N=4 → 176.851 combinações
 *   passo=5,  N=5 → 10.626 combinações
 *   passo=1,  N=5 → 4.598.126 combinações
 *
 * @param curvas  Array de CurvaGranulometrica (mínimo 2)
 * @param params  Parâmetros da busca
 * @returns       ResultadoOtimizacao com a composição ótima e métricas
 *
 * @throws EmpacotamentoSemAgregadosError se < 2 agregados
 * @throws EmpacotamentoPassoInvalidoError se passo inválido
 */
export function otimizarProporcoesAgregados(
  curvas:  CurvaGranulometrica[],
  params?: ParamsGridSearch
): ResultadoOtimizacao {
  if (curvas.length < 2) throw new EmpacotamentoSemAgregadosError();

  const {
    passoPercent      = 5,
    modelo            = "ANDREASEN",
    paramsAndreasen   = PARAMS_ANDREASEN_PADRAO,
    paramsEmpacotamento = PARAMS_EMPACOTAMENTO_PADRAO,
    propMinimaPercent = 0,
    propMaximaPercent = 100,
    restricoesFixes   = {},
  } = params ?? {};

  if (passoPercent < 1 || passoPercent > 20 || !Number.isInteger(passoPercent)) {
    throw new EmpacotamentoPassoInvalidoError(passoPercent);
  }

  const funcaoObjetivo      = params?.funcaoObjetivo ?? "RMSE";
  const paramsAIM           = params?.paramsAIM;
  const paramsCPM           = params?.paramsCPM;
  const paramsRosinRammler  = params?.paramsRosinRammler;

  const t0 = Date.now();

  // ── Série de peneiras base ────────────────────────────────────────────────
  // Se alguma curva tem dados laser → usar SERIE_LASER_MM; caso contrário SERIE_COMPLETA_MM
  const temLaser = curvas.some((c) => c.contemDadosLaser);
  const peneirasBase = temLaser
    ? Array.from(SERIE_LASER_MM)
    : Array.from(SERIE_COMPLETA_MM);

  // ── Calcular curva ideal de referência ──────────────────────────────────
  const curvaIdeal    = _gerarCurvaIdeal(modelo, peneirasBase, paramsAndreasen, paramsAIM, paramsRosinRammler);
  const passanteIdeal = curvaIdeal.passante;

  // ── Separar agregados livres dos fixados ─────────────────────────────────
  const idsFixados  = Object.keys(restricoesFixes);
  const curvasLivres = curvas.filter((c) => !idsFixados.includes(c.id));
  const somaFixados  = Object.values(restricoesFixes).reduce((a, b) => a + b, 0);
  const totalLivre   = 100 - somaFixados;

  // ── Pré-calcular passantes de cada curva para acesso O(1) ───────────────
  const passantesPorCurva: Record<string, number[]> = {};
  for (const curva of curvas) {
    passantesPorCurva[curva.id] = peneirasBase.map(
      (p) => curva.passantesPorAbertura[String(p)] ?? 100
    );
  }

  // Contribuição dos agregados fixados ao passante
  const passanteFixado = peneirasBase.map((_, i) =>
    idsFixados.reduce((acc, id) => {
      const frac = (restricoesFixes[id] ?? 0) / 100;
      return acc + frac * (passantesPorCurva[id]?.[i] ?? 100);
    }, 0)
  );

  // ── Enumeração das proporções dos agregados livres ───────────────────────
  const N  = curvasLivres.length;
  const k  = Math.round(totalLivre / passoPercent);
  const topN = 10;
  let nCombinacoes = 0;

  const heap: CandidatoOtimizacao[] = []; // top-N, ordenado por RMSE crescente

  const _avaliar = (propsPct: number[]) => {
    nCombinacoes++;

    // Calcular passante da mistura
    const passanteMistura = peneirasBase.map((_, i) => {
      let p = passanteFixado[i];
      for (let j = 0; j < N; j++) {
        p += (propsPct[j] / 100) * (passantesPorCurva[curvasLivres[j].id]![i] ?? 100);
      }
      return p;
    });

    const rmse = calcularRmse(passanteMistura, passanteIdeal);

    // ── Métricas adicionais (rmseAtivo, WLS) ───────────────────────────────
    const { rmse: rmseAtivo } = calcularRmseAndreasenAtivo(
      passanteMistura, peneirasBase, paramsAndreasen
    );

    const wls = calcularWLS(passanteMistura, passanteIdeal, peneirasBase);

    // ── Função objetivo: escolher qual minimizar ────────────────────────────
    const fo = funcaoObjetivo === "RMSE_ATIVO"
      ? rmseAtivo
      : funcaoObjetivo === "WLS"
        ? wls
        : rmse;

    const { eficiencia, phiEstimado, teorVaziosPct } = calcularMetricasEmpacotamento(
      rmse, paramsEmpacotamento
    );

    // ── CPM diagnóstico (β* por candidato) ─────────────────────────────────
    let betaStarCPM: number | undefined;
    let teorVaziosCPM: number | undefined;
    if (paramsCPM) {
      try {
        const classesCPM: ClasseCPM[] = curvasLivres.map((c, j) => ({
          id:       c.id,
          dRepMm:   c.dimensaoMaximaCaracteristicaMm > 0
            ? Math.sqrt(c.dimensaoMaximaCaracteristicaMm * (c.dMinEfetivaMm ?? 0.001))
            : 0.5,
          betaStar: paramsCPM.betaStarPorId?.[c.id] ?? 0.62,
          phi:      (propsPct[j]! / 100),
        }));
        // Adicionar fixados
        for (const [id, pct] of Object.entries(restricoesFixes)) {
          const curvaFix = curvas.find((c) => c.id === id);
          if (curvaFix) {
            classesCPM.push({
              id,
              dRepMm:   Math.sqrt(
                curvaFix.dimensaoMaximaCaracteristicaMm *
                (curvaFix.dMinEfetivaMm ?? 0.001)
              ),
              betaStar: paramsCPM.betaStarPorId?.[id] ?? 0.62,
              phi:      pct / 100,
            });
          }
        }
        const resCPM = calcularCPM(classesCPM, paramsCPM.limiarInteracao ?? 0.01);
        betaStarCPM  = resCPM.betaStar;
        teorVaziosCPM = resCPM.teorVaziosPct;
      } catch { /* ignora erros CPM individuais */ }
    }

    // Montar proporcoes completas (livres + fixadas)
    const proporcoes: Record<string, number> = { ...restricoesFixes };
    curvasLivres.forEach((c, j) => { proporcoes[c.id] = _r4(propsPct[j]! / 100); });
    for (const id of idsFixados) { proporcoes[id] = _r4((restricoesFixes[id] ?? 0) / 100); }

    // Calcular MF e DMC via passante da mistura
    const retidaAcumMistura = passanteMistura.map((p) => 100 - p);
    const mfMistura  = _calcularMfDeRetidaAcum(peneirasBase, retidaAcumMistura);
    const dmcMistura = _calcularDmc(peneirasBase, passanteMistura);

    const candidato: CandidatoOtimizacao = {
      proporcoes,
      rmse:                _r2(rmse),
      rmseAtivo:           _r2(rmseAtivo),
      wls:                 _r2(wls),
      eficiencia,
      phiEstimado,
      teorVaziosPct,
      betaStarCPM,
      teorVaziosCPM,
      moduloFinuraMistura:  mfMistura,
      dmcMisturaMm:         dmcMistura,
    };

    // Manter heap de top-N — ordenado pela função objetivo escolhida
    if (heap.length < topN || fo < heap[heap.length - 1]!.rmse) {
      heap.push(candidato);
      heap.sort((a, b) => {
        const foA = funcaoObjetivo === "RMSE_ATIVO" ? (a.rmseAtivo ?? a.rmse)
          : funcaoObjetivo === "WLS" ? (a.wls ?? a.rmse) : a.rmse;
        const foB = funcaoObjetivo === "RMSE_ATIVO" ? (b.rmseAtivo ?? b.rmse)
          : funcaoObjetivo === "WLS" ? (b.wls ?? b.rmse) : b.rmse;
        return foA - foB;
      });
      if (heap.length > topN) heap.pop();
    }
  };

  // ── Recursão N-dimensional (simplex discreto) ────────────────────────────
  const _buscar = (nivel: number, acumuladoPct: number, props: number[]) => {
    if (nivel === N - 1) {
      const restante = totalLivre - acumuladoPct;
      if (restante < propMinimaPercent - passoPercent || restante > propMaximaPercent + passoPercent) return;
      _avaliar([...props, restante]);
      return;
    }

    const restanteDisponivel = totalLivre - acumuladoPct;
    const maxLocal = Math.min(restanteDisponivel, propMaximaPercent);
    const minLocal = propMinimaPercent;

    for (let p = minLocal; p <= maxLocal + 0.001; p += passoPercent) {
      props.push(_r2(p));
      _buscar(nivel + 1, acumuladoPct + p, props);
      props.pop();
    }
  };

  _buscar(0, 0, []);

  if (heap.length === 0) {
    // Fallback: mistura uniforme
    const propUnif = _r4(1 / curvas.length);
    const proporcoes = Object.fromEntries(curvas.map((c) => [c.id, propUnif]));
    const passanteMistura = peneirasBase.map((_, i) =>
      curvas.reduce((acc, c) => acc + propUnif * (c.passantesPorAbertura[String(peneirasBase[i])] ?? 100), 0)
    );
    const rmse = calcularRmse(passanteMistura, passanteIdeal);
    const met  = calcularMetricasEmpacotamento(rmse, paramsEmpacotamento);
    heap.push({
      proporcoes,
      rmse:                _r2(rmse),
      rmseAtivo:           _r2(calcularRmseAndreasenAtivo(passanteMistura, peneirasBase, paramsAndreasen).rmse),
      wls:                 _r2(calcularWLS(passanteMistura, passanteIdeal, peneirasBase)),
      eficiencia:          met.eficiencia,
      phiEstimado:         met.phiEstimado,
      teorVaziosPct:       met.teorVaziosPct,
      moduloFinuraMistura: 0,
      dmcMisturaMm:        0,
    });
  }

  const otimo = heap[0]!;

  // ── Montar composição completa para o ótimo ─────────────────────────────
  const composicaoOtima = comporMisturaAgregados(
    otimo.proporcoes,
    curvas,
    paramsAndreasen,
    paramsEmpacotamento
  );

  // ── Shilstone e Tarantula para o ótimo ──────────────────────────────────
  const passanteOtimo = peneirasBase.map((p) =>
    composicaoOtima.curvaMistura.passantesPorAbertura[String(p)] ?? 0
  );
  const retidaAcumOtimo = passanteOtimo.map((p) => 100 - p);
  const shilstone = calcularShilstone(peneirasBase, retidaAcumOtimo);
  const tarantula = verificarTarantula(peneirasBase, passanteOtimo);

  // ── Curvas de referência ─────────────────────────────────────────────────
  const curvasRef = _montarCurvasReferencia(
    peneirasBase, paramsAndreasen, paramsAIM, funcaoObjetivo, paramsRosinRammler
  );

  return {
    algoritmo:        "GRID_SEARCH",
    modeloCurva:      modelo,
    funcaoObjetivo,
    paramsAndreasen,
    otimo,
    composicaoOtima,
    nCombinacoes,
    tempoExecucaoMs:  Date.now() - t0,
    topCandidatos:    heap,
    shilstone,
    tarantula,
    curvasReferencia: curvasRef,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALGORITMO B — MONTE CARLO COM REFINAMENTO LOCAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Otimiza as proporções de mistura por amostragem Monte Carlo com
 * refinamento local (Simulated Annealing Simplificado).
 *
 * Pipeline:
 *   1. Fase global: gera `nIteracoesGlobal` combinações aleatórias uniformes
 *      no simplex N-dimensional (garantia de Σφ = 1).
 *   2. Fase local: a partir do melhor candidato global, aplica perturbações
 *      gaussianas de magnitude `magnitudePerturbacao` por `nIteracoesLocal`
 *      iterações, aceitando sempre a melhora.
 *
 * Vantagem sobre Grid Search para N ≥ 5 agregados ou requisitos de resolução
 * abaixo de 1% (100k iterações ≈ 50ms, independente de N).
 *
 * @param curvas  Array de CurvaGranulometrica
 * @param params  Parâmetros do Monte Carlo
 * @returns       ResultadoOtimizacao
 */
export function otimizarMonteCarlo(
  curvas:  CurvaGranulometrica[],
  params?: ParamsMonteCarlo
): ResultadoOtimizacao {
  if (curvas.length < 2) throw new EmpacotamentoSemAgregadosError();

  const {
    nIteracoesGlobal    = 50_000,
    nIteracoesLocal     = 20_000,
    magnitudePerturbacao = 0.08,
    semente             = 0,
    modelo              = "ANDREASEN",
    paramsAndreasen     = PARAMS_ANDREASEN_PADRAO,
    paramsEmpacotamento = PARAMS_EMPACOTAMENTO_PADRAO,
  } = params ?? {};

  const t0   = Date.now();
  const N    = curvas.length;
  const topN = 10;

  // PRNG determinístico (LCG simples para reprodutibilidade)
  let seed = semente === 0 ? Date.now() : semente;
  const _rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  // Série de peneiras — laser se alguma curva tem dados laser
  const temLaser    = curvas.some((c) => c.contemDadosLaser);
  const peneirasBase = temLaser
    ? Array.from(SERIE_LASER_MM)
    : Array.from(SERIE_COMPLETA_MM);

  const funcaoObjetivo      = params?.funcaoObjetivo ?? "RMSE";
  const paramsAIM           = params?.paramsAIM;
  const paramsRosinRammler  = params?.paramsRosinRammler;

  const curvaIdeal    = _gerarCurvaIdeal(modelo, peneirasBase, paramsAndreasen, paramsAIM, paramsRosinRammler);
  const passanteIdeal = curvaIdeal.passante;

  // Pré-calcular passantes
  const passantesPorCurva: Record<string, number[]> = {};
  for (const c of curvas) {
    passantesPorCurva[c.id] = peneirasBase.map(
      (p) => c.passantesPorAbertura[String(p)] ?? 100
    );
  }

  const heap: CandidatoOtimizacao[] = [];
  let nCombinacoes = 0;

  const _avaliarVetor = (vetor: number[]) => {
    nCombinacoes++;
    const passanteMistura = peneirasBase.map((_, i) =>
      vetor.reduce((acc, phi, j) => acc + phi * (passantesPorCurva[curvas[j]!.id]![i] ?? 100), 0)
    );
    const rmse = calcularRmse(passanteMistura, passanteIdeal);
    const fo   = funcaoObjetivo === "RMSE_ATIVO"
      ? calcularRmseAndreasenAtivo(passanteMistura, peneirasBase, paramsAndreasen).rmse
      : funcaoObjetivo === "WLS"
        ? calcularWLS(passanteMistura, passanteIdeal, peneirasBase)
        : rmse;
    return { rmse, fo, passanteMistura };
  };

  const _toCandidato = (vetor: number[], rmse: number, passanteMistura: number[]): CandidatoOtimizacao => {
    const proporcoes = Object.fromEntries(curvas.map((c, j) => [c.id, _r4(vetor[j]!)]));
    const { eficiencia, phiEstimado, teorVaziosPct } = calcularMetricasEmpacotamento(rmse, paramsEmpacotamento);
    const retAcum    = passanteMistura.map((p) => 100 - p);
    const rmseAtivo  = calcularRmseAndreasenAtivo(passanteMistura, peneirasBase, paramsAndreasen).rmse;
    const wls        = calcularWLS(passanteMistura, passanteIdeal, peneirasBase);
    return {
      proporcoes,
      rmse:                _r2(rmse),
      rmseAtivo:           _r2(rmseAtivo),
      wls:                 _r2(wls),
      eficiencia,
      phiEstimado,
      teorVaziosPct,
      moduloFinuraMistura: _calcularMfDeRetidaAcum(peneirasBase, retAcum),
      dmcMisturaMm:        _calcularDmc(peneirasBase, passanteMistura),
    };
  };

  const _insertHeap = (candidato: CandidatoOtimizacao) => {
    const foVal = funcaoObjetivo === "RMSE_ATIVO" ? (candidato.rmseAtivo ?? candidato.rmse)
      : funcaoObjetivo === "WLS" ? (candidato.wls ?? candidato.rmse) : candidato.rmse;
    const foLast = (() => {
      const last = heap[heap.length - 1];
      if (!last) return Infinity;
      return funcaoObjetivo === "RMSE_ATIVO" ? (last.rmseAtivo ?? last.rmse)
        : funcaoObjetivo === "WLS" ? (last.wls ?? last.rmse) : last.rmse;
    })();
    if (heap.length < topN || foVal < foLast) {
      heap.push(candidato);
      heap.sort((a, b) => {
        const fa = funcaoObjetivo === "RMSE_ATIVO" ? (a.rmseAtivo ?? a.rmse)
          : funcaoObjetivo === "WLS" ? (a.wls ?? a.rmse) : a.rmse;
        const fb = funcaoObjetivo === "RMSE_ATIVO" ? (b.rmseAtivo ?? b.rmse)
          : funcaoObjetivo === "WLS" ? (b.wls ?? b.rmse) : b.rmse;
        return fa - fb;
      });
      if (heap.length > topN) heap.pop();
    }
  };

  // ── FASE 1: Amostragem aleatória no simplex ──────────────────────────────
  // Método: gerar N exponenciais e normalizar (Dirichlet uniforme)
  for (let iter = 0; iter < nIteracoesGlobal; iter++) {
    const exps = Array.from({ length: N }, () => -Math.log(_rand() + 1e-10));
    const soma  = exps.reduce((a, b) => a + b, 0);
    const vetor = exps.map((e) => e / soma);

    const { rmse, fo, passanteMistura } = _avaliarVetor(vetor);
    void fo;
    _insertHeap(_toCandidato(vetor, rmse, passanteMistura));
  }

  // ── FASE 2: Refinamento local em torno do melhor candidato ───────────────
  let melhorVetor = curvas.map((c) => heap[0]!.proporcoes[c.id] ?? 0);
  let melhorFo    = (() => {
    const h0 = heap[0]!;
    return funcaoObjetivo === "RMSE_ATIVO" ? (h0.rmseAtivo ?? h0.rmse)
      : funcaoObjetivo === "WLS" ? (h0.wls ?? h0.rmse) : h0.rmse;
  })();

  for (let iter = 0; iter < nIteracoesLocal; iter++) {
    // Gera perturbação gaussiana
    const perturbado = melhorVetor.map(
      (phi) => Math.max(0, phi + ((_rand() - 0.5) * 2) * magnitudePerturbacao)
    );

    // Renormaliza para Σ=1
    const soma = perturbado.reduce((a, b) => a + b, 0);
    if (soma < 1e-10) continue;
    const vetorNorm = perturbado.map((v) => v / soma);

    const { rmse, fo: foNovo, passanteMistura } = _avaliarVetor(vetorNorm);
    if (foNovo < melhorFo) {
      melhorFo    = foNovo;
      melhorVetor = vetorNorm;
    }
    _insertHeap(_toCandidato(vetorNorm, rmse, passanteMistura));
  }

  const otimo = heap[0]!;

  const composicaoOtima = comporMisturaAgregados(
    otimo.proporcoes,
    curvas,
    paramsAndreasen,
    paramsEmpacotamento
  );

  const passanteOtimo   = peneirasBase.map((p) =>
    composicaoOtima.curvaMistura.passantesPorAbertura[String(p)] ?? 0
  );
  const retidaAcumOtimo = passanteOtimo.map((p) => 100 - p);
  const shilstone       = calcularShilstone(peneirasBase, retidaAcumOtimo);
  const tarantula       = verificarTarantula(peneirasBase, passanteOtimo);
  const curvasRef       = _montarCurvasReferencia(
    peneirasBase, paramsAndreasen,
    params?.paramsAIM,
    params?.funcaoObjetivo ?? "RMSE",
    paramsRosinRammler
  );

  return {
    algoritmo:        "MONTE_CARLO",
    modeloCurva:      modelo,
    funcaoObjetivo:   params?.funcaoObjetivo ?? "RMSE",
    paramsAndreasen,
    otimo,
    composicaoOtima,
    nCombinacoes,
    tempoExecucaoMs:  Date.now() - t0,
    topCandidatos:    heap,
    shilstone,
    tarantula,
    curvasReferencia: curvasRef,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL UNIFICADA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interface unificada para otimização de empacotamento de agregados.
 *
 * Seleciona automaticamente o algoritmo com base no número de agregados
 * e na resolução desejada:
 *   - N ≤ 4 e passo ≥ 2% → Grid Search (exaustivo, determinístico)
 *   - N ≥ 5 ou passo < 2% → Monte Carlo (probabilístico, escalável)
 *
 * @param curvas              Lista de curvas granulométricas dos agregados
 * @param paramsAndreasen     Parâmetros da curva ideal de Andreasen
 * @param paramsEmpacotamento Parâmetros do modelo de eficiência Mulcahy
 * @param opcoes              Opções de controle { algoritmo, passoGrid, iteracoesMC }
 *
 * @example
 * const resultado = otimizarEmpacotamento(
 *   [curvaM1, curvaM2, curvaG1, curvaG2],
 *   { q: 0.45, dMinMm: 0.075, dMaxMm: 25 },
 *   PARAMS_EMPACOTAMENTO_PADRAO,
 *   { passoGrid: 5 }
 * );
 * console.log(resultado.otimo.proporcoes);
 * // → { M1: 0.51, M2: 0, G1: 0, G2: 0.49 }
 * console.log(`RMSE: ${resultado.otimo.rmse}`);
 * console.log(`Vazios: ${resultado.otimo.teorVaziosPct}%`);
 */
/**
 * Ponto de entrada unificado para otimização de empacotamento.
 *
 * Decide automaticamente entre Grid Search (≤4 agregados) e Monte Carlo,
 * e suporta os modelos AIM, WLS e CPM diagnóstico.
 *
 * @example — UHPC com Andreasen q=0.25 e RMSE ativo:
 * otimizarEmpacotamento(
 *   [curvaMicrosilica, curvaCimento, curvaAreia],
 *   PARAMS_ANDREASEN_UHPC,
 *   PARAMS_EMPACOTAMENTO_UHPC,
 *   { modelo: "ANDREASEN", funcaoObjetivo: "RMSE_ATIVO" }
 * )
 */
export function otimizarEmpacotamento(
  curvas:               CurvaGranulometrica[],
  paramsAndreasen?:     ParamsAndreasen,
  paramsEmpacotamento?: ParamsEmpacotamento,
  opcoes?: {
    algoritmo?:           "auto" | "grid" | "monte_carlo";
    passoGrid?:           number;
    iteracoesMC?:         number;
    modelo?:              ModeloCurvaReferencia;
    paramsAIM?:           ParamsAIM;
    paramsRosinRammler?:  ParamsRosinRammler;
    funcaoObjetivo?:      FuncaoObjetivoOtimizacao;
    paramsCPM?:           ParamsCPMOtimizacao;
  }
): ResultadoOtimizacao {
  const {
    algoritmo      = "auto",
    passoGrid      = 5,
    iteracoesMC    = 50_000,
    modelo         = "ANDREASEN",
    paramsAIM,
    paramsRosinRammler,
    funcaoObjetivo = "RMSE",
    paramsCPM,
  } = opcoes ?? {};

  const andreasen = paramsAndreasen ?? PARAMS_ANDREASEN_PADRAO;
  const empack    = paramsEmpacotamento ?? PARAMS_EMPACOTAMENTO_PADRAO;

  // Decisão de algoritmo
  const usarGrid =
    algoritmo === "grid" ||
    (algoritmo === "auto" && curvas.length <= 4 && passoGrid >= 2);

  if (usarGrid) {
    return otimizarProporcoesAgregados(curvas, {
      passoPercent:        passoGrid,
      modelo,
      paramsAndreasen:     andreasen,
      paramsAIM,
      paramsRosinRammler,
      paramsEmpacotamento: empack,
      funcaoObjetivo,
      paramsCPM,
    });
  }

  return otimizarMonteCarlo(curvas, {
    nIteracoesGlobal:    iteracoesMC,
    nIteracoesLocal:     Math.floor(iteracoesMC * 0.4),
    modelo,
    paramsAndreasen:     andreasen,
    paramsAIM,
    paramsRosinRammler,
    paramsEmpacotamento: empack,
    funcaoObjetivo,
    paramsCPM,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO: WLS (WEIGHTED LEAST SQUARES) — PESOS LOG-INTERVALO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o erro WLS (Weighted Least Squares) entre a mistura e a curva ideal.
 *
 * Os pesos são proporcionais ao tamanho do intervalo logarítmico entre peneiras
 * consecutivas, normalizados para Σw_i = 1:
 *
 *   w_i ∝ log(D_i / D_{i+1})                                            … (WLS_w)
 *   WLS = √[ Σ w_i × (R_mis_i − P_ideal_i)² ]                          … (WLS)
 *
 * Peneiras mais finas têm maior resolução relativa (ex: 0.001→0.0005 mm
 * representa a mesma variação relativa que 2→1 mm) e recebem peso maior.
 * Isso é especialmente relevante para UHPC, onde a faixa ultrafina
 * determina a reatividade e o empacotamento da matriz.
 *
 * Referência: Brouwers H.J.H. & Radix H.J. (2005), Cement and Concrete Research.
 *
 * @param passanteMistura  % passante da mistura por peneira
 * @param passanteIdeal    % passante ideal por peneira
 * @param peneiras         Aberturas em mm (mesma ordem, decrescente)
 * @returns                WLS — adimensional (comparável ao RMSE)
 */
export function calcularWLS(
  passanteMistura: readonly number[],
  passanteIdeal:   readonly number[],
  peneiras:        readonly number[]
): number {
  const N = peneiras.length;
  if (N < 2) return 0;

  // Calcular pesos log-intervalo
  const pesos: number[] = [];
  for (let i = 0; i < N; i++) {
    const dSup = peneiras[i]!;
    const dInf = i + 1 < N ? peneiras[i + 1]! : dSup / 10;
    pesos.push(dSup > 0 && dInf > 0 ? Math.log(dSup / dInf) : 0.5);
  }
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const pesosNorm = pesos.map((w) => w / (somaPesos || 1));

  // WLS
  let soma = 0;
  for (let i = 0; i < N; i++) {
    const rMis  = 100 - passanteMistura[i]!;   // retida acumulada mistura
    const diff  = rMis - passanteIdeal[i]!;    // convenção Densus Engine
    soma       += pesosNorm[i]! * diff * diff;
  }

  return _r2(Math.sqrt(soma));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/** Gera a curva ideal segundo o modelo especificado */
function _gerarCurvaIdeal(
  modelo:             ModeloCurvaReferencia,
  peneiras:           number[],
  paramsAndreasen:    ParamsAndreasen,
  paramsAIM?:         ParamsAIM,
  paramsRosinRammler?: ParamsRosinRammler
): { passante: number[] } {
  const { q, dMinMm, dMaxMm } = paramsAndreasen;

  switch (modelo) {
    case "FULLER":
      return { passante: gerarCurvaFuller(peneiras, dMaxMm) };

    case "BOLOMEY": {
      const { passante } = gerarCurvaBolomey(peneiras, dMaxMm, undefined, dMinMm);
      return { passante };
    }

    case "AIM": {
      // AIM: usa paramsAIM se fornecido, senão deriva do Andreasen
      const aim = paramsAIM ?? { q, dMaxMm };
      return { passante: gerarCurvaAIM(peneiras, aim) };
    }

    case "ROSIN_RAMMLER": {
      const rr = paramsRosinRammler ?? { d63Mm: dMaxMm * 0.63, n: 1.0 };
      return { passante: gerarCurvaRosinRammler(peneiras, rr.d63Mm, rr.n) };
    }

    case "ANDREASEN":
    default: {
      const denom = dMaxMm ** q - dMinMm ** q;
      const passante = peneiras.map((d) =>
        d <= dMinMm ? 0 : ((d ** q - dMinMm ** q) / denom) * 100
      );
      return { passante };
    }
  }
}

/** Monta o conjunto completo de curvas de referência */
function _montarCurvasReferencia(
  peneiras:           number[],
  paramsAndreasen:    ParamsAndreasen,
  paramsAIM?:         ParamsAIM,
  funcaoObjetivo?:    FuncaoObjetivoOtimizacao,
  paramsRosinRammler?: ParamsRosinRammler
): CurvasReferencia {
  const { q, dMinMm, dMaxMm } = paramsAndreasen;
  const denom = dMaxMm ** q - dMinMm ** q;

  const andreasen = peneiras.map((d) =>
    _r2(d <= dMinMm ? 0 : ((d ** q - dMinMm ** q) / denom) * 100)
  );
  const fuller = gerarCurvaFuller(peneiras, dMaxMm).map(_r2);
  const { passante: bolomeyPass, A } = gerarCurvaBolomey(peneiras, dMaxMm, undefined, dMinMm);

  // AIM — Alfred Improved Model (opcional)
  const aim = paramsAIM
    ? gerarCurvaAIM(peneiras, paramsAIM).map(_r2)
    : undefined;

  // Pesos WLS log-intervalo (normalizados, soma = 1)
  // w_i ∝ log(D_{i}/D_{i+1})  (peso maior para peneiras finas)
  let pesosWLS: number[] | undefined;
  if (funcaoObjetivo === "WLS" && peneiras.length >= 2) {
    const sorted = [...peneiras].sort((a, b) => b - a); // decrescente
    const rawPesos = sorted.map((d, i) => {
      if (i === sorted.length - 1) return 0.5; // último ponto: peso simbólico
      const dSup = d;
      const dInf = sorted[i + 1]!;
      return dSup > 0 && dInf > 0 ? Math.log(dSup / dInf) : 0;
    });
    const somaRaw = rawPesos.reduce((a, b) => a + b, 0);
    pesosWLS = somaRaw > 0
      ? rawPesos.map((w) => _r4(w / somaRaw))
      : rawPesos.map(() => _r4(1 / rawPesos.length));
  }

  // Rosin-Rammler (opcional)
  const rosinRammler = paramsRosinRammler
    ? gerarCurvaRosinRammler(peneiras, paramsRosinRammler.d63Mm, paramsRosinRammler.n).map(_r2)
    : undefined;

  return {
    peneiras:  Array.from(peneiras),
    andreasen,
    fuller,
    bolomey:   bolomeyPass.map(_r2),
    bolomeyA:  _r2(A),
    aim,
    rosinRammler,
    pesosWLS,
  };
}

/** Calcula MF a partir da retida acumulada — série normal 9.5…0.15mm */
function _calcularMfDeRetidaAcum(peneiras: number[], retidaAcumPct: number[]): number {
  const serieNormal = new Set([9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15]);
  let soma = 0;
  peneiras.forEach((p, i) => { if (serieNormal.has(p)) soma += retidaAcumPct[i]!; });
  return _r2(soma / 100);
}

/** Determina DMC: menor peneira onde passante ≥ 95% */
function _calcularDmc(peneiras: number[], passantePct: number[]): number {
  for (let i = 0; i < peneiras.length; i++) {
    if ((passantePct[i] ?? 0) >= 95) return peneiras[i]!;
  }
  return peneiras[0]!;
}

/** Arredonda para 2 casas decimais */
function _r2(v: number): number { return Math.round(v * 100) / 100; }

/** Arredonda para 4 casas decimais */
function _r4(v: number): number { return Math.round(v * 10000) / 10000; }
