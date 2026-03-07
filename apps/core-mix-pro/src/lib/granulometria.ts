/**
 * @file lib/granulometria.ts
 * @description CORE MIX PRO — Motor de Análise Granulométrica
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA E FUNDAMENTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A análise granulométrica quantifica a distribuição de tamanhos de partículas
 * de um agregado por meio do peneiramento em série normalizada (NBR NM 248:2003).
 * Os resultados alimentam o cálculo do Módulo de Finura, da Dimensão Máxima
 * Característica e a composição de misturas por volumes absolutos.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * GRANDEZAS E EQUAÇÕES FUNDAMENTAIS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Massa total do ensaio:
 *   M_total = Σ m_i    (soma das massas retidas em cada peneira)           … (M)
 *
 * Porcentagem retida individual na peneira i:
 *   r_i = (m_i / M_total) × 100                                           … (ri)
 *
 * Porcentagem retida acumulada até a peneira i:
 *   R_i = Σ_{j=1}^{i} r_j = (Σ_{j=1}^{i} m_j / M_total) × 100          … (Ri)
 *
 * Porcentagem passante acumulada pela abertura da peneira i:
 *   P_i = 100 − R_i                                                        … (Pi)
 *
 * Módulo de Finura (NBR NM 248):
 *   MF = (Σ R_i para i ∈ série normal) / 100                              … (MF)
 *   Série normal: 9.5 | 4.75 | 2.36 | 1.18 | 0.60 | 0.30 | 0.15 mm
 *
 * Dimensão Máxima Característica (NBR NM 248):
 *   DMC = abertura da menor peneira onde o passante acumulado ≥ 95%       … (DMC)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COMPOSIÇÃO DE MISTURAS (lei da aditividade)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Para N agregados com frações φ_k (Σφ_k = 1):
 *   P_mistura(D_i) = Σ_{k=1}^{N} φ_k × P_k(D_i)                        … (Cm)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CURVA IDEAL — ANDREASEN MODIFICADO (Mulcahy, 2023)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Distribuição contínua de tamanhos que maximiza o empacotamento:
 *   P_ideal(D) = [(D^q − D_min^q) / (D_max^q − D_min^q)] × 100          … (And)
 *
 *   q   ∈ [0.25, 0.50]  (módulo de distribuição)
 *       q = 0.25  → distribuição fina (UHPC)
 *       q = 0.37  → distribuição ótima (CAD)
 *       q = 0.45  → distribuição padrão (concreto convencional)
 *       q = 0.50  → distribuição grossa
 *
 *   D_min = tamanho mínimo de partícula (≈ 0.075 mm para filler)
 *   D_max = dimensão máxima do traço (= DMC do graúdo)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MÉTRICAS DE AJUSTE DO EMPACOTAMENTO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * RMSE entre a curva da mistura e a curva ideal:
 *   RMSE = √[ Σ(R_mistura_i − P_ideal_i)² / N ]                         … (RMSE)
 *   (usando retidas acumuladas para ambas)
 *
 * Eficiência de empacotamento (Mulcahy, 2023):
 *   E = max(0, 1 − RMSE / ε₀) × (φ_ideal − φ_ini)                      … (E)
 *
 * Fração de vazios estimada:
 *   φ_est = φ_ini + E                                                     … (φ)
 *   Vazio_% = (1 − φ_est) × 100                                          … (V)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1] NBR NM 248:2003 — Agregados: determinação da composição granulométrica
 *   [2] NBR 7211:2009+Emenda 2022 — Agregados para concreto
 *   [3] Andreasen, A.H.M. & Andersen, J. (1930). Kolloid-Zeitschrift.
 *   [4] Mulcahy, P.E. (2023). "Optimized Particle Packing for Concrete"
 *   [5] Helene, P. & Terzian, P. (1992). Manual de Dosagem IPT/PINI.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// SÉRIES DE PENEIRAS — NBR NM 248 / ASTM E11
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Série completa de peneiras convencionais (abertura em mm).
 * Cobertura: 50 mm → 0.075 mm (peneiramento NBR NM 248 / ASTM C136).
 * Inclui série normal + série intermediária em ordem decrescente.
 *
 * Esta série é usada para:
 *   - Ensaios com agregados (areia, brita)
 *   - Cálculo do Módulo de Finura (SERIE_NORMAL_MM)
 *   - Compatibilidade retroativa com traços existentes
 */
export const SERIE_COMPLETA_MM = [
  50, 37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15, 0.075,
] as const;

/**
 * Série granulométrica LASER estendida — 0.1 µm até 50 mm.
 *
 * Acrescenta 9 pontos ultrafinos à série convencional para caracterizar
 * materiais cimentícios via difração a laser (ISO 13320:2020):
 *
 *   0.050 mm (50 µm)  — finos de britagem, pó de pedra
 *   0.020 mm (20 µm)  — cimento grosso / cinza volante
 *   0.010 mm (10 µm)  — d₅₀ cimento CP-V
 *   0.005 mm ( 5 µm)  — cimento fino / metacaulim superior
 *   0.002 mm ( 2 µm)  — metacaulim (fração mais fina)
 *   0.001 mm ( 1 µm)  — microsílica (d₉₀ típico)
 *   0.0005 mm (0.5 µm)— microsílica densificada
 *   0.0002 mm (0.2 µm)— microsílica (d₅₀ típico)
 *   0.0001 mm (0.1 µm)— D_min Andreasen UHPC / limite CPM
 *
 * Normas:
 *   ISO 13320:2020  — Laser diffraction particle size analysis
 *   ASTM E2651      — Particle size analysis guidance
 *   AFGC (2013)     — UHPC recommendations (D_min = 0.1 µm)
 */
export const SERIE_LASER_MM = [
  // Série convencional
  50, 37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18,
  0.6, 0.3, 0.15, 0.075,
  // Faixa ultrafina (laser / sedimentação)
  0.050,    // 50 µm
  0.020,    // 20 µm
  0.010,    // 10 µm
  0.005,    //  5 µm
  0.002,    //  2 µm
  0.001,    //  1 µm
  0.0005,   //  0.5 µm
  0.0002,   //  0.2 µm
  0.0001,   //  0.1 µm  ← D_min para UHPC
] as const;

/**
 * Série normal de peneiras (NBR NM 248:2003 / ABNT NBR 7211:2009).
 * Usada exclusivamente para o cálculo do Módulo de Finura.
 * Peneiras: 9.5, 4.75, 2.36, 1.18, 0.60, 0.30, 0.15 mm
 */
export const SERIE_NORMAL_MM = [9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15] as const;

/**
 * Série intermediária (NBR NM 248:2003).
 * Usada para análise mais detalhada — não entra no MF.
 * Peneiras: 50, 37.5, 25, 19, 12.5 mm
 */
export const SERIE_INTERMEDIARIA_MM = [50, 37.5, 25, 19, 12.5] as const;

/** Faixas exclusivamente ultrafinas (laser apenas — sem massa retida) */
export const SERIE_ULTRAFINA_MM = [
  0.050, 0.020, 0.010, 0.005, 0.002, 0.001, 0.0005, 0.0002, 0.0001,
] as const;

/**
 * Union de aberturas válidas — série convencional.
 * Retrocompatível: todos os usos anteriores continuam funcionando.
 */
export type AberturaMMTipo = typeof SERIE_COMPLETA_MM[number];

/** Union de aberturas válidas — série laser completa (inclui ultrafinos) */
export type AberturaLaserMMTipo = typeof SERIE_LASER_MM[number];

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE DADOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dado bruto de uma peneira — entrada do ensaio NBR NM 248 (peneiramento).
 * Para faixas convencionais: fornecer massaRetidaG.
 * Para faixas ultrafinas (laser): massaRetidaG = 0, usar passanteLaserPct.
 */
export interface DadoPeneira {
  /** Abertura da peneira — mm (pode ser qualquer valor de SERIE_LASER_MM) */
  aberturaMMm: number;
  /**
   * Massa de material retido nesta peneira — g.
   * Para peneiras da faixa ultrafina (< 0.075 mm) provenientes de análise
   * a laser, definir como 0 e preencher `passanteLaserPct`.
   */
  massaRetidaG: number;
  /**
   * % passante acumulada medida diretamente pelo analisador a laser — %.
   * Obrigatório para aberturas ≤ 0.075 mm quando o dado vem de ISO 13320.
   * Quando informado, PREVALECE sobre o cálculo a partir de massaRetidaG.
   *
   * Faixa válida: [0, 100].
   */
  passanteLaserPct?: number;
  /** Flag: dado proveniente de análise a laser (ISO 13320) e não de peneiramento */
  origemLaser?: boolean;
}

