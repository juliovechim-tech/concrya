/**
 * @file lib/ibracon4q.ts
 * @description Motor do Gráfico de 4 Quadrantes — IPT-EPUSP / IBRACON
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GRÁFICO DE 4 QUADRANTES (Helene & Terzian, 1992)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ferramenta gráfica clássica do método IPT-EPUSP que sintetiza as 4
 * relações fundamentais da dosagem em uma única visualização integrada:
 *
 *   Q1 (sup-dir): fc × a/c     — Lei de Abrams (resistência)
 *   Q2 (sup-esq): m × a/c      — Lei de Lyse (trabalhabilidade)
 *   Q3 (inf-esq): Cc × m       — Lei de Molinari (consumo de cimento)
 *   Q4 (inf-dir): fc × Cc      — Resultante (resistência × consumo)
 *
 * Onde:
 *   fc   = resistência à compressão (MPa)
 *   a/c  = relação água/cimento
 *   m    = traço unitário em massa seca (areias + britas por kg de cimento)
 *   Cc   = consumo de cimento (kg/m³)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LEIS UTILIZADAS:
 *
 * LEI DE ABRAMS:  fc = K1 / K2^(a/c)   ou   ln(fc) = A + B × ln(a/c)
 * LEI DE LYSE:    m = K3 + K4 × (a/c)  (linear, calibrado experimentalmente)
 * LEI DE MOLINARI: Cc = 1000 / (K + m × ρ_ag_medio / ρ_cim)
 *                  simplificado: Cc = 1000 / (1/ρc + a/c + m/ρag_medio)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * REFERÊNCIAS:
 *   [1] Helene, P. & Terzian, P. (1992). Manual de Dosagem e Controle. IPT-EPUSP.
 *   [2] IBRACON. Prática Recomendada — Dosagem de Concreto, 2003.
 *   [3] Mehta & Monteiro. Concreto: Microestrutura, Propriedades e Materiais. 4ª ed.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

/** Parâmetros de calibração do gráfico 4Q */
export interface Params4Q {
  /** Abrams: intercepto A (ln-ln) — ou coeficiente K1 (exponencial) */
  abramsA: number;
  /** Abrams: inclinação B (ln-ln) — ou K2 (exponencial) */
  abramsB: number;
  /** Abrams: formato da equação */
  abramsForm: "lnln" | "exponencial";

  /** Lyse: intercepto K3 (m quando a/c=0) */
  lyseK3: number;
  /** Lyse: inclinação K4 (Δm / Δ(a/c)) */
  lyseK4: number;

  /** Densidade do cimento — t/m³ (para Molinari) */
  densidadeCimentoTm3: number;
  /** Densidade média ponderada dos agregados — t/m³ */
  densidadeAgregadoMedioTm3: number;
  /** Densidade da água — t/m³ */
  densidadeAguaTm3?: number;
}

/** Um ponto em cada quadrante */
export interface Ponto4Q {
  /** Relação a/c */
  ac: number;
  /** Resistência fc (MPa) */
  fc: number;
  /** Traço unitário m (kg agg / kg cim) */
  m: number;
  /** Consumo de cimento Cc (kg/m³) */
  cc: number;
}

/** Dados completos para renderizar o gráfico 4Q */
export interface Resultado4Q {
  /** Pontos da curva (tipicamente 20-50 pontos) */
  curva: Ponto4Q[];
  /** Ponto de trabalho para o fck alvo */
  pontoTrabalho: Ponto4Q | null;
  /** Limites dos eixos sugeridos */
  limites: {
    fcMin: number; fcMax: number;
    acMin: number; acMax: number;
    mMin: number;  mMax: number;
    ccMin: number; ccMax: number;
  };
  /** Parâmetros usados */
  params: Params4Q;
}

