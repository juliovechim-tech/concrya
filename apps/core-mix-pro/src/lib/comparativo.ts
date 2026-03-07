/**
 * @file lib/comparativo.ts
 * @description CORE MIX PRO — Motor de Comparação de Traços e Retroalimentação de Abrams
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VISÃO DO MÓDULO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este módulo implementa o "cérebro analítico" do LIMS: a camada de inteligência
 * que transforma dados brutos de dosagem e ensaios em decisão de engenharia.
 * Ele cobre três domínios:
 *
 *   1. Indicadores volumétricos fundamentais (γ, α, m, β_m)
 *   2. Motor de comparação multi-critério com ranking matricial
 *   3. Retroalimentação da curva de Abrams com resultados reais de laboratório
 *
 * ───────────────────────────────────────────────────────────────────────────
 * INDICADORES VOLUMÉTRICOS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Teor de Pasta γ (fração volumétrica dos materiais ligantes + água + ar):
 *   γ = (V_cim + V_água + V_sp + V_ar) / 1000                            … (γ)
 *   Referências típicas: CAA 0.38–0.42 | CAD 0.30–0.38 | CCV 0.26–0.34
 *
 * Teor de Argamassa α (pasta + areia fina):
 *   α = (V_pasta + V_areias) / 1000                                       … (α)
 *   Referências típicas: CAA 0.55–0.70 | CCV 0.50–0.65
 *
 * Relação Agregado/Cimento em massa:
 *   m = (Σ m_agregados) / m_cimento                                       … (m)
 *
 * Fração Argamassa no Agregado β_m:
 *   β_m = V_areias / (V_areias + V_britas)                                … (βm)
 *   Parâmetro de controle do método IPT-EPUSP (vide dosagem.ts)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MOTOR DE COMPARAÇÃO MULTI-CRITÉRIO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * KPIs calculados por traço:
 *
 *   η (Eficiência de Cimento) = fcm / mc   [MPa·m³/kg]                   … (η)
 *     → Quanto de resistência é produzido por kg de cimento
 *
 *   η_inv = mc / fcm   [kg cimento / MPa / m³]                            … (η⁻¹)
 *     → Consumo de cimento por unidade de resistência (menor = melhor)
 *
 *   Custo/MPa = Custo_m3 / fcm   [R$/MPa]                                … (C/MPa)
 *     → Eficiência econômica por unidade de resistência
 *
 *   CO₂/MPa = CO2_m3 / fcm   [kg CO₂/MPa]                               … (E/MPa)
 *     → Pegada de carbono por unidade de resistência
 *
 * Score de Ranking Composto (normalização min-max):
 *   Cada KPI é normalizado em [0, 1] — KPIs onde "menor é melhor" são invertidos.
 *   Score_final = Σ(w_j × score_j)                                        … (S)
 *   Peso padrão: custo=0.40, CO₂=0.30, eficiência cimento=0.30
 *
 * Matriz de Deltas (pairwise comparisons):
 *   ΔX_{ij} = X_i − X_j   para cada par (i,j) e KPI X
 *
 * ───────────────────────────────────────────────────────────────────────────
 * RETROALIMENTAÇÃO DA CURVA DE ABRAMS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Modelo de Abrams (1919) em forma log-linear:
 *   fc = A / B^(a/c)   →   ln(fc) = ln(A) − (a/c) × ln(B)               … (Ab)
 *
 * Recalibração por Mínimos Quadrados Ordinários (OLS):
 *   y_i = ln(fc_i)
 *   x_i = a/c_i
 *   Sistema: y = X·β   onde β = [ln(A), -ln(B)]ᵀ, X = [1, x_i]
 *
 *   β = (XᵀX)⁻¹ Xᵀy                                                     … (OLS)
 *
 *   A_cal = exp(β₀)
 *   B_cal = exp(−β₁)
 *   R²    = 1 − SS_res / SS_tot
 *
 * Extensão com Fator de Maturidade por Idade (opcional):
 *   fc(a/c, t) = A × t^γ / B^(a/c)                                       … (AbM)
 *   ln(fc) = ln(A) − (a/c)×ln(B) + γ×ln(t/28)
 *
 *   Regressão OLS 3D: β = [ln(A), ln(B), γ]ᵀ
 *   com X = [1, a/c, ln(t/28)]
 *
 * Intervalo de Confiança para A e B (via propagação de incerteza):
 *   σ²_β = s² × (XᵀX)⁻¹   onde s² = SS_res / (n − p)
 *   IC₉₅(βᵢ) = βᵢ ± t_{α/2, n−p} × √σ²_βᵢᵢ
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFERÊNCIAS:
 *   [1] Abrams, D.A. (1919). Design of concrete mixtures. LEA Bulletin 1.
 *   [2] Helene, P. & Terzian, P. (1992). Manual de Dosagem IPT/PINI.
 *   [3] NBR 12655:2022 — Preparo, controle e recebimento do concreto.
 *   [4] EN 206:2013+A2:2021 — Concrete: specification, performance, production.
 *   [5] fib MC 2010 — Model Code for Concrete Structures.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ResultadoDosagem } from "./dosagem";
import type { ComposicaoM3Generica, LinhaComposicaoGenerica, linhasPorCategoria } from "../types/materiais";

/** Alias for backward compat — comparativo now uses the generic format */
type ComposicaoM3 = ComposicaoM3Generica;

/** Helper to get volume sum by category */
function _volPorCategoria(comp: ComposicaoM3, cat: string): number {
  return comp.linhas.filter(l => l.categoria === cat).reduce((s, l) => s + l.volumeLM3, 0);
}
/** Helper to get mass sum by category */
function _massPorCategoria(comp: ComposicaoM3, cat: string): number {
  return comp.linhas.filter(l => l.categoria === cat).reduce((s, l) => s + l.massaKgM3, 0);
}
/** Helper to get first line of a category */
function _primeiraLinha(comp: ComposicaoM3, cat: string): LinhaComposicaoGenerica | undefined {
  return comp.linhas.find(l => l.categoria === cat);
}
import type { ResultadosEndurecidos } from "./laboratorio";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — INDICADORES VOLUMÉTRICOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indicadores volumétricos fundamentais de um traço.
 * Expressam a "composição relativa" do concreto independentemente
 * do consumo absoluto de cimento.
 */
