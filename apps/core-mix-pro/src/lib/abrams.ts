/**
 * @file lib/abrams.ts
 * @description CORE MIX PRO — Motor de Cálculo da Lei de Abrams
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEORIA DO MODELO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A Lei de Abrams (1919) estabelece que a resistência do concreto é uma
 * função inversa da relação água/cimento (a/c), para materiais e condições
 * de cura fixos. A formulação logarítmica (ln-ln) é mais precisa que a
 * exponencial original e é o padrão moderno (IPT-EPUSP / Densus Engine):
 *
 *   ln(fc28) = A + B × ln(a/c)          … (1)  [forma linear da regressão]
 *
 *   Equivalentemente:
 *   fc28 = exp(A) × (a/c)^B             … (1') [forma potência]
 *
 * Onde:
 *   A  = intercepto da regressão ln-ln (adimensional, tipicamente 2.3–2.8)
 *       Fisicamente: ln da resistência teórica quando a/c → 1.0
 *   B  = inclinação da regressão (SEMPRE negativo, tipicamente −1.2 a −1.8)
 *       Fisicamente: sensibilidade da resistência à variação do a/c
 *   fc28 = resistência à compressão aos 28 dias — MPa
 *   a/c  = relação água/cimento — adimensional
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CALIBRAÇÃO DOS PARÂMETROS A e B (Mínimos Quadrados Ordinários)
 * ───────────────────────────────────────────────────────────────────────────
 * Dados n pontos (a/cᵢ, fc28ᵢ), a linearização define:
 *   xᵢ = ln(a/cᵢ)    yᵢ = ln(fc28ᵢ)
 *
 *   B = [ n·Σ(xᵢyᵢ) − Σxᵢ·Σyᵢ ] / [ n·Σ(xᵢ²) − (Σxᵢ)² ]
 *   A = ( Σyᵢ − B·Σxᵢ ) / n
 *
 * ───────────────────────────────────────────────────────────────────────────
 * INVERSÃO — cálculo do a/c para uma resistência alvo fcj
 * ───────────────────────────────────────────────────────────────────────────
 * Isolando a/c em (1):
 *   a/c = exp[ (ln(fcj) − A) / B ]      … (2)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODELO DE MATURIDADE — resistências em idades intermediárias
 * ───────────────────────────────────────────────────────────────────────────
 * Para cada ponto de calibração com dados por idade:
 *   β(t) = média[ fc_t_i / fc_28_i ]    … (3a)  [modelo empírico calibrado]
 *   fc(t, a/c) = fc28(a/c) × β(t)
 *
 * Fallback quando os pontos de calibração não têm dados por idade:
 *   β(t) = exp( s × (1 − √(28/t)) )    … (3b)  [CEB-FIP MC90 / fib 2010]
 *   s = coeficiente de maturidade do cimento (ver enum TipoCimentoCebFip)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1] Abrams, D.A. (1919). Design of Concrete Mixtures. Lewis Institute.
 *   [2] Helene, P. & Terzian, P. (1992). Manual de Dosagem e Controle do
 *       Concreto. PINI / IPT-EPUSP.
 *   [3] CEB-FIP Model Code 1990. fib Bulletins 1 & 2.
 *   [4] fib Model Code 2010. fib Bulletin 65/66.
 *   [5] NBR 12655:2022 — Concreto de cimento Portland.
 *   [6] NBR 6118:2023 — Projeto de estruturas de concreto.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getLimitesNormativos, type LimitesNormativos } from "../types/materiais";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS DO MÓDULO
// ─────────────────────────────────────────────────────────────────────────────

/** Um ponto de calibração experimental para a curva de Abrams */
export interface PontoCalibracaoAbrams {
  /** Identificador do ponto (ex: "P1", "P2") */
  id: string;
  /** Relação água/cimento do traço piloto — adimensional */
  relacaoAc: number;
  /** Resistência à compressão aos 28 dias — MPa (obrigatório) */
  fc28dMPa: number;
  /** Resistências em idades intermediárias — MPa (opcionais) */
  fc1dMPa?: number;
  fc3dMPa?: number;
  fc7dMPa?: number;
  fc14dMPa?: number;
  fc56dMPa?: number;
  fc91dMPa?: number;
}