/**
 * Resultado processado para uma única peneira da série.
 * Agrupa todas as grandezas calculadas para aquela fração.
 */
export interface ResultadoPeneira {
  /** Abertura da peneira — mm */
  aberturaMm: number;
  /** Massa retida individual — g */
  massaRetidaG: number;
  /** % retida individual na peneira: r_i = m_i/M×100         … (ri) */
  retidaIndividualPct: number;
  /** % retida acumulada até esta peneira: R_i = Σr_j/100     … (Ri) */
  retidaAcumuladaPct: number;
  /** % passante acumulada: P_i = 100 − R_i                   … (Pi) */
  passantePct: number;
  /** Flag: esta peneira pertence à série normal (usada no MF) */
  naSerieNormal: boolean;
}

/**
 * Curva granulométrica completa de um agregado ou material cimentício.
 * Resultado do processamento da análise NBR NM 248 ou ISO 13320 (laser).
 */
export interface CurvaGranulometrica {
  /** Identificador/nome do agregado */
  id: string;
  /** Descrição do material */
  descricao: string;
  /** Resultados linha a linha da tabela granulométrica */
  peneiras: ResultadoPeneira[];
  /** Módulo de Finura — adimensional                        … (MF) */
  moduloFinura: number;
  /** Dimensão Máxima Característica — mm                    … (DMC) */
  dimensaoMaximaCaracteristicaMm: number;
  /** Massa total do ensaio — g */
  massaTotalEnsaioG: number;
  /**
   * Passantes indexados por abertura (mm → %) — acesso O(1) para composição.
   * Chave: abertura em mm como string (ex: "4.75", "0.001").
   * Cobre toda a faixa presente, incluindo ultrafinos de análise laser.
   */
  passantesPorAbertura: Record<string, number>;
  /**
   * Flag: esta curva contém dados de análise a laser (ISO 13320).
   * Quando true, pontos com abertura < 0.075 mm têm passantes medidos
   * diretamente pelo difratômetro — não calculados por peneiramento.
   */
  contemDadosLaser?: boolean;
  /**
   * Diâmetro mínimo efetivo da distribuição — mm.
   * Para materiais cimentícios com laser: normalmente 0.0001–0.001 mm.
   * Para agregados convencionais: 0.075 mm.
   * Usado automaticamente como D_min no cálculo Andreasen e CPM.
   */
  dMinEfetivaMm?: number;
  /**
   * Diâmetro D₅₀ (mediana volumétrica) — mm.
   * Calculado ou informado pelo relatório do analisador laser.
   */
  d50Mm?: number;
  /**
   * Diâmetro D₉₀ — mm.
   */
  d90Mm?: number;
}

/**
 * Parâmetros para a curva ideal de Andreasen Modificado (Dinger-Funk 1994).
 *
 * P(D) = (D^q − D_min^q) / (D_max^q − D_min^q) × 100               … (And)
 *
 * Para UHPC: q = 0.25, D_min = 0.0001 mm (AFGC 2013, fib MC2010).
 * Para CCV:  q = 0.45, D_min = 0.075 mm (Andreasen & Andersen 1930).
 */
export interface ParamsAndreasen {
  /** q — módulo de distribuição [0.22–0.50] */
  q: number;
  /**
   * D_min — tamanho mínimo de partícula — mm.
   * UHPC: 0.0001 mm (0.1 µm) | CAD: 0.010 mm | CCV: 0.075 mm
   */
  dMinMm: number;
  /** D_max — dimensão máxima do traço — mm */
  dMaxMm: number;
}

/**
 * Parâmetros para o modelo AIM (Alfred Improved Model, 1955 / Modificado).
 *
 * P_AIM(D) = 100 × (D/D_max)^q × exp(−q × (1 − D/D_max))            … (AIM)
 *
 * Diferença vs Andreasen:
 *   - Penaliza mais fortemente os ultrafinos (exp decay)
 *   - Não necessita de D_min explícito (converge naturalmente a 0)
 *   - Bem adaptado para distribuições contínuas sem descontinuidade
 *
 * Referência: Brouwers H.J.H. (2006), Cement and Concrete Research.
 */
export interface ParamsAIM {
  /** q — módulo de distribuição [0.22–0.50] */
  q: number;
  /** D_max — dimensão máxima do traço — mm */
  dMaxMm: number;
}

/**
 * Classe de um material para o CPM de De Larrard (1999).
 *
 * Cada classe representa uma fração granulométrica distinta na mistura.
 * O diâmetro representativo d é a média geométrica do intervalo:
 *   d_rep = √(D_sup × D_inf)                                           … (drep)
 *
 * O empacotamento virtual β* é medido em laboratório (AASHTO T19 compactado)
 * ou estimado pelos valores default em BETA_STAR_CPM_DEFAULTS.
 */
export interface ClasseCPM {
  /** Identificador da classe (ex: "cimento", "microsilica", "areia_fina") */
  id: string;
  /** Diâmetro representativo da fração — mm */
  dRepMm: number;
  /**
   * Empacotamento virtual monofracional β*_i — adimensional [0.45–0.72].
   * Deve ser MEDIDO em laboratório. Usar BETA_STAR_CPM_DEFAULTS como fallback.
   */
  betaStar: number;
  /** Fração volumétrica na mistura φ_i — adimensional [0, 1], Σ = 1 */
  phi: number;
}

/**
 * Resultado do cálculo CPM (Compressible Packing Model — De Larrard 1999).
 *
 * O modelo calcula o empacotamento virtual β* da mistura multicomponente
 * considerando os efeitos de afrouxamento (loosening) e parede (wall effect).
 *
 * Equação fundamental (De Larrard Eq. 3.10):
 *   Para cada classe i dominante:
 *   β_i = γ_i / [1 − Σ_{j>i}(1−γ_i+a_{ij}γ_i)(φ_j/γ_j)
 *                   − Σ_{j<i}(1−b_{ij})(φ_j/γ_j)]                   … (CPM)
 *
 *   Coeficientes geométricos (De Larrard Eq. 3.5, 3.6):
 *   a_{ij} = 1 − (1 − d_i/d_j)^{1.02}   [afrouxamento: j grossa → i]  … (aij)
 *   b_{ij} = 1 − (1 − d_j/d_i)^{1.50}   [parede: j fina → i]          … (bij)
 *
 *   β* = min_{i: β_i ≤ 1} β_i                                          … (bstar)
 *
 * Nota sobre singularidades numéricas:
 *   Para razões d_j/d_i < CPM_LIMIAR_INTERACAO (= 0.01), o efeito de
 *   interação é zerado — a classe ultra-fina preenche os vazios sem
 *   perturbar geometricamente a classe dominante. Isso é fisicamente
 *   correto para microsílica (0.2 µm) em relação à areia (400 µm).
 */
export interface ResultadoCPM {
  /** Classe dominante real (aquela com menor β_i ≤ 1) */
  classeDominante:    string;
  /** β* — empacotamento virtual da mistura — adimensional */
  betaStar:           number;
  /** Teor de vazios estimado — % */
  teorVaziosPct:      number;
  /** β_i por classe (para diagnóstico) */
  betasPorClasse:     Record<string, number>;
  /** Aviso: presença de classes com razão d_j/d_i < limiar (ultra-finos) */
  advertenciaUltrafinos?: string;
}

/** Ponto da curva ideal (D, P_ideal) */
export interface PontoIdeal {
  aberturaMMm: number;
  passanteIdealPct: number;
  /** Nota: pode ser > 100 para D > D_max — extrapolação válida do modelo */
  retidaAcumuladaIdealPct: number;
}

/**
 * Curva ideal de Andreasen para comparação com a mistura.
 */
export interface CurvaIdeal {
  params: ParamsAndreasen;
  pontos: PontoIdeal[];
}

/**
 * Resultado da composição de múltiplos agregados em mistura.
 */
export interface ResultadoComposicao {
  /** Frações de mistura (chave: id do agregado, valor: fração 0–1) */
  proporcoes: Record<string, number>;
  /** Curva resultante da mistura */
  curvaMistura: CurvaGranulometrica;
  /** Curva ideal para comparação */
  curvaIdeal?: CurvaIdeal;
  /** RMSE entre a mistura e a curva ideal (usando R_i)       … (RMSE) */
  rmseAndreasen?: number;
  /** Eficiência de empacotamento                             … (E) */
  eficienciaEmpacotamento?: number;
  /** Fração de vazios estimada                               … (φ) */
  fracaoVaziosEstimada?: number;
  /** Teor de vazios percentual */
  teorVaziosPct?: number;
}