export interface IndicadoresVolumetricos {
  /** γ — Teor de Pasta: fração volumétrica de (cim+água+sp+ar) — adim.   … (γ) */
  teorPastaGamma:         number;
  /** γ% — Teor de Pasta em percentual */
  teorPastaGammaPct:      number;
  /** α — Teor de Argamassa: fração volumétrica de (pasta+areias) — adim.  … (α) */
  teorArgamassaAlpha:     number;
  /** α% — Teor de Argamassa em percentual */
  teorArgamassaAlphaPct:  number;
  /** V_brita / 1000 — Fração volumétrica de agregado graúdo */
  teorGraudo:             number;
  /** m — Relação agregado/cimento em massa — adim.                        … (m) */
  relacaoAgregatoCimento: number;
  /** β_m — Fração de areia no total de agregados (volume)                … (βm) */
  fracaoAreiaBetaM:       number;
  /** a/c — Relação água/cimento em massa */
  relacaoAguaCimento:     number;
  /** Volumes individuais — L/m³ */
  volumes: {
    cimentoL:   number;
    aguaL:      number;
    areias:     number;
    britas:     number;
    aditivoSpL: number;
    arL:        number;
    pastaL:     number;
    argamassaL: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — KPIs DE DESEMPENHO
// ─────────────────────────────────────────────────────────────────────────────

/** KPIs de eficiência técnico-econômica-ambiental para um traço */
export interface KpiTraco {
  /** Identificador do traço */
  idTraco:                string;
  /** Descrição do traço */
  descricao:              string;

  /** mc — Consumo de cimento — kg/m³ */
  consumoCimentoKgM3:     number;
  /** fcm — Resistência de dosagem (valor esperado) — MPa */
  fcmMPa:                 number;
  /** fck — Resistência característica especificada — MPa */
  fckMPa:                 number;
  /** fcm_real — Resistência real medida aos 28d (média do lote) — MPa */
  fcmRealMPa?:            number;

  // ── Eficiência Técnica ──────────────────────────────────────────────────
  /** η = fcm/mc   [MPa·m³/kg] — maior é melhor                           … (η) */
  eficienciaCimentoEta:   number;
  /** η⁻¹ = mc/fcm  [kg/MPa/m³] — menor é melhor                         … (η⁻¹) */
  cimentoPorResistencia:  number;

  // ── Eficiência Econômica ────────────────────────────────────────────────
  /** Custo total do traço — R$/m³ */
  custoM3:                number;
  /** Custo/MPa = custo_m3 / fcm — R$/MPa                                 … (C/MPa) */
  custoPorMPa:            number;

  // ── Eficiência Ambiental ────────────────────────────────────────────────
  /** Emissão de CO₂ total — kg/m³ */
  co2KgM3:                number;
  /** CO₂/MPa = co2 / fcm — kg CO₂/MPa                                   … (E/MPa) */
  co2PorMPa:              number;

  // ── Indicadores Volumétricos ────────────────────────────────────────────
  volumetricos:           IndicadoresVolumetricos;
}

/** Pesos de ponderação para o score de ranking composto */
export interface PesosRanking {
  /** Peso do custo/m³ (menor é melhor) — default: 0.40 */
  custo:           number;
  /** Peso do CO₂/m³ (menor é melhor) — default: 0.30 */
  co2:             number;
  /** Peso da eficiência η (maior é melhor) — default: 0.30 */
  eficiencia:      number;
  /** Peso do custo/MPa (menor é melhor) — default: 0 (derivado) */
  custoPorMPa?:    number;
}

/** Default de pesos — balanceia técnica, economia e ambiente */
export const PESOS_RANKING_PADRAO: PesosRanking = {
  custo:      0.40,
  co2:        0.30,
  eficiencia: 0.30,
} as const;

/** Posição de um traço na matriz de comparação */
export interface CandidatoRanking {
  /** KPIs calculados */
  kpi:                   KpiTraco;
  /** Score normalizado composto [0, 1] — maior é melhor */
  scoreComposto:         number;
  /** Posição no ranking (1 = melhor) */
  posicaoRanking:        number;
  /** Scores individuais normalizados [0, 1] */
  scoresIndividuais: {
    custo:           number;
    co2:             number;
    eficiencia:      number;
  };
}

/** Delta entre dois traços para um KPI específico */
export interface DeltaKpi {
  kpi:           string;
  unidade:       string;
  valorA:        number;
  valorB:        number;
  delta:         number;     // valorA − valorB
  deltaPct:      number;     // (valorA − valorB) / |valorB| × 100
  /** true: traço A é melhor neste KPI */
  aVenceu:       boolean;
}

/** Comparação pairwise entre dois traços */
export interface ComparacaoPar {
  idTracoA:      string;
  idTracoB:      string;
  deltas:        DeltaKpi[];
  /** Traço com melhor score composto neste par */
  vencedor:      string;
}

/** Resultado completo da comparação multi-traço */
export interface ResultadoComparativo {
  /** KPIs de cada traço (entrada) */
  kpis:           KpiTraco[];
  /** Ranking ordenado */
  ranking:        CandidatoRanking[];
  /** Pesos utilizados no ranking */
  pesosUsados:    PesosRanking;
  /** Matriz pairwise (triangular superior) */
  matrizDeltas:   ComparacaoPar[];
  /** Traço com menor custo/m³ */
  menorCusto:     string;
  /** Traço com menor CO₂/m³ */
  menorCo2:       string;
  /** Traço com maior eficiência η */
  maiorEficiencia: string;
  /** Resumo em texto para relatório */
  resumo:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — RECALIBRAÇÃO DE ABRAMS
// ─────────────────────────────────────────────────────────────────────────────

/** Par de dados experimentais para recalibração */
export interface PontoAbrams {
  /** a/c da betonada */
  relacaoAC:          number;
  /** Resistência medida — MPa (média do lote ou valor único) */
  fcMPa:              number;
  /** Idade de rompimento — dias (default: 28) */
  idadeDias?:         number;
  /** Identificação da betonada */
  idBetonada?:        string;
}

/** Constantes calibradas da curva de Abrams */
export interface ConstantesAbrams {
  /** A — resistência teórica para a/c → 0 — MPa */
  A:    number;
  /** B — base da exponencial de decaimento — adim. */
  B:    number;
  /** γ — expoente temporal (apenas modelo multi-idade) */
  gamma?: number;
}

/** Intervalo de confiança de um parâmetro */
export interface IntervaloConfianca {
  estimativa:  number;
  inferior95:  number;
  superior95:  number;
  erroPadrao:  number;
}

/** Resultado completo da recalibração de Abrams */
export interface ResultadoRecalibracao {
  /** Constantes calibradas para este ecossistema */
  constantesCal:           ConstantesAbrams;
  /** Constantes originais (antes da calibração) */
  constantesOriginais?:    ConstantesAbrams;
  /** R² do ajuste — [0, 1] */
  r2:                      number;
  /** RMSE do ajuste — MPa */
  rmseMPa:                 number;
  /** Número de pontos usados na regressão */
  nPontos:                 number;
  /** Graus de liberdade do resíduo */
  gl:                      number;
  /** Intervalo de confiança 95% para ln(A) */
  icLnA:                   IntervaloConfianca;
  /** Intervalo de confiança 95% para ln(B) */
  icLnB:                   IntervaloConfianca;
  /** Intervalo de confiança 95% para γ (multi-idade) */
  icGamma?:                IntervaloConfianca;
  /** Resíduos por ponto — MPa */
  residuos:                Array<{ id?: string; ac: number; fcReal: number; fcPred: number; residuo: number }>;
  /** Previsões para a/c de interesse */
  previsoes?:              Array<{ ac: number; fcPrev28d: number }>;
  /** Foi usada regressão multi-idade? */
  modeloMultiIdade:        boolean;
  /** Advertência de qualidade do ajuste */
  advertencias:            string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — ENTRADA DO MOTOR DE COMPARAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dados mínimos necessários para comparar um traço.
 * Pode ser alimentado diretamente pela saída de calcularDosagem (dosagem.ts)
 * ou inserido manualmente para traços históricos.
 */
export interface EntradaTraco {
  id:               string;
  descricao:        string;
  /** Resultado da dosagem (fornece composição volumétrica) */
  dosagem?:         ResultadoDosagem;
  /** Se não há ResultadoDosagem, informar manualmente: */
  mc?:              number;   // consumo cimento kg/m³
  fcmMPa?:         number;   // resistência de dosagem MPa
  fckMPa?:         number;   // fck especificado MPa
  custoM3?:         number;   // custo total R$/m³
  co2KgM3?:         number;   // emissões kg CO₂/m³
  composicaoM3?:    ComposicaoM3;  // volumes detalhados
  /** Resultados reais medidos em laboratório */
  resultadosLab?:   ResultadosEndurecidos[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROS TIPADOS
// ─────────────────────────────────────────────────────────────────────────────

export class ComparativoNPontosInsuficientesError extends Error {
  constructor(n: number, minimo: number) {
    super(
      `Recalibração de Abrams requer ao menos ${minimo} pontos experimentais. ` +
      `Recebidos: ${n}.`
    );
    this.name = "ComparativoNPontosInsuficientesError";
  }
}

export class ComparativoTracosInsuficientesError extends Error {
  constructor() {
    super("São necessários ao menos 2 traços para comparação.");
    this.name = "ComparativoTracosInsuficientesError";
  }
}

export class ComparativoAcVariacaoInsuficienteError extends Error {
  constructor() {
    super(
      "Os pontos experimentais devem cobrir ao menos 2 valores distintos de a/c " +
      "para permitir a regressão de Abrams."
    );
    this.name = "ComparativoAcVariacaoInsuficienteError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 1 — INDICADORES VOLUMÉTRICOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula os indicadores volumétricos fundamentais de um traço de concreto.
 *
 * Equações:
 *   γ = (V_cim + V_água + V_sp + V_ar) / 1000                            … (γ)
 *   α = (V_pasta + V_areias) / 1000                                       … (α)
 *   m = Σm_agr / m_cim                                                    … (m)
 *   β_m = V_areias / (V_areias + V_britas)                                … (βm)
 *
 * @param composicao  ComposicaoM3 (saída de calcularDosagem)
 * @returns           IndicadoresVolumetricos
 *
 * @example
 * // Traço C30: mc=320, a/c=0.55
 * calcularIndicadoresVolumetricos(composicao)
 * // → { teorPastaGammaPct: 30.56, teorArgamassaAlphaPct: 72.23, m: 5.75, ... }
 */
export function calcularIndicadoresVolumetricos(
  composicao: ComposicaoM3
): IndicadoresVolumetricos {
  const c  = composicao;

  // Volumes — L/m³ (generic N materials)
  const vCim    = _volPorCategoria(c, "cimento");
  const vAgua   = _volPorCategoria(c, "agua");
  const vSp     = _volPorCategoria(c, "aditivoSp");
  const vAreias = _volPorCategoria(c, "areia");
  const vBritas = _volPorCategoria(c, "brita");
  const vScm    = _volPorCategoria(c, "scm");

  /**
   * Volume de ar aprisionado — L/m³.
   * Agora incluído como linha com categoria "ar" na composição.
   * Fallback: derivar pelo fechamento volumétrico.
   */
  const vArDireto = _volPorCategoria(c, "ar");
  const vArCalculado = vArDireto > 0 ? vArDireto : 1000 - (vCim + vAgua + vSp + vScm + vAreias + vBritas);
  const vAr = Math.min(Math.max(vArCalculado, 0), 80);

  const vPasta     = vCim + vAgua + vSp + vAr + vScm;
  const vArgamassa = vPasta + vAreias;

  // Massas
  const mCim  = _massPorCategoria(c, "cimento");
  const mAgua = _massPorCategoria(c, "agua");
  const mAreias = _massPorCategoria(c, "areia");
  const mBritas = _massPorCategoria(c, "brita");

  const mAgr = mAreias + mBritas;

  // Indicadores … (γ)(α)(m)(βm)
  const gamma  = _r4(vPasta / 1000);
  const alpha  = _r4(vArgamassa / 1000);
  const m      = mCim > 0 ? _r3(mAgr / mCim) : 0;
  const betaM  = (vAreias + vBritas) > 0 ? _r4(vAreias / (vAreias + vBritas)) : 0;
  const ac     = mCim > 0 ? _r3(mAgua / mCim) : 0;

  return {
    teorPastaGamma:         gamma,
    teorPastaGammaPct:      _r2(gamma * 100),
    teorArgamassaAlpha:     alpha,
    teorArgamassaAlphaPct:  _r2(alpha * 100),
    teorGraudo:             _r4(vBritas / 1000),
    relacaoAgregatoCimento: m,
    fracaoAreiaBetaM:       betaM,
    relacaoAguaCimento:     ac,
    volumes: {
      cimentoL:   _r2(vCim),
      aguaL:      _r2(vAgua),
      areias:     _r2(vAreias),
      britas:     _r2(vBritas),
      aditivoSpL: _r2(vSp),
      arL:        _r2(vAr),
      pastaL:     _r2(vPasta),
      argamassaL: _r2(vArgamassa),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 2 — CÁLCULO DOS KPIs DE UM TRAÇO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai e calcula todos os KPIs técnico-econômico-ambientais de um traço.
 *
 *   η     = fcm / mc                                                      … (η)
 *   η⁻¹   = mc / fcm                                                     … (η⁻¹)
 *   C/MPa = custo_m3 / fcm                                               … (C/MPa)
 *   E/MPa = co2 / fcm                                                    … (E/MPa)
 *
 * @param entrada  Dados do traço (com ou sem ResultadoDosagem)
 * @returns        KpiTraco completo
 */
export function calcularKpiTraco(entrada: EntradaTraco): KpiTraco {
  // Extrair valores da dosagem ou dos inputs diretos
  const dosagem   = entrada.dosagem;
  const comp      = dosagem?.composicaoM3 ?? entrada.composicaoM3;

  const mc     = dosagem ? _massPorCategoria(dosagem.composicaoM3, "cimento") : (entrada.mc ?? 0);
  const fcm    = dosagem?.abrams.fcjMPa                  ?? entrada.fcmMPa ?? 0;
  const fck    = dosagem?.abrams.fcjMPa                  ?? entrada.fckMPa ?? fcm;
  const custo  = dosagem
    ? _somarCustos(dosagem.composicaoM3)
    : (entrada.custoM3 ?? 0);
  const co2    = dosagem
    ? _somarCo2(dosagem.composicaoM3)
    : (entrada.co2KgM3 ?? 0);

  // Resultado real (média dos 28d, se disponível)
  const resultados28d = entrada.resultadosLab
    ?.filter((r) => r.idadeRompimento === "28d")
    .flatMap((r) => r.compressao ?? [])
    .map((c) => c.fcMPa) ?? [];
  const fcmReal = resultados28d.length > 0
    ? _r2(resultados28d.reduce((a, b) => a + b, 0) / resultados28d.length)
    : undefined;

  // KPIs eficiência                                                        … (η)(C/MPa)(E/MPa)
  const eta               = mc > 0 ? _r4(fcm / mc)    : 0;
  const cimentoPorRes     = fcm > 0 ? _r2(mc / fcm)   : 0;
  const custoPorMPa       = fcm > 0 ? _r2(custo / fcm) : 0;
  const co2PorMPa         = fcm > 0 ? _r2(co2 / fcm)   : 0;

  // Indicadores volumétricos
  const volumetricos = comp
    ? calcularIndicadoresVolumetricos(comp)
    : _indicadoresFallback(mc, fcm, entrada.dosagem?.abrams.relacaoAc.acAdotado ?? 0);

  return {
    idTraco:               entrada.id,
    descricao:             entrada.descricao,
    consumoCimentoKgM3:    _r2(mc),
    fcmMPa:                _r2(fcm),
    fckMPa:                _r2(fck),
    fcmRealMPa:            fcmReal,
    eficienciaCimentoEta:  eta,
    cimentoPorResistencia: cimentoPorRes,
    custoM3:               _r2(custo),
    custoPorMPa,
    co2KgM3:               _r2(co2),
    co2PorMPa,
    volumetricos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 3 — MOTOR DE COMPARAÇÃO MULTI-TRAÇO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compara múltiplos traços de concreto e retorna ranking matricial completo.
 *
 * Pipeline:
 *   1. Calcula KPIs para cada traço
 *   2. Normaliza cada KPI em [0, 1] (min-max)
 *   3. Pondera e soma os scores individuais → score composto
 *   4. Ordena pelo score composto (maior = melhor)
 *   5. Monta matriz de deltas pairwise
 *
 * Score composto:
 *   S = w_custo × score_custo + w_co2 × score_co2 + w_eta × score_eta    … (S)
 *   onde score_custo = 1 − (custo − min) / (max − min)   (menor é melhor)
 *         score_co2  = 1 − (co2 − min) / (max − min)     (menor é melhor)
 *         score_eta  = (η − min) / (max − min)            (maior é melhor)
 *
 * @param tracos   Lista de traços a comparar (mínimo: 2)
 * @param pesos    Pesos de ponderação (default: custo=0.40, CO₂=0.30, η=0.30)
 * @returns        ResultadoComparativo completo
 *
 * @throws ComparativoTracosInsuficientesError se < 2 traços
 */
export function compararTracos(
  tracos: EntradaTraco[],
  pesos:  PesosRanking = PESOS_RANKING_PADRAO
): ResultadoComparativo {
  if (tracos.length < 2) throw new ComparativoTracosInsuficientesError();

  // ── 1. Calcular KPIs ────────────────────────────────────────────────────
  const kpis = tracos.map(calcularKpiTraco);

  // ── 2. Normalização min-max ──────────────────────────────────────────────
  const custos   = kpis.map((k) => k.custoM3);
  const co2s     = kpis.map((k) => k.co2KgM3);
  const etas     = kpis.map((k) => k.eficienciaCimentoEta);

  const normMin = (vals: number[]) => {
    const mn = Math.min(...vals), mx = Math.max(...vals);
    return vals.map((v) => mx > mn ? _r4(1 - (v - mn) / (mx - mn)) : 1);
  };
  const normMax = (vals: number[]) => {
    const mn = Math.min(...vals), mx = Math.max(...vals);
    return vals.map((v) => mx > mn ? _r4((v - mn) / (mx - mn)) : 0);
  };

  const sCusto = normMin(custos);
  const sCo2   = normMin(co2s);
  const sEta   = normMax(etas);

  const pesosNorm = _normalizarPesos(pesos);

  // ── 3. Score composto e ranking ──────────────────────────────────────────
  const candidatos: CandidatoRanking[] = kpis.map((kpi, i) => {
    const score = _r4(
      pesosNorm.custo      * sCusto[i]! +
      pesosNorm.co2        * sCo2[i]!   +
      pesosNorm.eficiencia * sEta[i]!
    );
    return {
      kpi,
      scoreComposto:   score,
      posicaoRanking:  0, // preenchido após ordenação
      scoresIndividuais: {
        custo:      sCusto[i]!,
        co2:        sCo2[i]!,
        eficiencia: sEta[i]!,
      },
    };
  });

  candidatos.sort((a, b) => b.scoreComposto - a.scoreComposto);
  candidatos.forEach((c, i) => { c.posicaoRanking = i + 1; });

  // ── 4. Matriz de deltas pairwise ─────────────────────────────────────────
  const matrizDeltas: ComparacaoPar[] = [];

  for (let i = 0; i < kpis.length; i++) {
    for (let j = i + 1; j < kpis.length; j++) {
      const A = kpis[i]!; const B = kpis[j]!;
      const deltas = _calcularDeltas(A, B);
      const vencedor = candidatos.find((c) => c.kpi.idTraco === A.idTraco)!.posicaoRanking <
                       candidatos.find((c) => c.kpi.idTraco === B.idTraco)!.posicaoRanking
        ? A.idTraco : B.idTraco;
      matrizDeltas.push({ idTracoA: A.idTraco, idTracoB: B.idTraco, deltas, vencedor });
    }
  }

  // ── 5. Destaques ─────────────────────────────────────────────────────────
  const iMinCusto   = custos.indexOf(Math.min(...custos));
  const iMinCo2     = co2s.indexOf(Math.min(...co2s));
  const iMaxEta     = etas.indexOf(Math.max(...etas));

  const melhor = candidatos[0]!.kpi;
  const resumo = [
    `Análise de ${kpis.length} traços concluída.`,
    `🏆 Melhor score: ${melhor.descricao} (score ${candidatos[0]!.scoreComposto.toFixed(3)}).`,
    `💰 Menor custo: ${kpis[iMinCusto]!.descricao} (R$ ${Math.min(...custos).toFixed(2)}/m³).`,
    `🌱 Menor CO₂: ${kpis[iMinCo2]!.descricao} (${Math.min(...co2s).toFixed(1)} kg/m³).`,
    `⚡ Maior eficiência: ${kpis[iMaxEta]!.descricao} (${Math.max(...etas).toFixed(4)} MPa·m³/kg).`,
  ].join(" ");

  return {
    kpis,
    ranking:         candidatos,
    pesosUsados:     pesosNorm,
    matrizDeltas,
    menorCusto:      kpis[iMinCusto]!.idTraco,
    menorCo2:        kpis[iMinCo2]!.idTraco,
    maiorEficiencia: kpis[iMaxEta]!.idTraco,
    resumo,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 4 — RETROALIMENTAÇÃO DA CURVA DE ABRAMS (OLS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalibra as constantes A e B da curva de Abrams para o ecossistema
 * específico do laboratório, usando Mínimos Quadrados Ordinários (OLS).
 *
 * Modelo univariado (apenas a/c, todos os pontos a 28d):
 *   ln(fc) = ln(A) − (a/c) × ln(B)                                       … (Ab)
 *   β = (XᵀX)⁻¹ Xᵀy                                                     … (OLS)
 *
 * Modelo bivariado (a/c + idade — ativado automaticamente se houver
 * pontos em múltiplas idades):
 *   ln(fc) = ln(A) + γ × ln(t/28) − (a/c) × ln(B)                       … (AbM)
 *
 * Intervalos de confiança 95%:
 *   σ² = SS_res / (n − p)
 *   IC(βᵢ) = βᵢ ± t_{0.025, n−p} × √(σ² × [(XᵀX)⁻¹]ᵢᵢ)
 *   t_{0.025, ∞} ≈ 1.96; t para graus finitos via aproximação de Cornish-Fisher
 *
 * @param pontos            Pontos experimentais [(a/c, fc, idade?)]
 * @param constantesOriginais  Parâmetros do modelo teórico para comparação
 * @param acPrevisao        Valores de a/c para gerar previsões pós-calibração
 *
 * @throws ComparativoNPontosInsuficientesError se n < 3
 * @throws ComparativoAcVariacaoInsuficienteError se todos a/c iguais
 */
export function recalibrarAbrams(
  pontos:              PontoAbrams[],
  constantesOriginais?: ConstantesAbrams,
  acPrevisao?:         number[]
): ResultadoRecalibracao {
  const MINIMO = 3;
  if (pontos.length < MINIMO) {
    throw new ComparativoNPontosInsuficientesError(pontos.length, MINIMO);
  }

  // Verificar variação de a/c
  const acsUnicos = new Set(pontos.map((p) => p.relacaoAC));
  if (acsUnicos.size < 2) {
    throw new ComparativoAcVariacaoInsuficienteError();
  }

  // Detectar se há múltiplas idades (modelo bivariado)
  const idadesUnicas = new Set(pontos.map((p) => p.idadeDias ?? 28));
  const multiIdade   = idadesUnicas.size > 1;

  const advertencias: string[] = [];

  if (multiIdade) {
    return _recalibrarMultiIdade(pontos, constantesOriginais, acPrevisao, advertencias);
  }

  // ── Regressão OLS univariada ─────────────────────────────────────────────
  // y = β₀ + β₁ × x    onde y = ln(fc), x = a/c
  // β₀ = ln(A), β₁ = -ln(B)
  const n  = pontos.length;
  const xs = pontos.map((p) => p.relacaoAC);
  const ys = pontos.map((p) => Math.log(p.fcMPa));

  const { beta, varBeta, ssRes, r2 } = _olsSimples(xs, ys);
  const [b0, b1] = beta;

  const A = Math.exp(b0!);
  const B = Math.exp(-b1!);

  const gl   = n - 2;
  const s2   = gl > 0 ? ssRes / gl : 0;
  const tVal = _tQuantil95(gl);

  // Intervalos de confiança
  const icLnA = _ic(b0!, Math.sqrt(s2 * varBeta[0]!), tVal);
  const icLnB = _ic(b1!, Math.sqrt(s2 * varBeta[1]!), tVal);

  // Resíduos
  const residuos = pontos.map((p) => {
    const fcPred = A / (B ** p.relacaoAC);
    return {
      id:       p.idBetonada,
      ac:       p.relacaoAC,
      fcReal:   p.fcMPa,
      fcPred:   _r2(fcPred),
      residuo:  _r2(p.fcMPa - fcPred),
    };
  });

  const rmse = _r3(Math.sqrt(ssRes / n));

  // Previsões
  const previsoes = acPrevisao?.map((ac) => ({
    ac,
    fcPrev28d: _r2(A / (B ** ac)),
  }));

  // Advertências de qualidade
  if (r2 < 0.90) {
    advertencias.push(
      `R² = ${r2.toFixed(4)} < 0.90 — ajuste fraco. Verifique a homogeneidade dos materiais ou adicione mais pontos.`
    );
  }
  if (n < 5) {
    advertencias.push(
      `Apenas ${n} pontos — recomenda-se ≥ 5 pares (a/c, fc) para calibração confiável.`
    );
  }
  if (B < 2 || B > 30) {
    advertencias.push(
      `B = ${_r3(B)} está fora do intervalo típico [2, 30]. Verifique os dados de entrada.`
    );
  }

  return {
    constantesCal:        { A: _r3(A), B: _r4(B) },
    constantesOriginais,
    r2:                   _r4(r2),
    rmseMPa:              rmse,
    nPontos:              n,
    gl,
    icLnA:                { estimativa: _r4(b0!), ...icLnA, erroPadrao: _r4(Math.sqrt(s2 * varBeta[0]!)) },
    icLnB:                { estimativa: _r4(b1!), ...icLnB, erroPadrao: _r4(Math.sqrt(s2 * varBeta[1]!)) },
    residuos,
    previsoes,
    modeloMultiIdade:     false,
    advertencias,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO 5 — PREVISÃO COM ABRAMS CALIBRADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prevê a resistência para um dado a/c e idade usando as constantes
 * calibradas pela retroalimentação de Abrams.
 *
 *   Modelo 28d: fc = A / B^(a/c)
 *   Modelo multi-idade: fc(t) = A × (t/28)^γ / B^(a/c)                  … (AbM)
 *
 * @param ac         Relação água/cimento
 * @param constantes Constantes calibradas (saída de recalibrarAbrams)
 * @param idadeDias  Idade — dias (default: 28)
 */
export function preverResistenciaAbrams(
  ac:         number,
  constantes: ConstantesAbrams,
  idadeDias:  number = 28
): number {
  const { A, B, gamma } = constantes;
  const base = A / (B ** ac);
  if (gamma !== undefined && idadeDias !== 28) {
    return _r2(base * (idadeDias / 28) ** gamma);
  }
  return _r2(base);
}

/**
 * Prevê o a/c necessário para atingir uma resistência alvo aos 28d.
 * Inversão analítica da equação de Abrams:
 *   a/c = ln(A / fc) / ln(B)
 *
 * @param fcAlvoMPa  Resistência alvo (fcj ou fck + margem) — MPa
 * @param constantes Constantes calibradas
 */
export function inverterAbrams(
  fcAlvoMPa:  number,
  constantes: ConstantesAbrams
): number {
  const { A, B } = constantes;
  if (A <= 0 || B <= 1 || fcAlvoMPa <= 0) return NaN;
  const ac = Math.log(A / fcAlvoMPa) / Math.log(B);
  return _r3(Math.max(0.20, Math.min(1.20, ac)));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/** OLS simples: y = β₀ + β₁x */
function _olsSimples(xs: number[], ys: number[]): {
  beta: number[]; varBeta: number[]; ssRes: number; r2: number;
} {
  const n     = xs.length;
  const xBar  = xs.reduce((a, b) => a + b, 0) / n;
  const yBar  = ys.reduce((a, b) => a + b, 0) / n;

  const Sxy = xs.reduce((a, x, i) => a + (x - xBar) * (ys[i]! - yBar), 0);
  const Sxx = xs.reduce((a, x) => a + (x - xBar) ** 2, 0);
  const Syy = ys.reduce((a, y) => a + (y - yBar) ** 2, 0);

  const b1   = Sxy / Sxx;
  const b0   = yBar - b1 * xBar;
  const yHat = xs.map((x) => b0 + b1 * x);
  const ssRes = ys.reduce((a, y, i) => a + (y - yHat[i]!) ** 2, 0);
  const r2    = Syy > 0 ? 1 - ssRes / Syy : 1;

  // Var(β) = s² × (XᵀX)⁻¹ — elementos diagonais
  // (XᵀX)⁻¹ para modelo simples:
  //   [1/n + x̄²/Sxx,  -x̄/Sxx]
  //   [-x̄/Sxx,         1/Sxx ]
  const varB0 = 1 / n + xBar ** 2 / Sxx;
  const varB1 = 1 / Sxx;

  return { beta: [b0, b1], varBeta: [varB0, varB1], ssRes, r2 };
}

/** Recalibração multi-idade: ln(fc) = β₀ + β₁×(a/c) + β₂×ln(t/28) — OLS 3D */
function _recalibrarMultiIdade(
  pontos:              PontoAbrams[],
  constantesOriginais: ConstantesAbrams | undefined,
  acPrevisao:          number[] | undefined,
  advertencias:        string[]
): ResultadoRecalibracao {
  const n = pontos.length;
  const p = 3; // parâmetros

  // Montar X e y
  const X  = pontos.map((pt) => [1, pt.relacaoAC, Math.log((pt.idadeDias ?? 28) / 28)]);
  const Y  = pontos.map((pt) => Math.log(pt.fcMPa));
  const yBar = Y.reduce((a, b) => a + b, 0) / n;

  // β = (XᵀX)⁻¹ Xᵀy — resolvemos via eliminação de Gauss 3×3
  const { beta, covBeta, ssRes } = _ols3d(X, Y);
  const [b0, b1, b2] = beta;

  const A     = Math.exp(b0!);
  const B     = Math.exp(-b1!);
  const gamma = b2!;

  const Syy   = Y.reduce((a, y) => a + (y - yBar) ** 2, 0);
  const r2    = Syy > 0 ? _r4(1 - ssRes / Syy) : 1;
  const gl    = Math.max(n - p, 1);
  const s2    = ssRes / gl;
  const tVal  = _tQuantil95(gl);
  const rmse  = _r3(Math.sqrt(ssRes / n));

  const icLnA   = _ic(b0!, Math.sqrt(s2 * covBeta[0]![0]!), tVal);
  const icLnB   = _ic(b1!, Math.sqrt(s2 * covBeta[1]![1]!), tVal);
  const icGamma = _ic(b2!, Math.sqrt(s2 * covBeta[2]![2]!), tVal);

  const residuos = pontos.map((pt) => {
    const t      = pt.idadeDias ?? 28;
    const fcPred = A * (t / 28) ** gamma / (B ** pt.relacaoAC);
    return {
      id:       pt.idBetonada,
      ac:       pt.relacaoAC,
      fcReal:   pt.fcMPa,
      fcPred:   _r2(fcPred),
      residuo:  _r2(pt.fcMPa - fcPred),
    };
  });

  const previsoes = acPrevisao?.map((ac) => ({
    ac,
    fcPrev28d: _r2(A / (B ** ac)),
  }));

  if (r2 < 0.90) {
    advertencias.push(`R² multi-idade = ${r2} < 0.90. Verifique consistência dos lotes.`);
  }

  return {
    constantesCal:        { A: _r3(A), B: _r4(B), gamma: _r4(gamma) },
    constantesOriginais,
    r2, rmseMPa: rmse, nPontos: n, gl,
    icLnA:   { estimativa: _r4(b0!), ...icLnA, erroPadrao: _r4(Math.sqrt(s2 * covBeta[0]![0]!)) },
    icLnB:   { estimativa: _r4(b1!), ...icLnB, erroPadrao: _r4(Math.sqrt(s2 * covBeta[1]![1]!)) },
    icGamma: { estimativa: _r4(b2!), ...icGamma, erroPadrao: _r4(Math.sqrt(s2 * covBeta[2]![2]!)) },
    residuos, previsoes,
    modeloMultiIdade: true,
    advertencias,
  };
}

/** OLS 3D via eliminação de Gauss — retorna β e (XᵀX)⁻¹ */
function _ols3d(X: number[][], Y: number[]): {
  beta: number[]; covBeta: number[][]; ssRes: number;
} {
  const n = X.length;

  // XᵀX (3×3) e XᵀY (3×1)
  const XtX: number[][] = [[0,0,0],[0,0,0],[0,0,0]];
  const XtY: number[]   = [0, 0, 0];

  for (let i = 0; i < n; i++) {
    for (let r = 0; r < 3; r++) {
      XtY[r]! += X[i]![r]! * Y[i]!;
      for (let c = 0; c < 3; c++) {
        XtX[r]![c]! += X[i]![r]! * X[i]![c]!;
      }
    }
  }

  // Gauss-Jordan 3×3 em matriz aumentada [XtX | I] → [I | (XtX)⁻¹]
  const aug = XtX.map((row, i) => [
    ...row,
    i === 0 ? 1 : 0,
    i === 1 ? 1 : 0,
    i === 2 ? 1 : 0,
  ]);

  for (let col = 0; col < 3; col++) {
    // Pivot
    let maxRow = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(aug[row]![col]!) > Math.abs(aug[maxRow]![col]!)) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow]!, aug[col]!];

    const pivot = aug[col]![col]!;
    if (Math.abs(pivot) < 1e-12) continue;

    for (let j = 0; j < 6; j++) aug[col]![j]! /= pivot;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const factor = aug[row]![col]!;
      for (let j = 0; j < 6; j++) aug[row]![j]! -= factor * aug[col]![j]!;
    }
  }

  const inv = aug.map((row) => row.slice(3));

  // β = (XtX)⁻¹ × XtY
  const beta = [0, 1, 2].map((i) =>
    inv[i]!.reduce((acc, v, j) => acc + v * XtY[j]!, 0)
  );

  // SS resíduos
  const ssRes = Y.reduce((acc, y, i) => {
    const yHat = X[i]!.reduce((s, x, j) => s + x * beta[j]!, 0);
    return acc + (y - yHat) ** 2;
  }, 0);

  return { beta, covBeta: inv, ssRes };
}

/** Intervalo de confiança simétrico */
function _ic(estimativa: number, erroPadrao: number, t: number): { inferior95: number; superior95: number } {
  return {
    inferior95: _r4(estimativa - t * erroPadrao),
    superior95: _r4(estimativa + t * erroPadrao),
  };
}

/**
 * Quantil t de Student para IC 95% (bilateral α=0.05).
 * Aproximação de Cornish-Fisher para gl ≥ 1; usa 1.96 para gl → ∞.
 */
function _tQuantil95(gl: number): number {
  if (gl <= 0)  return 1.96;
  if (gl === 1) return 12.706;
  if (gl === 2) return 4.303;
  if (gl === 3) return 3.182;
  if (gl === 4) return 2.776;
  if (gl === 5) return 2.571;
  if (gl === 10) return 2.228;
  if (gl === 20) return 2.086;
  if (gl === 30) return 2.042;
  if (gl >= 120) return 1.96;
  // Interpolação linear simples para valores intermediários
  return 1.96 + 4.0 / Math.sqrt(gl);
}

/** Soma todos os custos de uma composição de 1 m³ */
function _somarCustos(comp: ComposicaoM3): number {
  return _r2(comp.linhas.reduce((a, l) => a + (l.custoReaisM3 ?? 0), 0));
}

/** Soma todas as emissões de CO₂ de uma composição de 1 m³ */
function _somarCo2(comp: ComposicaoM3): number {
  return _r2(comp.linhas.reduce((a, l) => a + (l.co2KgM3 ?? 0), 0));
}

/** Calcula deltas pairwise entre dois traços */
function _calcularDeltas(A: KpiTraco, B: KpiTraco): DeltaKpi[] {
  const _delta = (
    kpi:   string,
    unidade: string,
    va:    number,
    vb:    number,
    menorMelhor = true
  ): DeltaKpi => {
    const delta    = _r2(va - vb);
    const deltaPct = vb !== 0 ? _r2(delta / Math.abs(vb) * 100) : 0;
    const aVenceu  = menorMelhor ? va < vb : va > vb;
    return { kpi, unidade, valorA: va, valorB: vb, delta, deltaPct, aVenceu };
  };

  return [
    _delta("Custo",              "R$/m³",   A.custoM3,               B.custoM3,               true),
    _delta("CO₂",                "kg/m³",   A.co2KgM3,               B.co2KgM3,               true),
    _delta("Cimento",            "kg/m³",   A.consumoCimentoKgM3,    B.consumoCimentoKgM3,    true),
    _delta("Resistência (fcm)",  "MPa",     A.fcmMPa,                B.fcmMPa,                false),
    _delta("Eficiência η",       "MPa·m³/kg", A.eficienciaCimentoEta, B.eficienciaCimentoEta, false),
    _delta("Custo/MPa",          "R$/MPa",  A.custoPorMPa,           B.custoPorMPa,           true),
    _delta("CO₂/MPa",            "kg/MPa",  A.co2PorMPa,             B.co2PorMPa,             true),
  ];
}

/** Normaliza os pesos de ranking para que somem 1 */
function _normalizarPesos(p: PesosRanking): PesosRanking {
  const total = p.custo + p.co2 + p.eficiencia + (p.custoPorMPa ?? 0);
  if (total <= 0) return PESOS_RANKING_PADRAO;
  return {
    custo:      _r4(p.custo / total),
    co2:        _r4(p.co2 / total),
    eficiencia: _r4(p.eficiencia / total),
    custoPorMPa: p.custoPorMPa ? _r4(p.custoPorMPa / total) : undefined,
  };
}

/** Fallback para indicadores volumétricos sem composição detalhada */
function _indicadoresFallback(mc: number, fcm: number, ac: number): IndicadoresVolumetricos {
  const mAgua = mc * ac;
  const rho   = 3.12; // densidade típica CP I-S (t/m³)
  const vCim  = mc / rho;
  const vAgua = mAgua;
  const vPasta = vCim + vAgua;

  return {
    teorPastaGamma:         _r4(vPasta / 1000),
    teorPastaGammaPct:      _r2(vPasta / 10),
    teorArgamassaAlpha:     0,
    teorArgamassaAlphaPct:  0,
    teorGraudo:             0,
    relacaoAgregatoCimento: 0,
    fracaoAreiaBetaM:       0,
    relacaoAguaCimento:     _r3(ac),
    volumes: {
      cimentoL: _r2(vCim), aguaL: _r2(vAgua),
      areias: 0, britas: 0, aditivoSpL: 0, arL: 0,
      pastaL: _r2(vPasta), argamassaL: 0,
    },
  };
}

// Arredondamentos
function _r2(v: number): number { return Math.round(v * 100) / 100; }
function _r3(v: number): number { return Math.round(v * 1000) / 1000; }
function _r4(v: number): number { return Math.round(v * 10000) / 10000; }