/** Parâmetros calibrados da curva de Abrams */
export interface ParamsRegressaoAbrams {
  /** Intercepto A — ln da resistência teórica para a/c → 1.0 */
  A: number;
  /** Inclinação B — sensibilidade; DEVE ser negativo */
  B: number;
  /** Coeficiente de determinação R² — qualidade do ajuste (0 a 1) */
  r2: number;
  /** Número de pontos usados na regressão */
  nPontos: number;
}

/** Fatores de maturidade β(t) derivados dos pontos de calibração */
export interface FatoresMaturidade {
  /** β(1d)  — fração de fc28 aos 1 dia */
  beta1d: number;
  /** β(3d)  — fração de fc28 aos 3 dias */
  beta3d: number;
  /** β(7d)  — fração de fc28 aos 7 dias */
  beta7d: number;
  /** β(14d) — fração de fc28 aos 14 dias (interpolado se ausente) */
  beta14d: number;
  /** β(28d) — sempre 1.0 por definição */
  beta28d: 1.0;
  /** β(56d) — fração de fc28 aos 56 dias */
  beta56d: number;
  /** β(91d) — fração de fc28 aos 91 dias */
  beta91d: number;
  /** Modelo usado: 'empirico' (pontos experimentais) | 'ceb-fip' (fallback) */
  modelo: "empirico" | "ceb-fip";
}

/** Resultado completo da estimativa de resistências por idade */
export interface ResistenciasPorIdade {
  fc1dMPa: number;
  fc3dMPa: number;
  fc7dMPa: number;
  fc14dMPa: number;
  fc28dMPa: number;
  fc56dMPa: number;
  fc91dMPa: number;
}

/** Resultado da inversão da curva (a/c para atingir fcj) */
export interface ResultadoRelacaoAc {
  /**
   * a/c calculado matematicamente pela inversão da curva de Abrams.
   * Pode ser maior que o limite normativo.
   */
  acCalculado: number;
  /**
   * a/c adotado para projeto — é o MENOR valor entre:
   *   (a) acCalculado
   *   (b) limite máximo da NBR 6118 para a CAA especificada
   */
  acAdotado: number;
  /**
   * Flag de limitação normativa.
   * true  → acAdotado < acCalculado (norma é mais restritiva que Abrams)
   * false → acCalculado atende a norma sem restrição
   */
  limitadoPelaNorma: boolean;
  /**
   * Mensagem de aviso quando limitadoPelaNorma = true.
   * Exemplo: "a/c limitado pela NBR 6118 (CAA-III): 0,55 → 0,50"
   */
  avisoNorma?: string;
  /** Limites normativos aplicados para rastreabilidade */
  limitesNormativos: LimitesNormativos;
}

/** Resultado completo do cálculo de dosagem via Abrams */
export interface ResultadoAbrams {
  /** Resistência de dosagem calculada — fcj = fck + t·σ */
  fcjMPa: number;
  /** Relação a/c e verificação normativa */
  relacaoAc: ResultadoRelacaoAc;
  /** Parâmetros da curva calibrada */
  paramsRegressao: ParamsRegressaoAbrams;
  /** Fatores de maturidade utilizados */
  fatoresMaturidade: FatoresMaturidade;
  /** Resistências estimadas para o a/c ADOTADO */
  resistenciasPorIdade: ResistenciasPorIdade;
}

// ─────────────────────────────────────────────────────────────────────────────
// COEFICIENTE s DO CEB-FIP MC90 (fallback de maturidade)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coeficiente de maturidade s do CEB-FIP MC90 / fib MC 2010.
 * Determina a velocidade de ganho de resistência na equação (3b):
 *   β(t) = exp( s × (1 − √(28/t)) )
 *
 * Valores normativos:
 *   s = 0.20 → CP V-ARI (cimentos de alta resistência inicial — RS)
 *   s = 0.25 → CP I, CP II, CP III, CP IV (cura normal — N)
 *   s = 0.38 → Cimentos de endurecimento lento (ex: CP III/CP IV com alta escória)
 */