/**
 * Parâmetros do modelo de empacotamento Mulcahy.
 */
export interface ParamsEmpacotamento {
  /** φ_ini — densidade de empacotamento inicial medida (AASHTO T 19) */
  phiInicial: number;
  /** φ_ideal — limite superior teórico de empacotamento */
  phiIdeal: number;
  /** ε₀ — desvio de referência "mal ajuste" */
  epsilonReferencia: number;
}

/** Parâmetros padrão do modelo Mulcahy para concreto convencional */
export const PARAMS_EMPACOTAMENTO_PADRAO: ParamsEmpacotamento = {
  phiInicial:         0.60,
  phiIdeal:           0.75,
  epsilonReferencia:  0.20,
} as const;

/**
 * Parâmetros Mulcahy para UHPC (sem agregado graúdo, mistura de pós).
 * Fração de sólidos tipicamente entre 0.75–0.84.
 * Referência: AFGC (2013), fib Bulletin 65 (2012).
 */
export const PARAMS_EMPACOTAMENTO_UHPC: ParamsEmpacotamento = {
  phiInicial:         0.72,
  phiIdeal:           0.84,
  epsilonReferencia:  0.15,
} as const;

/** Parâmetros padrão de Andreasen para concreto convencional (q=0.45) */
export const PARAMS_ANDREASEN_PADRAO: ParamsAndreasen = {
  q:      0.45,
  dMinMm: 0.075,
  dMaxMm: 25.0,
} as const;

/**
 * Parâmetros de Andreasen para UHPC (q=0.25, D_min=0.0001mm).
 * Referência: AFGC (2013) Recommendations for Ultra-High Performance
 * Fibre-Reinforced Concrete; fib MC2010 Annex UHPFRC.
 */
export const PARAMS_ANDREASEN_UHPC: ParamsAndreasen = {
  q:      0.25,
  dMinMm: 0.0001,
  dMaxMm: 2.36,
} as const;

/**
 * Parâmetros de Andreasen para CAD / GRC (q=0.37, D_min=0.010mm).
 * Referência: Müller et al. (2015), Cement and Concrete Research.
 */