/** Input do usuário para geração do gráfico */
export interface Input4Q {
  params: Params4Q;
  /** fck alvo — MPa (para marcar ponto de trabalho) */
  fckAlvoMPa?: number;
  /** sd campo — MPa */
  sdMPa?: number;
  /** fator t (Student) */
  fatorT?: number;
  /** Range de a/c para gerar a curva */
  acMin?: number;
  acMax?: number;
  /** Número de pontos na curva */
  nPontos?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Lei de Abrams: a/c → fc */
function abrams(ac: number, A: number, B: number, form: "lnln" | "exponencial"): number {
  if (form === "lnln") {
    // fc = exp(A) × ac^B  (B < 0)
    return Math.exp(A) * Math.pow(ac, B);
  }
  // Exponencial original: fc = A / B^(a/c)
  return A / Math.pow(B, ac);
}

/** Lei de Abrams inversa: fc → a/c */
function abramsInverso(fc: number, A: number, B: number, form: "lnln" | "exponencial"): number {
  if (form === "lnln") {
    // a/c = exp((ln(fc) - A) / B)
    return Math.exp((Math.log(fc) - A) / B);
  }
  // a/c = log_B(A/fc) = ln(A/fc) / ln(B)
  return Math.log(A / fc) / Math.log(B);
}

/** Lei de Lyse: a/c → m */
function lyse(ac: number, K3: number, K4: number): number {
  return K3 + K4 * ac;
}

/** Lei de Molinari: (a/c, m) → Cc (consumo de cimento kg/m³) */
function molinari(
  ac: number,
  m: number,
  rhoCim: number,
  rhoAg: number,
  rhoAgua: number = 1.0
): number {
  // Cc = 1000 / (1/ρc + ac/ρa + m/ρag)
  const denom = (1 / rhoCim) + (ac / rhoAgua) + (m / rhoAg);
  return denom > 0 ? 1000 / denom : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function gerarGrafico4Q(input: Input4Q): Resultado4Q {
  const { params, nPontos = 30 } = input;
  const acMin = input.acMin ?? 0.30;
  const acMax = input.acMax ?? 0.90;
  const rhoAgua = params.densidadeAguaTm3 ?? 1.0;

  const step = (acMax - acMin) / (nPontos - 1);
  const curva: Ponto4Q[] = [];

  for (let i = 0; i < nPontos; i++) {
    const ac = acMin + i * step;
    const fc = abrams(ac, params.abramsA, params.abramsB, params.abramsForm);
    const m  = lyse(ac, params.lyseK3, params.lyseK4);
    const cc = molinari(ac, m, params.densidadeCimentoTm3, params.densidadeAgregadoMedioTm3, rhoAgua);

    curva.push({
      ac: r2(ac),
      fc: r1(fc),
      m:  r2(m),
      cc: r1(cc),
    });
  }

  // Ponto de trabalho
  let pontoTrabalho: Ponto4Q | null = null;
  if (input.fckAlvoMPa !== undefined) {
    const sd = input.sdMPa ?? 4.0;
    const t  = input.fatorT ?? 1.65;
    const fcjAlvo = input.fckAlvoMPa + t * sd;

    const acAlvo = abramsInverso(fcjAlvo, params.abramsA, params.abramsB, params.abramsForm);
    if (acAlvo > 0 && acAlvo < 2.0) {
      const mAlvo  = lyse(acAlvo, params.lyseK3, params.lyseK4);
      const ccAlvo = molinari(acAlvo, mAlvo, params.densidadeCimentoTm3, params.densidadeAgregadoMedioTm3, rhoAgua);

      pontoTrabalho = {
        ac: r2(acAlvo),
        fc: r1(fcjAlvo),
        m:  r2(mAlvo),
        cc: r1(ccAlvo),
      };
    }
  }

  // Limites dos eixos
  const fcs = curva.map(p => p.fc);
  const ms  = curva.map(p => p.m);
  const ccs = curva.map(p => p.cc);

  const limites = {
    fcMin: 0,
    fcMax: Math.ceil(Math.max(...fcs) / 10) * 10,
    acMin: r2(acMin),
    acMax: r2(acMax),
    mMin:  Math.floor(Math.min(...ms)),
    mMax:  Math.ceil(Math.max(...ms)),
    ccMin: Math.floor(Math.min(...ccs) / 50) * 50,
    ccMax: Math.ceil(Math.max(...ccs) / 50) * 50,
  };

  return { curva, pontoTrabalho, limites, params };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRAÇÃO DE LYSE A PARTIR DE TRAÇOS EXPERIMENTAIS
// ─────────────────────────────────────────────────────────────────────────────

export interface PontoLyse {
  ac: number;
  m: number;
}

/**
 * Calibra os parâmetros K3 e K4 da Lei de Lyse por regressão OLS.
 * m = K3 + K4 × (a/c)
 */
export function calibrarLyse(pontos: PontoLyse[]): { K3: number; K4: number; r2: number } {
  const n = pontos.length;
  if (n < 2) return { K3: -2.0, K4: 12.0, r2: 0 };

  const sumX  = pontos.reduce((s, p) => s + p.ac, 0);
  const sumY  = pontos.reduce((s, p) => s + p.m,  0);
  const sumXY = pontos.reduce((s, p) => s + p.ac * p.m, 0);
  const sumX2 = pontos.reduce((s, p) => s + p.ac * p.ac, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return { K3: -2.0, K4: 12.0, r2: 0 };

  const K4val = (n * sumXY - sumX * sumY) / denom;
  const K3val = (sumY - K4val * sumX) / n;

  // R²
  const meanY = sumY / n;
  const ssTot = pontos.reduce((s, p) => s + (p.m - meanY) ** 2, 0);
  const ssRes = pontos.reduce((s, p) => s + (p.m - (K3val + K4val * p.ac)) ** 2, 0);
  const r2val = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  const rd3 = (v: number) => Math.round(v * 1000) / 1000;
  return { K3: rd3(K3val), K4: rd3(K4val), r2: rd3(r2val) };
}


// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS PARA DEMONSTRAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/** Parâmetros default baseados nas famílias CCV do Densus Engine */
export const PARAMS_4Q_DEFAULT: Params4Q = {
  // Abrams ln-ln calibrado (FAM-2 Ecoverde: A≈4.55, B≈-1.56)
  abramsA: 4.55,
  abramsB: -1.56,
  abramsForm: "lnln",
  // Lyse calibrado para CCV slump 150-200mm
  lyseK3: -2.0,
  lyseK4: 12.5,
  // Densidades típicas
  densidadeCimentoTm3: 3.06,
  densidadeAgregadoMedioTm3: 2.65,
};