export const COEFICIENTE_S_CEBFIP = {
  /** Alta resistência inicial: CP V-ARI, CP V-ARI RS */
  ALTA_RESISTENCIA_INICIAL: 0.20,
  /** Normal: CP I, CP II-F, CP II-Z, CP II-E, CP IV-32, CP III-40 */
  NORMAL: 0.25,
  /** Lento: concretos com alto teor de escória ou pozolana */
  LENTO: 0.38,
} as const;

export type TipoCimentoCebFip = keyof typeof COEFICIENTE_S_CEBFIP;

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class AbramsCurvaInsuficienteError extends Error {
  constructor(nPontos: number) {
    super(
      `Curva de Abrams requer no mínimo 3 pontos de calibração. ` +
      `Fornecidos: ${nPontos}. Adicione mais pontos de traços piloto.`
    );
    this.name = "AbramsCurvaInsuficienteError";
  }
}

export class AbramsRelacaoAcInvalidaError extends Error {
  constructor(ac: number) {
    super(
      `Relação a/c calculada (${ac.toFixed(3)}) está fora do intervalo válido [0.20, 1.00]. ` +
      `Verifique os parâmetros A e B da curva ou o fcj alvo.`
    );
    this.name = "AbramsRelacaoAcInvalidaError";
  }
}