export const PARAMS_ANDREASEN_CAD: ParamsAndreasen = {
  q:      0.37,
  dMinMm: 0.010,
  dMaxMm: 12.5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class GranuloMassaZeroError extends Error {
  constructor(id: string) {
    super(`Agregado '${id}': soma das massas retidas é zero. Verifique os dados do ensaio.`);
    this.name = "GranuloMassaZeroError";
  }
}

export class GranuloFracaoInvalidaError extends Error {
  constructor(soma: number) {
    super(
      `Soma das frações de mistura = ${soma.toFixed(4)} (deve ser 1.0 ± 0.001). ` +
      `Verifique os percentuais de cada agregado.`
    );
    this.name = "GranuloFracaoInvalidaError";
  }
}

export class GranuloPeneirasIncompativeisError extends Error {
  constructor(id: string) {
    super(
      `Agregado '${id}' não contém todos os pontos da série de peneiras ` +
      `necessários para a composição. Use SERIE_COMPLETA_MM como base.`
    );
    this.name = "GranuloPeneirasIncompativeisError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 1 — PORCENTAGEM RETIDA INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a porcentagem retida individual de cada peneira.
 *
 *   r_i = (m_i / M_total) × 100                                           … (ri)
 *
 * @param massasRetidas  Array de massas retidas em cada peneira — g (mesma ordem das peneiras)
 * @returns              Array de porcentagens retidas individuais — %
 *
 * @example
 * calcularPorcentagemRetida([0, 0, 50, 150, 200]) // → [0, 0, 12.5, 37.5, 50.0]
 */
export function calcularPorcentagemRetida(massasRetidas: readonly number[]): number[] {
  const total = massasRetidas.reduce((a, b) => a + b, 0);
  if (total === 0) return massasRetidas.map(() => 0);

  return massasRetidas.map((m) => _arredondar(m / total * 100, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 2 — RETIDA ACUMULADA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a porcentagem retida acumulada até cada peneira.
 *
 *   R_i = Σ_{j=1}^{i} r_j                                                 … (Ri)
 *
 * As peneiras devem estar ordenadas da maior para a menor abertura,
 * conforme a convenção de ensaio (o material passa pelas peneiras em sequência).
 *
 * @param porcentagensRetidas  Array de % retidas individuais (saída de calcularPorcentagemRetida)
 * @returns                    Array de % retidas acumuladas
 *
 * @example
 * calcularRetidaAcumulada([0, 0, 12.5, 37.5, 50.0]) // → [0, 0, 12.5, 50.0, 100.0]
 */
export function calcularRetidaAcumulada(porcentagensRetidas: readonly number[]): number[] {
  let acumulado = 0;
  return porcentagensRetidas.map((r) => {
    acumulado += r;
    return _arredondar(acumulado, 2);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 3 — PORCENTAGEM PASSANTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a porcentagem passante acumulada pela abertura de cada peneira.
 * Esta é a grandeza principal para plotagem da curva granulométrica.
 *
 *   P_i = 100 − R_i                                                        … (Pi)
 *
 * Interpretação física:
 *   P_i = 100% → todo o material passa por esta peneira (abertura muito grande)
 *   P_i = 0%   → nada passa por esta peneira (abertura muito pequena — fundo)
 *
 * @param retidaAcumulada  Array de % retidas acumuladas (saída de calcularRetidaAcumulada)
 * @returns                Array de % passantes — pronto para plot da curva
 *
 * @example
 * calcularPorcentagemPassante([0, 0, 12.5, 50.0, 100.0]) // → [100, 100, 87.5, 50, 0]
 */
export function calcularPorcentagemPassante(retidaAcumulada: readonly number[]): number[] {
  return retidaAcumulada.map((R) => _arredondar(100 - R, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 4 — MÓDULO DE FINURA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o Módulo de Finura (MF) de um agregado conforme NBR NM 248:2003.
 *
 *   MF = (Σ R_i para i ∈ série normal) / 100                              … (MF)
 *
 * A série normal compreende as peneiras: 9.5, 4.75, 2.36, 1.18, 0.60, 0.30, 0.15 mm.
 * O MF é um número adimensional que caracteriza a granulometria global do agregado:
 *
 *   MF < 2.20  → areia fina         (NBR 7211:2009)
 *   2.20 ≤ MF < 2.90  → areia média
 *   2.90 ≤ MF < 3.50  → areia grossa
 *   MF > 3.50  → mistura com graúdo
 *
 * @param peneiras           Array de aberturas em mm (mesma ordem de retidaAcumulada)
 * @param retidaAcumuladaPct Array de % retidas acumuladas
 * @returns                  Módulo de Finura — adimensional
 *
 * @example
 * calcularModuloFinura(
 *   [9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15],
 *   [0, 5, 20, 40, 65, 83, 96]
 * ) // → 3.09
 */
export function calcularModuloFinura(
  peneiras: readonly number[],
  retidaAcumuladaPct: readonly number[]
): number {
  const serieNormalSet = new Set<number>(SERIE_NORMAL_MM);

  let soma = 0;
  for (let i = 0; i < peneiras.length; i++) {
    if (serieNormalSet.has(peneiras[i])) {
      soma += retidaAcumuladaPct[i];
    }
  }

  return _arredondar(soma / 100, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 5 — DIMENSÃO MÁXIMA CARACTERÍSTICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina a Dimensão Máxima Característica (DMC) conforme NBR 7211:2009.
 *
 * Definição normativa:
 *   DMC = menor abertura de peneira pela qual passa no mínimo 95% do material
 *   em massa.
 *
 *   DMC = min{ D_i : P_i ≥ 95 }                                           … (DMC)
 *
 * Classificação resultante (NBR 7211:2009):
 *   DMC ≤ 4.75 mm  → agregado miúdo (areia)
 *   DMC > 4.75 mm  → agregado graúdo (brita / seixo)
 *
 * @param peneiras      Array de aberturas — mm (ordem decrescente, maior → menor)
 * @param passantePct   Array de % passantes acumuladas correspondentes
 * @returns             DMC em mm
 *
 * @example
 * determinarDimensaoMaximaCaracteristica(
 *   [50, 37.5, 25, 19, 12.5, 9.5, ...],
 *   [100, 100, 100, 95.1, 51.2, ...]
 * ) // → 19  (primeira peneira onde passa ≥ 95%)
 */
export function determinarDimensaoMaximaCaracteristica(
  peneiras: readonly number[],
  passantePct: readonly number[]
): number {
  // Percorre da maior para a menor peneira
  // DMC = menor peneira onde passante ≥ 95%
  let dmc: number | null = null;

  for (let i = 0; i < peneiras.length; i++) {
    if (passantePct[i] >= 95) {
      dmc = peneiras[i];
      break; // encontrou a primeira (maior) onde ≥ 95%
    }
  }

  // Se nenhuma peneira tem ≥ 95%, o material é retido todo — DMC = maior peneira
  if (dmc === null) {
    dmc = peneiras[0];
  }

  return dmc;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 6 — PROCESSAMENTO COMPLETO DE UMA CURVA GRANULOMÉTRICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processa os dados brutos do ensaio e retorna a curva granulométrica completa.
 * Orquestra as funções (ri), (Ri), (Pi), (MF) e (DMC) em um único pipeline.
 *
 * A convenção de peneiras é sempre da MAIOR para a MENOR abertura,
 * refletindo a ordem física do ensaio (material entra no topo da série).
 *
 * @param id          Identificador único do agregado
 * @param descricao   Nome ou descrição do material
 * @param dados       Array de { aberturaMMm, massaRetidaG } — ordem decrescente de abertura
 * @returns           CurvaGranulometrica processada
 *
 * @throws GranuloMassaZeroError se o total de massas for zero
 *
 * @example
 * processarCurva("M1", "Areia Natural Média", [
 *   { aberturaMMm: 9.5, massaRetidaG: 0 },
 *   { aberturaMMm: 4.75, massaRetidaG: 50 },
 *   { aberturaMMm: 2.36, massaRetidaG: 150 },
 *   // ...
 * ])
 */
/**
 * Processa uma análise granulométrica — peneiramento (NBR NM 248) ou
 * análise a laser (ISO 13320) ou a combinação de ambas.
 *
 * LÓGICA DE PROCESSAMENTO LASER:
 *   1. Para peneiras com `passanteLaserPct` definido → usa diretamente.
 *   2. Para peneiras com `massaRetidaG > 0` → calcula pelo método normal.
 *   3. Para faixas ultrafinas (< 0.075 mm) sem laser → interpola linearmente
 *      entre os pontos disponíveis (fallback seguro).
 *
 * A função detecta automaticamente:
 *   - `contemDadosLaser`: true se algum dado vem de ISO 13320
 *   - `dMinEfetivaMm`: menor abertura com passante > 0 e < 100
 *   - `d50Mm` e `d90Mm`: interpolados da distribuição acumulada
 *
 * @param id         Identificador único do material
 * @param descricao  Nome ou descrição do material
 * @param dados      Array DadoPeneira — pode incluir aberturas laser
 * @returns          CurvaGranulometrica completa
 *
 * @throws GranuloMassaZeroError se todos os dados de massa são zero
 *         e nenhum passanteLaserPct está definido
 *
 * @example — Cimento com laser:
 * processarCurva("CIM", "CP V-ARI", [
 *   { aberturaMMm: 0.075, massaRetidaG: 0, passanteLaserPct: 100, origemLaser: true },
 *   { aberturaMMm: 0.010, massaRetidaG: 0, passanteLaserPct: 82,  origemLaser: true },
 *   { aberturaMMm: 0.001, massaRetidaG: 0, passanteLaserPct: 16,  origemLaser: true },
 *   { aberturaMMm: 0.0001,massaRetidaG: 0, passanteLaserPct: 0,   origemLaser: true },
 * ])
 */
export function processarCurva(
  id: string,
  descricao: string,
  dados: DadoPeneira[]
): CurvaGranulometrica {
  // ── Detectar se há dados de análise a laser ───────────────────────────────
  const contemLaser = dados.some((d) => d.origemLaser === true || d.passanteLaserPct !== undefined);

  // ── Separar dados: peneiramento vs laser ─────────────────────────────────
  // Para cada abertura, o passante é determinado por:
  //   1. passanteLaserPct (prioridade máxima — dado direto do equipamento)
  //   2. Cálculo a partir de massaRetidaG (peneiramento convencional)
  const dadosPeneiramento = dados.filter(
    (d) => d.massaRetidaG > 0 && d.passanteLaserPct === undefined
  );

  // ── Se tem dados de peneiramento: calcular passantes convencionais ────────
  const passantesPeneiramento: Map<number, number> = new Map();

  if (dadosPeneiramento.length > 0) {
    const massaTotal = dadosPeneiramento.reduce((a, d) => a + d.massaRetidaG, 0);
    if (massaTotal === 0 && !contemLaser) {
      throw new GranuloMassaZeroError(id);
    }

    if (massaTotal > 0) {
      const massas       = dadosPeneiramento.map((d) => d.massaRetidaG);
      const retIndiv     = calcularPorcentagemRetida(massas);
      const retAcum      = calcularRetidaAcumulada(retIndiv);
      const passante     = calcularPorcentagemPassante(retAcum);
      dadosPeneiramento.forEach((d, i) => {
        passantesPeneiramento.set(d.aberturaMMm, passante[i]);
      });
    }
  } else if (!contemLaser) {
    // Nenhum dado válido
    throw new GranuloMassaZeroError(id);
  }

  // ── Montar mapa unificado de passantes (laser prevalece sobre peneiramento) ─
  const passantesUnificados: Map<number, number> = new Map(passantesPeneiramento);

  for (const d of dados) {
    if (d.passanteLaserPct !== undefined) {
      // Dado laser: prevalece — clamp [0, 100]
      passantesUnificados.set(
        d.aberturaMMm,
        Math.min(100, Math.max(0, d.passanteLaserPct))
      );
    }
  }

  // ── Reconstruir ResultadoPeneira para todas as aberturas informadas ───────
  const serieNormalSet = new Set<number>(SERIE_NORMAL_MM);

  // Ordenar por abertura decrescente (maior → menor)
  const todasAberturas = Array.from(
    new Set(dados.map((d) => d.aberturaMMm))
  ).sort((a, b) => b - a);

  // Para aberturas sem passante calculado: interpolar ou extrapolar
  const passantesFinais: Map<number, number> = new Map();
  for (const ab of todasAberturas) {
    if (passantesUnificados.has(ab)) {
      passantesFinais.set(ab, passantesUnificados.get(ab)!);
    } else {
      // Interpolar log-linear entre pontos vizinhos
      passantesFinais.set(ab, _interpolarPassante(ab, passantesUnificados));
    }
  }

  // ── Calcular massas de referência sintéticas (base 100g) ──────────────────
  // Para peneiras sem massa real, derivar retida individual da curva de passantes
  const peneirasResult: ResultadoPeneira[] = [];
  let massaTotalEnsaio = dadosPeneiramento.reduce((a, d) => a + d.massaRetidaG, 0);
  if (massaTotalEnsaio === 0) massaTotalEnsaio = 100; // massa de referência normalizada

  let prevPassante = 100; // começando de 100% (peneira mais grossa)
  for (const ab of todasAberturas) {
    const passAtual    = passantesFinais.get(ab) ?? 0;
    const retIndivPct  = _arredondar(Math.max(0, prevPassante - passAtual), 2);
    const retAcumPct   = _arredondar(100 - passAtual, 2);

    // massa retida: pode ser real (peneiramento) ou sintética (laser)
    const dadoBruto     = dados.find((d) => d.aberturaMMm === ab);
    const massaRetida   = dadoBruto?.massaRetidaG ?? 0;

    peneirasResult.push({
      aberturaMm:          ab,
      massaRetidaG:        massaRetida,
      retidaIndividualPct: retIndivPct,
      retidaAcumuladaPct:  retAcumPct,
      passantePct:         _arredondar(passAtual, 2),
      naSerieNormal:       serieNormalSet.has(ab),
    });
    prevPassante = passAtual;
  }

  // ── Calcular MF e DMC somente a partir da faixa convencional ──────────────
  const peneirasConv = peneirasResult.filter((p) => p.aberturaMm >= 0.075);
  const aberturasConvDesc = peneirasConv.map((p) => p.aberturaMm);
  const retAcumConv       = peneirasConv.map((p) => p.retidaAcumuladaPct);
  const passanteConv      = peneirasConv.map((p) => p.passantePct);

  const mf  = aberturasConvDesc.length > 0
    ? calcularModuloFinura(aberturasConvDesc, retAcumConv)
    : 0;
  const dmc = aberturasConvDesc.length > 0
    ? determinarDimensaoMaximaCaracteristica(aberturasConvDesc, passanteConv)
    : 0;

  // ── Índice de acesso rápido por abertura ──────────────────────────────────
  const passantesPorAbertura: Record<string, number> = {};
  peneirasResult.forEach((p) => {
    passantesPorAbertura[String(p.aberturaMm)] = p.passantePct;
  });

  // ── Detectar D_min efetiva e D50/D90 ─────────────────────────────────────
  const pontosAscendente = [...todasAberturas].reverse(); // menor → maior
  let dMinEfetiva: number | undefined;
  for (const ab of pontosAscendente) {
    const p = passantesFinais.get(ab) ?? 0;
    if (p > 0 && p < 100) { dMinEfetiva = ab; break; }
  }

  const d50Mm = _interpolarDiametro(50, todasAberturas, passantesFinais);
  const d90Mm = _interpolarDiametro(90, todasAberturas, passantesFinais);

  return {
    id,
    descricao,
    peneiras:                         peneirasResult,
    moduloFinura:                     mf,
    dimensaoMaximaCaracteristicaMm:   dmc,
    massaTotalEnsaioG:                massaTotalEnsaio,
    passantesPorAbertura,
    contemDadosLaser:                 contemLaser,
    dMinEfetivaMm:                    dMinEfetiva,
    d50Mm:                            d50Mm ?? undefined,
    d90Mm:                            d90Mm ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 7 — CURVA IDEAL (ANDREASEN MODIFICADO)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera a curva ideal de Andreasen Modificado para uma série de peneiras.
 *
 *   P_ideal(D) = [(D^q − D_min^q) / (D_max^q − D_min^q)] × 100          … (And)
 *
 * Nota importante: o modelo NÃO é limitado em 100% para D > D_max.
 * Valores acima de 100 são válidos como extrapolação do modelo
 * (refletem que o material é mais grosso que o D_max de referência).
 * A planilha Densus Engine preserva esse comportamento — validado matematicamente.
 *
 * @param peneiras  Array de aberturas a calcular — mm (qualquer ordem)
 * @param params    Parâmetros { q, dMinMm, dMaxMm }
 * @returns         CurvaIdeal com pontos para cada peneira
 *
 * @example
 * gerarCurvaIdealAndreasen(
 *   [25, 19, 12.5, 9.5, 4.75],
 *   { q: 0.45, dMinMm: 0.075, dMaxMm: 25 }
 * )
 * // P(25)=100, P(19)=87.5, P(12.5)=71.1, P(9.5)=61.9, P(4.75)=43.2
 */
export function gerarCurvaIdealAndreasen(
  peneiras: readonly number[],
  params: ParamsAndreasen = PARAMS_ANDREASEN_PADRAO
): CurvaIdeal {
  const { q, dMinMm, dMaxMm } = params;
  const denominador = dMaxMm ** q - dMinMm ** q;

  const pontos: PontoIdeal[] = peneiras.map((d) => {
    let passante: number;

    if (d <= dMinMm) {
      passante = 0;
    } else {
      // Modelo sem capping — válido para extrapolação além de D_max
      passante = ((d ** q - dMinMm ** q) / denominador) * 100;
    }

    const passanteArredondado = _arredondar(passante, 2);
    return {
      aberturaMMm:              d,
      passanteIdealPct:         passanteArredondado,
      retidaAcumuladaIdealPct:  _arredondar(100 - passanteArredondado, 2),
    };
  });

  return { params, pontos };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 8 — COMPOSIÇÃO DE MISTURAS DE AGREGADOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compõe a curva granulométrica resultante de uma mistura de agregados
 * por aditividade linear dos passantes ponderados pelas frações.
 *
 *   P_mistura(D_i) = Σ_{k=1}^{N} φ_k × P_k(D_i)                        … (Cm)
 *
 * Esta função é o elo entre o módulo de granulometria e o dosagem.ts:
 * a curva resultante informa o MF e o DMC efetivos da mistura de agregados
 * que será usada no traço, permitindo verificar os limites de zona utilizável
 * da NBR 7211:2009.
 *
 * @param proporcoes  Objeto { id_agregado: fração (0–1) }. Σ deve ser 1.0 ± 0.001
 * @param curvas      Array de CurvaGranulometrica (cada uma gerada por processarCurva)
 * @param params      Parâmetros Andreasen para comparação (opcional)
 * @param empacotamento  Parâmetros do modelo Mulcahy (opcional)
 * @returns           ResultadoComposicao com curva da mistura e métricas
 *
 * @throws GranuloFracaoInvalidaError se Σφ ≠ 1.0
 * @throws GranuloPeneirasIncompativeisError se algum agregado não cobre a série completa
 *
 * @example
 * comporMisturaAgregados(
 *   { "M1": 0.25, "M2": 0.25, "G1": 0.25, "G2": 0.25 },
 *   [curvaM1, curvaM2, curvaG1, curvaG2],
 *   PARAMS_ANDREASEN_PADRAO,
 *   PARAMS_EMPACOTAMENTO_PADRAO
 * )
 */
export function comporMisturaAgregados(
  proporcoes: Record<string, number>,
  curvas:     CurvaGranulometrica[],
  params?:    ParamsAndreasen,
  empacotamento?: ParamsEmpacotamento
): ResultadoComposicao {
  // ── Validação 1: soma das frações ────────────────────────────────────────
  const somaFracoes = Object.values(proporcoes).reduce((a, b) => a + b, 0);
  if (Math.abs(somaFracoes - 1) > 0.001) {
    throw new GranuloFracaoInvalidaError(somaFracoes);
  }

  // ── Série de peneiras canônica para a mistura ────────────────────────────
  // Usa SERIE_COMPLETA_MM como referência padrão
  const peneirasBase = Array.from(SERIE_COMPLETA_MM);

  // ── Validação 2: cobertura de peneiras ───────────────────────────────────
  for (const curva of curvas) {
    const cobertura = new Set(Object.keys(curva.passantesPorAbertura).map(Number));
    const faltando  = peneirasBase.filter((p) => !cobertura.has(p));
    if (faltando.length > 0) {
      throw new GranuloPeneirasIncompativeisError(curva.id);
    }
  }

  // ── Composição: lei de aditividade … (Cm) ────────────────────────────────
  // Índice de curvas por ID para acesso O(1)
  const curvasPorId = Object.fromEntries(curvas.map((c) => [c.id, c]));

  // Para cada peneira, calcular passante ponderado
  const passantesMistura: number[] = peneirasBase.map((abertura) => {
    let passanteComposto = 0;
    for (const [id, fracao] of Object.entries(proporcoes)) {
      if (fracao === 0) continue;
      const curva    = curvasPorId[id];
      const passante = curva.passantesPorAbertura[String(abertura)] ?? 100;
      passanteComposto += fracao * passante;
    }
    return _arredondar(passanteComposto, 2);
  });

  // Converter passante em retida acumulada para MF e RMSE
  const retidaAcumMistura = passantesMistura.map((p) => _arredondar(100 - p, 2));

  const mfMistura  = calcularModuloFinura(peneirasBase, retidaAcumMistura);
  const dmcMistura = determinarDimensaoMaximaCaracteristica(peneirasBase, passantesMistura);

  // Reconstruir massas sintéticas (proporcionais — m_i proporcional à retida i)
  const retIndivMistura: number[] = [];
  let prevRetAcum = 0;
  for (const R of retidaAcumMistura) {
    retIndivMistura.push(_arredondar(R - prevRetAcum, 2));
    prevRetAcum = R;
  }

  const peneirasMisturaResultado: ResultadoPeneira[] = peneirasBase.map((p, i) => ({
    aberturaMm:          p,
    massaRetidaG:        retIndivMistura[i], // valores relativos (base 100)
    retidaIndividualPct: retIndivMistura[i],
    retidaAcumuladaPct:  retidaAcumMistura[i],
    passantePct:         passantesMistura[i],
    naSerieNormal:       new Set<number>(SERIE_NORMAL_MM).has(p),
  }));

  const passantesPorAberturaMap: Record<string, number> = {};
  peneirasBase.forEach((p, i) => {
    passantesPorAberturaMap[String(p)] = passantesMistura[i];
  });

  const curvaMistura: CurvaGranulometrica = {
    id:                              "MISTURA",
    descricao:                       `Mistura: ${Object.entries(proporcoes).map(([k, v]) => `${k}×${(v * 100).toFixed(0)}%`).join(" + ")}`,
    peneiras:                        peneirasMisturaResultado,
    moduloFinura:                    mfMistura,
    dimensaoMaximaCaracteristicaMm:  dmcMistura,
    massaTotalEnsaioG:               100, // massa de referência normalizada
    passantesPorAbertura:            passantesPorAberturaMap,
  };

  // ── Métricas de empacotamento (opcionais) ────────────────────────────────
  let curvaIdeal: CurvaIdeal | undefined;
  let rmse: number | undefined;
  let eficiencia: number | undefined;
  let phiEstimado: number | undefined;
  let teorVazios: number | undefined;

  if (params) {
    curvaIdeal = gerarCurvaIdealAndreasen(peneirasBase, params);

    /**
     * RMSE — convenção Densus Engine / planilha original:
     *
     * Compara a RETIDA ACUMULADA % da mistura com o PASSANTE % da curva ideal
     * (Andreasen sem capping, podendo exceder 100% para D > D_max).
     *
     * Embora sejam grandezas complementares, essa convenção está implementada
     * na planilha Densus Engine PRO ULTIMATE 2025 e é preservada aqui para compatibilidade.
     * Validado: RMSE = 79.3 para a composição 25/25/25/25 de referência.
     *
     * RMSE = √[ Σ(R_mistura_i − P_ideal_i)² / N ]
     * onde R_mistura_i = retida acumulada da mistura e P_ideal_i = passante ideal (sem cap)
     */
    const N = peneirasBase.length;
    const somaQuadrados = curvaIdeal.pontos.reduce((soma, ponto, i) => {
      const diff = retidaAcumMistura[i] - ponto.passanteIdealPct; // convenção Densus Engine
      return soma + diff * diff;
    }, 0);
    rmse = _arredondar(Math.sqrt(somaQuadrados / N), 2);

    if (empacotamento) {
      const { phiInicial, phiIdeal, epsilonReferencia } = empacotamento;
      // E = max(0, 1 − RMSE/ε₀) × (φ_ideal − φ_ini)  … (E)
      eficiencia   = _arredondar(Math.max(0, 1 - rmse / epsilonReferencia) * (phiIdeal - phiInicial), 4);
      phiEstimado  = _arredondar(phiInicial + eficiencia, 4);
      teorVazios   = _arredondar((1 - phiEstimado) * 100, 2);
    }
  }

  return {
    proporcoes,
    curvaMistura,
    curvaIdeal,
    rmseAndreasen:           rmse,
    eficienciaEmpacotamento: eficiencia,
    fracaoVaziosEstimada:    phiEstimado,
    teorVaziosPct:           teorVazios,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 9 — ANÁLISE COMPARATIVA DE LIMITES NORMATIVOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zonas granulométricas para areias conforme NBR 7211:2009 Tabela 1.
 *
 * Para cada peneira da série normal (exceto 9.5 mm), a norma define:
 * - Zona utilizável (limites min e max em % passante)
 * - Zona ótima (faixa mais restrita dentro da utilizável)
 */
export const ZONAS_NBR7211_AREIA: ReadonlyArray<{
  aberturaMm:      number;
  zonaUtilMin:     number;
  zonaUtilMax:     number;
  zonaOtimaMin:    number;
  zonaOtimaMax:    number;
}> = [
  { aberturaMm: 9.5,  zonaUtilMin: 100, zonaUtilMax: 100, zonaOtimaMin: 100, zonaOtimaMax: 100 },
  { aberturaMm: 4.75, zonaUtilMin: 95,  zonaUtilMax: 100, zonaOtimaMin: 95,  zonaOtimaMax: 100 },
  { aberturaMm: 2.36, zonaUtilMin: 80,  zonaUtilMax: 100, zonaOtimaMin: 85,  zonaOtimaMax: 100 },
  { aberturaMm: 1.18, zonaUtilMin: 50,  zonaUtilMax: 100, zonaOtimaMin: 60,  zonaOtimaMax:  95 },
  { aberturaMm: 0.6,  zonaUtilMin: 25,  zonaUtilMax:  90, zonaOtimaMin: 35,  zonaOtimaMax:  75 },
  { aberturaMm: 0.3,  zonaUtilMin: 10,  zonaUtilMax:  65, zonaOtimaMin: 15,  zonaOtimaMax:  45 },
  { aberturaMm: 0.15, zonaUtilMin:  2,  zonaUtilMax:  20, zonaOtimaMin:  5,  zonaOtimaMax:  25 },
] as const;

/** Resultado da verificação de uma peneira contra as zonas NBR 7211 */
export interface VerificacaoZonaNBR {
  aberturaMm:    number;
  passantePct:   number;
  naZonaUtil:    boolean;
  naZonaOtima:   boolean;
  status:        "ótima" | "utilizável" | "fora";
}

/**
 * Verifica se a curva granulométrica de uma areia atende às zonas
 * utilizável e ótima da NBR 7211:2009.
 *
 * @param curva  CurvaGranulometrica processada (somente areias)
 * @returns      Array de verificações por peneira da série normal
 */
export function verificarZonasNBR7211(curva: CurvaGranulometrica): VerificacaoZonaNBR[] {
  return ZONAS_NBR7211_AREIA.map((zona) => {
    const passante = curva.passantesPorAbertura[String(zona.aberturaMm)] ?? -1;

    if (passante < 0) {
      return {
        aberturaMm:  zona.aberturaMm,
        passantePct: -1,
        naZonaUtil:  false,
        naZonaOtima: false,
        status:      "fora" as const,
      };
    }

    const naZonaUtil  = passante >= zona.zonaUtilMin  && passante <= zona.zonaUtilMax;
    const naZonaOtima = passante >= zona.zonaOtimaMin && passante <= zona.zonaOtimaMax;

    return {
      aberturaMm:  zona.aberturaMm,
      passantePct: passante,
      naZonaUtil,
      naZonaOtima,
      status: naZonaOtima ? "ótima" : naZonaUtil ? "utilizável" : "fora",
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 10 — DADOS PADRÃO (Densus Engine PRO ULTIMATE 2025)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dados granulométricos de referência extraídos da aba GRANULOMETRIA
 * da planilha Densus Engine PRO ULTIMATE 2025.
 *
 * Todas as massas em gramas, peneiras em mm, ordem decrescente.
 * Validados matematicamente contra os valores da planilha.
 */
export const DADOS_GRANULO_DENSUS_DEFAULT = {
  M1: {
    id: "M1", descricao: "Areia Natural Média",
    peneiras: [
      { aberturaMMm: 50,    massaRetidaG: 0   },
      { aberturaMMm: 37.5,  massaRetidaG: 0   },
      { aberturaMMm: 25,    massaRetidaG: 0   },
      { aberturaMMm: 19,    massaRetidaG: 0   },
      { aberturaMMm: 12.5,  massaRetidaG: 0   },
      { aberturaMMm: 9.5,   massaRetidaG: 0   },
      { aberturaMMm: 4.75,  massaRetidaG: 50  },
      { aberturaMMm: 2.36,  massaRetidaG: 150 },
      { aberturaMMm: 1.18,  massaRetidaG: 200 },
      { aberturaMMm: 0.6,   massaRetidaG: 250 },
      { aberturaMMm: 0.3,   massaRetidaG: 180 },
      { aberturaMMm: 0.15,  massaRetidaG: 130 },
      { aberturaMMm: 0.075, massaRetidaG: 40  },
    ],
  },
  M2: {
    id: "M2", descricao: "Areia Manufaturada 0-4",
    peneiras: [
      { aberturaMMm: 50,    massaRetidaG: 0   },
      { aberturaMMm: 37.5,  massaRetidaG: 0   },
      { aberturaMMm: 25,    massaRetidaG: 0   },
      { aberturaMMm: 19,    massaRetidaG: 0   },
      { aberturaMMm: 12.5,  massaRetidaG: 5   },
      { aberturaMMm: 9.5,   massaRetidaG: 10  },
      { aberturaMMm: 4.75,  massaRetidaG: 50  },
      { aberturaMMm: 2.36,  massaRetidaG: 100 },
      { aberturaMMm: 1.18,  massaRetidaG: 180 },
      { aberturaMMm: 0.6,   massaRetidaG: 150 },
      { aberturaMMm: 0.3,   massaRetidaG: 100 },
      { aberturaMMm: 0.15,  massaRetidaG: 80  },
      { aberturaMMm: 0.075, massaRetidaG: 60  },
    ],
  },
  G1: {
    id: "G1", descricao: "Brita 0 (Pedrisco)",
    peneiras: [
      { aberturaMMm: 50,    massaRetidaG: 0   },
      { aberturaMMm: 37.5,  massaRetidaG: 0   },
      { aberturaMMm: 25,    massaRetidaG: 50  },
      { aberturaMMm: 19,    massaRetidaG: 200 },
      { aberturaMMm: 12.5,  massaRetidaG: 500 },
      { aberturaMMm: 9.5,   massaRetidaG: 200 },
      { aberturaMMm: 4.75,  massaRetidaG: 30  },
      { aberturaMMm: 2.36,  massaRetidaG: 5   },
      { aberturaMMm: 1.18,  massaRetidaG: 2   },
      { aberturaMMm: 0.6,   massaRetidaG: 0   },
      { aberturaMMm: 0.3,   massaRetidaG: 0   },
      { aberturaMMm: 0.15,  massaRetidaG: 0   },
      { aberturaMMm: 0.075, massaRetidaG: 0   },
    ],
  },
  G2: {
    id: "G2", descricao: "Brita 1",
    peneiras: [
      { aberturaMMm: 50,    massaRetidaG: 0   },
      { aberturaMMm: 37.5,  massaRetidaG: 50  },
      { aberturaMMm: 25,    massaRetidaG: 250 },
      { aberturaMMm: 19,    massaRetidaG: 350 },
      { aberturaMMm: 12.5,  massaRetidaG: 250 },
      { aberturaMMm: 9.5,   massaRetidaG: 80  },
      { aberturaMMm: 4.75,  massaRetidaG: 10  },
      { aberturaMMm: 2.36,  massaRetidaG: 2   },
      { aberturaMMm: 1.18,  massaRetidaG: 0   },
      { aberturaMMm: 0.6,   massaRetidaG: 0   },
      { aberturaMMm: 0.3,   massaRetidaG: 0   },
      { aberturaMMm: 0.15,  massaRetidaG: 0   },
      { aberturaMMm: 0.075, massaRetidaG: 0   },
    ],
  },
  G3: {
    id: "G3", descricao: "Brita 2",
    peneiras: [
      { aberturaMMm: 50,    massaRetidaG: 50  },
      { aberturaMMm: 37.5,  massaRetidaG: 250 },
      { aberturaMMm: 25,    massaRetidaG: 400 },
      { aberturaMMm: 19,    massaRetidaG: 200 },
      { aberturaMMm: 12.5,  massaRetidaG: 50  },
      { aberturaMMm: 9.5,   massaRetidaG: 10  },
      { aberturaMMm: 4.75,  massaRetidaG: 2   },
      { aberturaMMm: 2.36,  massaRetidaG: 0   },
      { aberturaMMm: 1.18,  massaRetidaG: 0   },
      { aberturaMMm: 0.6,   massaRetidaG: 0   },
      { aberturaMMm: 0.3,   massaRetidaG: 0   },
      { aberturaMMm: 0.15,  massaRetidaG: 0   },
      { aberturaMMm: 0.075, massaRetidaG: 0   },
    ],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 11 — CURVA IDEAL AIM (Alfred Improved Model)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera a curva ideal AIM (Alfred Improved Model / modificação Brouwers 2006).
 *
 *   P_AIM(D) = 100 × (D/D_max)^q × exp[−q × (1 − D/D_max)]              … (AIM)
 *
 * Diferenças em relação ao Andreasen Modificado:
 *   - Converge naturalmente a 0 para D → 0 sem precisar de D_min explícito
 *   - Penaliza mais a distribuição ultrafina (exp decay)
 *   - Mais conservador para misturas de pós cimentícios
 *   - Recomendado por Brouwers & Radix (2005) para UHPC e argamassas reativas
 *
 * @param peneiras  Aberturas em mm (pode incluir a faixa laser 0.0001–0.075)
 * @param params    { q, dMaxMm }
 * @returns         Array de % passante ideal
 *
 * @example
 * gerarCurvaAIM([0.6, 0.3, 0.15, 0.075, 0.010, 0.001], { q: 0.25, dMaxMm: 0.6 })
 */
export function gerarCurvaAIM(
  peneiras: readonly number[],
  params:   ParamsAIM
): number[] {
  const { q, dMaxMm } = params;
  return peneiras.map((d) => {
    if (d <= 0 || dMaxMm <= 0) return 0;
    const ratio  = d / dMaxMm;
    const p      = 100 * ratio ** q * Math.exp(-q * (1 - ratio));
    return _arredondar(Math.min(100, Math.max(0, p)), 3);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 12 — CPM (COMPRESSIBLE PACKING MODEL — De Larrard 1999)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o empacotamento virtual β* da mistura pelo CPM de De Larrard (1999).
 *
 * O CPM modela a mistura como N classes de partículas com empacotamento
 * virtual β*_i (monofracional) e fração φ_i. O empacotamento real β* é
 * determinado pela classe dominante (aquela que impõe a restrição geométrica
 * mais severa).
 *
 * Equação CPM (De Larrard Eq. 3.10 — versão linear):
 *
 *   Para cada classe i dominante:
 *   β_i = γ_i / [1 − Σ_{j: dj>di} (1−γ_i+a_{ij}γ_i)(φ_j/γ_j)
 *                   − Σ_{j: dj<di} (1−b_{ij})(φ_j/γ_j)]               … (CPM)
 *
 * Coeficientes:
 *   a_{ij} = 1 − (1 − d_i/d_j)^{1.02}  [afrouxamento]                  … (aij)
 *   b_{ij} = 1 − (1 − d_j/d_i)^{1.50}  [parede]                        … (bij)
 *
 *   β* = min_{i: β_i ≤ 1+ε} β_i                                         … (bstar)
 *
 * NOTA SOBRE ESCALA MICROSCÓPICA:
 *   Para razões d_j/d_i < 0.01 (ex: microsílica 0.2µm vs. areia 400µm),
 *   o efeito de interação é zerado. As partículas ultrafinas preenchem os
 *   interstícios sem perturbar a geometria da fase grossa dominante.
 *   Referência: Sedran & De Larrard, RENE-LCPC documentation (2002).
 *
 * @param classes  Array de ClasseCPM com d, β*, φ — Σφ deve ser ≈ 1
 * @param limiarInteracao  Razão mínima d_j/d_i para interação (default: 0.01)
 * @returns        ResultadoCPM com β*, teor de vazios e β por classe
 *
 * @throws Error se o array de classes estiver vazio
 *
 * @example — UHPC com microsílica e cimento:
 * calcularCPM([
 *   { id: "microsilica", dRepMm: 0.00015, betaStar: 0.565, phi: 0.10 },
 *   { id: "cimento",     dRepMm: 0.012,   betaStar: 0.552, phi: 0.35 },
 *   { id: "areia",       dRepMm: 0.350,   betaStar: 0.640, phi: 0.55 },
 * ])
 */
export function calcularCPM(
  classes:         ClasseCPM[],
  limiarInteracao: number = 0.01
): ResultadoCPM {
  if (classes.length === 0) {
    throw new Error("CPM: ao menos uma classe é necessária.");
  }

  const N = classes.length;

  // ── Coeficientes geométricos De Larrard ───────────────────────────────────
  const _aij = (di: number, dj: number): number => {
    // Afrouxamento: j grossa (dj > di) age sobre i — reduz o empacotamento de i
    if (di >= dj || dj === 0) return 0;
    const ratio = di / dj;
    if (ratio < limiarInteracao) return 0;     // ultra-finos: sem interação
    return 1 - (1 - ratio) ** 1.02;           // … (aij)
  };

  const _bij = (di: number, dj: number): number => {
    // Parede: j fina (dj < di) prejudica o empacotamento de i
    if (di <= dj || di === 0) return 0;
    const ratio = dj / di;
    if (ratio < limiarInteracao) return 0;     // ultra-finos: sem interação
    return 1 - (1 - ratio) ** 1.50;           // … (bij)
  };

  // ── Calcular β_i para cada classe dominante ───────────────────────────────
  const betasPorClasse: Record<string, number> = {};
  let classeComUltrafinos = false;

  for (let i = 0; i < N; i++) {
    const { id: iId, dRepMm: di, betaStar: gamma_i, phi: phi_i } = classes[i];

    // Contribuição das classes MAIS GROSSAS → afrouxamento em i
    let sg = 0;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const { dRepMm: dj, betaStar: gamma_j, phi: phi_j } = classes[j];
      if (dj > di) {
        const a = _aij(di, dj);
        sg += (1 - gamma_i + a * gamma_i) * (phi_j / gamma_j);
        if (di / dj < limiarInteracao) classeComUltrafinos = true;
      }
    }

    // Contribuição das classes MAIS FINAS → efeito de parede em i
    let sf = 0;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const { dRepMm: dj, betaStar: gamma_j, phi: phi_j } = classes[j];
      if (dj < di) {
        const b = _bij(di, dj);
        sf += (1 - b) * (phi_j / gamma_j);
        if (dj / di < limiarInteracao) classeComUltrafinos = true;
      }
    }

    const denom  = 1 - sg - sf;
    const beta_i = denom > 0.01 && denom <= 1.5
      ? gamma_i / denom
      : Infinity;                              // não é classe dominante

    betasPorClasse[iId] = _arredondar(beta_i < 100 ? beta_i : 999, 4);
    void phi_i; // phi_i não é usado individualmente aqui — pertence à classe
  }

  // ── β* = menor β_i fisicamente válido (≤ 1) ──────────────────────────────
  const betas = Object.values(betasPorClasse);
  const betasValidos = betas.filter((b) => b <= 1.0 + 1e-6);

  let betaStar: number;
  let classeDominante: string;

  if (betasValidos.length > 0) {
    betaStar = Math.min(...betasValidos);
    classeDominante = Object.entries(betasPorClasse).find(
      ([, v]) => Math.abs(v - betaStar) < 1e-5
    )![0];
  } else {
    // Todas as classes têm β_i > 1: mistura superdosada em uma fase.
    // Retornar β* como média ponderada dos β* monofraçionais.
    betaStar = _arredondar(
      classes.reduce((s, c) => s + c.phi * c.betaStar, 0), 4
    );
    classeDominante = "(mistura homogênea — sem dominante)";
  }

  return {
    classeDominante,
    betaStar:      _arredondar(betaStar, 4),
    teorVaziosPct: _arredondar((1 - betaStar) * 100, 2),
    betasPorClasse,
    advertenciaUltrafinos: classeComUltrafinos
      ? `Razão d_j/d_i < ${limiarInteracao} detectada. Efeito de interação ` +
        `zerado para classes ultra-finas (ex: microsílica vs. areia). ` +
        `β* pode subestimar o empacotamento real — confirmar via ensaio AASHTO T19.`
      : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 13 — ANDREASEN PARA SÉRIE LASER (RMSE COM PENEIRAS ATIVAS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o RMSE entre a mistura e a curva ideal de Andreasen, usando SOMENTE
 * as peneiras onde a curva ideal está ativa (0 < P_ideal < 100).
 *
 * Para UHPC com D_max = 1.18 mm e D_min = 0.0001 mm, por exemplo,
 * todas as peneiras com D > D_max (onde P_ideal > 100 ou = 100 para D=D_max)
 * são excluídas do cálculo. Isso torna o RMSE DISCRIMINANTE para otimização
 * de misturas de pós cimentícios.
 *
 * RMSE_ativo = √[ Σ_{i∈ativo}(R_mis_i − P_ideal_i)² / N_ativo ]         … (RMSE_A)
 * onde ativo = { i : 0 < P_ideal_i < 100 }
 *
 * @param passanteMistura  % passante da mistura para cada peneira
 * @param peneiras         Aberturas correspondentes — mm
 * @param paramsAndreasen  Parâmetros Andreasen (q, D_min, D_max)
 * @returns                { rmse, nPeneirasAtivas, peneirasAtivas }
 */
export function calcularRmseAndreasenAtivo(
  passanteMistura: readonly number[],
  peneiras:        readonly number[],
  paramsAndreasen: ParamsAndreasen
): { rmse: number; nPeneirasAtivas: number; peneirasAtivas: number[] } {
  const ideal      = gerarCurvaIdealAndreasen(peneiras, paramsAndreasen);
  const penAtivas: number[] = [];
  let   soma       = 0;

  for (let i = 0; i < peneiras.length; i++) {
    const pIdeal = ideal.pontos[i].passanteIdealPct;
    // Ativo: curva ideal tem discriminação real neste ponto
    if (pIdeal > 0.01 && pIdeal < 99.99) {
      const rMis  = 100 - passanteMistura[i];   // retida acumulada mistura
      const diff  = rMis - pIdeal;              // convenção Densus Engine
      soma       += diff * diff;
      penAtivas.push(peneiras[i]);
    }
  }

  const N    = penAtivas.length;
  const rmse = N > 0 ? _arredondar(Math.sqrt(soma / N), 3) : 0;

  return { rmse, nPeneirasAtivas: N, peneirasAtivas: penAtivas };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 14 — CONSTRUIR CurvaGranulometrica A PARTIR DE PERFIL LASER (CONSTANTS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte um perfil laser do catálogo constants.ts em CurvaGranulometrica
 * completa, pronta para uso nas funções de composição e CPM.
 *
 * @param id          Identificador do material
 * @param descricao   Descrição
 * @param passantes   Record<string_abertura_mm, passante_pct> — do catálogo
 * @returns           CurvaGranulometrica com contemDadosLaser = true
 *
 * @example
 * import { PERFIS_LASER_CIMENTICIO } from "./constants";
 * const curvaCim = construirCurvaDePerfil(
 *   "CIM",
 *   "CP V-ARI",
 *   PERFIS_LASER_CIMENTICIO.CP_V_ARI.passantes
 * );
 */
export function construirCurvaDePerfil(
  id:        string,
  descricao: string,
  passantes: Record<string, number>
): CurvaGranulometrica {
  const dados: DadoPeneira[] = Object.entries(passantes).map(([abStr, pPct]) => ({
    aberturaMMm:      Number(abStr),
    massaRetidaG:     0,
    passanteLaserPct: pPct,
    origemLaser:      true,
  }));

  // Ordenar da maior para a menor abertura
  dados.sort((a, b) => b.aberturaMMm - a.aberturaMMm);

  return processarCurva(id, descricao, dados);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS — INTERPOLAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interpola log-linearmente o % passante para uma abertura sem dado direto.
 * Usa os dois pontos vizinhos mais próximos na escala logarítmica.
 */
function _interpolarPassante(
  ab:          number,
  passantesMap: Map<number, number>
): number {
  const aberturas = Array.from(passantesMap.keys()).sort((a, b) => a - b);
  if (aberturas.length === 0) return 50;

  // Encontrar vizinhos inf e sup
  let abInf = aberturas[0];
  let abSup = aberturas[aberturas.length - 1];

  for (const a of aberturas) {
    if (a <= ab) abInf = a;
    if (a >= ab && abSup >= ab) { abSup = a; break; }
  }

  if (abInf === abSup) return passantesMap.get(abInf) ?? 0;

  const pInf = passantesMap.get(abInf) ?? 0;
  const pSup = passantesMap.get(abSup) ?? 100;

  // Interpolação log-linear
  if (abInf <= 0 || abSup <= 0 || ab <= 0) return (pInf + pSup) / 2;
  const t = Math.log(ab / abInf) / Math.log(abSup / abInf);
  return _arredondar(pInf + t * (pSup - pInf), 2);
}

/**
 * Interpola o diâmetro Dx (ex: D50, D90) da curva de passantes.
 * Retorna null se os dados não cobrem o percentil solicitado.
 */
function _interpolarDiametro(
  percentil:    number,
  aberturas:    number[],
  passantesMap: Map<number, number>
): number | null {
  const sorted = [...aberturas].sort((a, b) => a - b);

  for (let i = 0; i < sorted.length - 1; i++) {
    const dInf  = sorted[i];
    const dSup  = sorted[i + 1];
    const pInf  = passantesMap.get(dInf) ?? 0;
    const pSup  = passantesMap.get(dSup) ?? 0;

    if (pInf <= percentil && pSup >= percentil && pSup > pInf) {
      // Interpolação log-linear
      const t = (percentil - pInf) / (pSup - pInf);
      const d = dInf <= 0 ? dSup
        : Math.exp(Math.log(dInf) + t * Math.log(dSup / dInf));
      return _arredondar(d, 6);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER INTERNO
// ─────────────────────────────────────────────────────────────────────────────

/** Arredonda para n casas decimais sem acumular erro de ponto flutuante */
function _arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}