export class AbramsR2BaixoError extends Error {
  constructor(r2: number) {
    super(
      `R² da regressão (${r2.toFixed(4)}) abaixo do mínimo aceitável de 0.90. ` +
      `Revise os pontos de calibração — pode haver outliers ou erro nos dados.`
    );
    this.name = "AbramsR2BaixoError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DO MÓDULO
// ─────────────────────────────────────────────────────────────────────────────

/** R² mínimo aceitável para a curva de calibração */
const R2_MINIMO = 0.90;

/** Intervalo válido para a relação a/c (física e praticável) */
const AC_MIN = 0.20;
const AC_MAX = 1.00;

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 1 — RESISTÊNCIA DE DOSAGEM (Fck → Fcj)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a resistência de dosagem `fcj` pelo método IPT-EPUSP / NBR 12655.
 *
 * Fórmula:
 *   fcj = fck + t × σ                                            … (4)
 *
 * @param fckMPa               Resistência característica especificada — MPa
 * @param desvioPadraoCampoMPa Desvio padrão do controle de produção — MPa
 * @param fatorT               Fator t de Student (1.65 para 95% de confiança)
 * @returns                    Resistência de dosagem fcj — MPa
 *
 * @example
 * calcularFcjAlvo(30, 4.0, 1.65) // → 36.6 MPa
 */
export function calcularFcjAlvo(
  fckMPa: number,
  desvioPadraoCampoMPa: number,
  fatorT: number = 1.65
): number {
  if (fckMPa <= 0) throw new RangeError("fck deve ser positivo");
  if (desvioPadraoCampoMPa < 0) throw new RangeError("σ não pode ser negativo");
  if (fatorT <= 0) throw new RangeError("fator t deve ser positivo");

  return fckMPa + fatorT * desvioPadraoCampoMPa;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 2 — REGRESSÃO ln-ln (calibração da curva de Abrams)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calibra os parâmetros A e B da curva de Abrams por regressão linear
 * nos espaços logarítmicos (Mínimos Quadrados Ordinários).
 *
 * Modelo: y = A + B·x  onde  x = ln(a/c),  y = ln(fc28)
 *
 * Fórmulas normais (OLS):
 *   B = [ n·Σ(xᵢyᵢ) − Σxᵢ·Σyᵢ ] / [ n·Σ(xᵢ²) − (Σxᵢ)² ]
 *   A = ( Σyᵢ − B·Σxᵢ ) / n
 *   R² = 1 − SS_res / SS_tot
 *
 * @param pontos Array de pontos de calibração (mínimo 3)
 * @param validarR2 Se true, lança erro quando R² < 0.90 (default: true)
 * @throws {AbramsCurvaInsuficienteError} se n < 3
 * @throws {AbramsR2BaixoError} se R² < 0.90 e validarR2 = true
 */
export function calibrarCurvaAbrams(
  pontos: PontoCalibracaoAbrams[],
  validarR2 = true
): ParamsRegressaoAbrams {
  const n = pontos.length;
  if (n < 3) throw new AbramsCurvaInsuficienteError(n);

  // Linearização: xᵢ = ln(a/cᵢ), yᵢ = ln(fc28ᵢ)
  const x = pontos.map((p) => Math.log(p.relacaoAc));
  const y = pontos.map((p) => Math.log(p.fc28dMPa));

  // Somatórios para OLS
  const Sx  = x.reduce((acc, xi) => acc + xi, 0);
  const Sy  = y.reduce((acc, yi) => acc + yi, 0);
  const Sxy = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const Sx2 = x.reduce((acc, xi) => acc + xi * xi, 0);

  // Coeficientes da regressão
  const B = (n * Sxy - Sx * Sy) / (n * Sx2 - Sx * Sx);
  const A = (Sy - B * Sx) / n;

  // Coeficiente de determinação R²
  const yMean = Sy / n;
  const ssTot = y.reduce((acc, yi) => acc + (yi - yMean) ** 2, 0);
  const ssRes = x.reduce(
    (acc, xi, i) => acc + (y[i] - (A + B * xi)) ** 2,
    0
  );
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;

  if (validarR2 && r2 < R2_MINIMO) {
    throw new AbramsR2BaixoError(r2);
  }

  return { A, B, r2, nPontos: n };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 3 — PREDIÇÃO DE fc28 PARA UM a/c DADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prediz a resistência aos 28 dias para um dado a/c usando a curva calibrada.
 *
 *   fc28 = exp( A + B × ln(a/c) )                                … (1')
 *
 * @param relacaoAc Relação água/cimento — adimensional
 * @param params    Parâmetros A e B calibrados
 * @returns         fc28 estimado — MPa
 */
export function predizFc28(
  relacaoAc: number,
  params: Pick<ParamsRegressaoAbrams, "A" | "B">
): number {
  if (relacaoAc <= 0) throw new RangeError("a/c deve ser positivo");
  return Math.exp(params.A + params.B * Math.log(relacaoAc));
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 4 — INVERSÃO DA CURVA (a/c para atingir fcj)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula a relação a/c necessária para atingir a resistência de dosagem `fcj`
 * e cruza com os limites da NBR 6118:2023 para a classe de agressividade.
 *
 * Inversão de (1):
 *   a/c = exp[ ( ln(fcj) − A ) / B ]                             … (2)
 *
 * Regra normativa (NBR 6118:2023 Tabela 7.1):
 *   acAdotado = min( acCalculado, acMáximo_NBR(CAA) )
 *
 * @param fcjMPa              Resistência de dosagem alvo — MPa
 * @param params              Parâmetros A e B da curva calibrada
 * @param classeAgressividade Classe de agressividade ambiental (CAA-I a CAA-IV)
 * @throws {AbramsRelacaoAcInvalidaError} se o a/c calculado estiver fora de [0.20, 1.00]
 */
export function calcularRelacaoAc(
  fcjMPa: number,
  params: Pick<ParamsRegressaoAbrams, "A" | "B">,
  classeAgressividade: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV"
): ResultadoRelacaoAc {
  if (fcjMPa <= 0) throw new RangeError("fcj deve ser positivo");

  // Inversão da curva de Abrams — equação (2)
  const acCalculado = Math.exp((Math.log(fcjMPa) - params.A) / params.B);

  if (acCalculado < AC_MIN || acCalculado > AC_MAX) {
    throw new AbramsRelacaoAcInvalidaError(acCalculado);
  }

  // Limites normativos para a CAA especificada
  const limites = getLimitesNormativos(classeAgressividade);
  const acMaxNorma = limites.acMaximo;

  const limitadoPelaNorma = acCalculado > acMaxNorma;
  const acAdotado = limitadoPelaNorma ? acMaxNorma : acCalculado;

  const avisoNorma = limitadoPelaNorma
    ? `a/c calculado ${acCalculado.toFixed(3)} > limite da NBR 6118 (${classeAgressividade}): ` +
      `${acMaxNorma.toFixed(2)}. Adotado: ${acAdotado.toFixed(2)}. ` +
      `Considere aumentar o fck ou usar SCM para reduzir o a/c efetivo.`
    : undefined;

  return {
    acCalculado: _arredondar(acCalculado, 4),
    acAdotado: _arredondar(acAdotado, 4),
    limitadoPelaNorma,
    avisoNorma,
    limitesNormativos: limites,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 5 — FATORES DE MATURIDADE β(t)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula os fatores de maturidade β(t) a partir dos pontos de calibração.
 *
 * Modelo empírico (quando os pontos têm dados de resistência por idade):
 *   β(t) = (1/n) × Σ[ fc_t_i / fc_28_i ]                        … (3a)
 *
 * Fallback CEB-FIP MC90 (quando os pontos não têm dados por idade):
 *   β(t) = exp( s × (1 − √(28/t)) )                             … (3b)
 *
 * @param pontos      Pontos de calibração com dados por idade
 * @param tiposCebFip Tipo de cimento para fallback CEB-FIP (default: NORMAL)
 */
export function calcularFatoresMaturidade(
  pontos: PontoCalibracaoAbrams[],
  tipoCebFip: TipoCimentoCebFip = "NORMAL"
): FatoresMaturidade {
  const s = COEFICIENTE_S_CEBFIP[tipoCebFip];

  // Verifica se os pontos têm pelo menos fc1d E fc7d (mínimo para modelo empírico)
  const pontosComIdades = pontos.filter(
    (p) => p.fc1dMPa !== undefined && p.fc7dMPa !== undefined
  );

  if (pontosComIdades.length < 2) {
    // Fallback: CEB-FIP MC90 — equação (3b)
    return {
      beta1d:  _betaCebFip(1,  s),
      beta3d:  _betaCebFip(3,  s),
      beta7d:  _betaCebFip(7,  s),
      beta14d: _betaCebFip(14, s),
      beta28d: 1.0,
      beta56d: _betaCebFip(56, s),
      beta91d: _betaCebFip(91, s),
      modelo: "ceb-fip",
    };
  }

  // Modelo empírico: média dos ratios experimentais — equação (3a)
  const _betaEmpirico = (
    getter: (p: PontoCalibracaoAbrams) => number | undefined
  ): number => {
    const validos = pontosComIdades.filter(
      (p) => getter(p) !== undefined && p.fc28dMPa > 0
    );
    if (validos.length === 0) return _betaCebFip(28, s); // fallback pontual
    return (
      validos.reduce((acc, p) => acc + getter(p)! / p.fc28dMPa, 0) /
      validos.length
    );
  };

  const beta1d  = _betaEmpirico((p) => p.fc1dMPa);
  const beta3d  = _betaEmpirico((p) => p.fc3dMPa);
  const beta7d  = _betaEmpirico((p) => p.fc7dMPa);
  const beta14d = _betaEmpirico((p) => p.fc14dMPa);
  const beta56d = _betaEmpirico((p) => p.fc56dMPa);
  const beta91d = _betaEmpirico((p) => p.fc91dMPa);

  return {
    beta1d,
    beta3d,
    beta7d,
    beta14d,
    beta28d: 1.0,
    beta56d,
    beta91d,
    modelo: "empirico",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 6 — RESISTÊNCIAS ESTIMADAS POR IDADE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estima as resistências à compressão em múltiplas idades para um dado a/c.
 *
 *   fc(t, a/c) = fc28(a/c) × β(t)                               … (3)
 *
 * @param relacaoAcAdotado a/c adotado (após verificação normativa)
 * @param params           Parâmetros A e B calibrados
 * @param fatores          Fatores de maturidade β(t)
 */
export function estimarResistenciasPorIdade(
  relacaoAcAdotado: number,
  params: Pick<ParamsRegressaoAbrams, "A" | "B">,
  fatores: FatoresMaturidade
): ResistenciasPorIdade {
  const fc28 = predizFc28(relacaoAcAdotado, params);

  return {
    fc1dMPa:  _arredondar(fc28 * fatores.beta1d,  1),
    fc3dMPa:  _arredondar(fc28 * fatores.beta3d,  1),
    fc7dMPa:  _arredondar(fc28 * fatores.beta7d,  1),
    fc14dMPa: _arredondar(fc28 * fatores.beta14d, 1),
    fc28dMPa: _arredondar(fc28,                   1),
    fc56dMPa: _arredondar(fc28 * fatores.beta56d, 1),
    fc91dMPa: _arredondar(fc28 * fatores.beta91d, 1),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 7 — ORQUESTRADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executa o pipeline completo do motor de Abrams em uma única chamada.
 *
 * Pipeline:
 *   1. fcj = calcularFcjAlvo(fck, σ, t)                         … (4)
 *   2. [A, B, R²] = calibrarCurvaAbrams(pontos)                  … OLS
 *   3. a/c = calcularRelacaoAc(fcj, A, B, CAA)                   … (2) + NBR
 *   4. β(t) = calcularFatoresMaturidade(pontos)                   … (3a/3b)
 *   5. fc(t) = estimarResistenciasPorIdade(a/c, A, B, β)          … (3)
 *
 * @param fckMPa               Resistência característica — MPa
 * @param desvioPadraoCampoMPa Desvio padrão de produção — MPa
 * @param fatorT               Fator t de Student (default 1.65)
 * @param classeAgressividade  CAA para verificação normativa
 * @param pontosCalib          Pontos de calibração experimentais (≥ 3)
 * @param tipoCebFip           Tipo de cimento para fallback de maturidade
 * @param validarR2            Lança erro se R² < 0.90 (default: true)
 */
export function calcularDosagemAbrams(
  fckMPa: number,
  desvioPadraoCampoMPa: number,
  fatorT: number,
  classeAgressividade: "CAA-I" | "CAA-II" | "CAA-III" | "CAA-IV",
  pontosCalib: PontoCalibracaoAbrams[],
  tipoCebFip: TipoCimentoCebFip = "NORMAL",
  validarR2 = true
): ResultadoAbrams {
  // 1. Resistência de dosagem
  const fcjMPa = calcularFcjAlvo(fckMPa, desvioPadraoCampoMPa, fatorT);

  // 2. Calibração da curva
  const paramsRegressao = calibrarCurvaAbrams(pontosCalib, validarR2);

  // 3. Relação a/c com verificação normativa
  const relacaoAc = calcularRelacaoAc(fcjMPa, paramsRegressao, classeAgressividade);

  // 4. Fatores de maturidade
  const fatoresMaturidade = calcularFatoresMaturidade(pontosCalib, tipoCebFip);

  // 5. Resistências por idade (usando acAdotado — o valor final de projeto)
  const resistenciasPorIdade = estimarResistenciasPorIdade(
    relacaoAc.acAdotado,
    paramsRegressao,
    fatoresMaturidade
  );

  return {
    fcjMPa: _arredondar(fcjMPa, 1),
    relacaoAc,
    paramsRegressao,
    fatoresMaturidade,
    resistenciasPorIdade,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 8 — ANÁLISE DE SENSIBILIDADE (opcional / diagnóstico)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera uma tabela de sensibilidade: fc28 previsto para uma faixa de a/c.
 * Útil para plotar a curva de Abrams no frontend.
 *
 * @param params    Parâmetros A e B calibrados
 * @param acMin     a/c mínimo da faixa (default 0.30)
 * @param acMax     a/c máximo da faixa (default 0.90)
 * @param passo     Incremento de a/c (default 0.05)
 * @returns         Array de { relacaoAc, fc28dMPa }
 */
export function gerarTabelaSensibilidade(
  params: Pick<ParamsRegressaoAbrams, "A" | "B">,
  acMin = 0.30,
  acMax = 0.90,
  passo = 0.05
): Array<{ relacaoAc: number; fc28dMPa: number }> {
  const tabela: Array<{ relacaoAc: number; fc28dMPa: number }> = [];
  let ac = acMin;
  while (ac <= acMax + 1e-9) {
    tabela.push({
      relacaoAc: _arredondar(ac, 2),
      fc28dMPa:  _arredondar(predizFc28(ac, params), 1),
    });
    ac += passo;
  }
  return tabela;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS (não exportados — uso interno do módulo)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fator de maturidade CEB-FIP MC90.
 *   β(t) = exp( s × (1 − √(28/t)) )                             … (3b)
 */
function _betaCebFip(diasT: number, s: number): number {
  return Math.exp(s * (1 - Math.sqrt(28 / diasT)));
}

/** Arredonda para n casas decimais (evita floating point noise) */
function _arredondar(valor: number, casas: number): number {
  const fator = Math.pow(10, casas);
  return Math.round(valor * fator) / fator;
}

// ─────────────────────────────────────────────────────────────────────────────
// DADOS DE CALIBRAÇÃO PADRÃO (pré-carregados da aba ABRAMS do Densus Engine)
// Usados como valor inicial antes do usuário inserir seus próprios traços piloto
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pontos de calibração extraídos diretamente da aba ABRAMS do Densus Engine PRO ULTIMATE 2025.
 * Correspondem a traços piloto com CP IV-32 RS (CIM-1).
 *
 * ATENÇÃO: Estes dados são de REFERÊNCIA. Em obra, substitua pelos
 *          resultados reais dos traços piloto da concreteira / laboratório.
 */
export const PONTOS_CALIBRACAO_DENSUS_DEFAULT: PontoCalibracaoAbrams[] = [
  {
    id: "P1", relacaoAc: 0.40,
    fc28dMPa: 52, fc1dMPa: 18, fc3dMPa: 35, fc7dMPa: 44, fc56dMPa: 54, fc91dMPa: 58,
  },
  {
    id: "P2", relacaoAc: 0.50,
    fc28dMPa: 42, fc1dMPa: 14, fc3dMPa: 28, fc7dMPa: 36, fc56dMPa: 44, fc91dMPa: 47,
  },
  {
    id: "P3", relacaoAc: 0.60,
    fc28dMPa: 32, fc1dMPa: 10, fc3dMPa: 20, fc7dMPa: 27, fc56dMPa: 33, fc91dMPa: 36,
  },
  {
    id: "P4", relacaoAc: 0.70,
    fc28dMPa: 24, fc1dMPa:  8, fc3dMPa: 15, fc7dMPa: 20, fc56dMPa: 25, fc91dMPa: 27,
  },
  {
    id: "P5", relacaoAc: 0.80,
    fc28dMPa: 18, fc1dMPa:  6, fc3dMPa: 11, fc7dMPa: 15, fc56dMPa: 19, fc91dMPa: 21,
  },
] as const;

/**
 * Parâmetros A e B pré-calibrados da aba ABRAMS do Densus Engine PRO ULTIMATE 2025.
 * Usados como fallback quando o usuário ainda não inseriu seus traços piloto.
 *
 * Modelo: ln(fc28) = 2.6174 + (−1.5318) × ln(a/c)
 * R² = 0.9756
 */
export const PARAMS_ABRAMS_DENSUS_DEFAULT: ParamsRegressaoAbrams = {
  A: 2.6174342854652464,
  B: -1.531769536037647,
  r2: 0.975645610103577,
  nPontos: 5,
} as const;
