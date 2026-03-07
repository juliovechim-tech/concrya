/**
 * Utilitários para cálculo da Lei de Abrams e Dosagem de Concreto
 * Baseado na fórmula: fc = k1 / (k2 ^ (a/c))
 */

export interface PontoAbrams {
  ac: number; // Relação água/cimento
  fc: number; // Resistência à compressão (MPa)
}

export interface ConstantesAbrams {
  k1: number;
  k2: number;
  r2: number; // Coeficiente de determinação
}

/**
 * Calcula as constantes k1 e k2 da Lei de Abrams a partir de pontos experimentais
 * Usa regressão linear nos logaritmos: ln(fc) = ln(k1) - ln(k2) * (a/c)
 */
export function calcularConstantesAbrams(pontos: PontoAbrams[]): ConstantesAbrams {
  if (pontos.length < 2) {
    throw new Error("São necessários pelo menos 2 pontos para calcular a curva.");
  }

  const n = pontos.length;
  let sumX = 0; // X = a/c
  let sumY = 0; // Y = ln(fc)
  let sumXY = 0;
  let sumX2 = 0;

  pontos.forEach(p => {
    const x = p.ac;
    const y = Math.log(p.fc);
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  // Cálculo dos coeficientes da reta Y = A + B*X
  // B = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX^2)
  // A = (sumY - B*sumX) / n
  
  const B = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const A = (sumY - B * sumX) / n;

  // Converter de volta para k1 e k2
  // ln(fc) = ln(k1) - ln(k2) * (a/c)
  // A = ln(k1) => k1 = exp(A)
  // B = -ln(k2) => k2 = exp(-B)

  const k1 = Math.exp(A);
  const k2 = Math.exp(-B);

  // Calcular R²
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  pontos.forEach(p => {
    const y = Math.log(p.fc);
    const yPred = A + B * p.ac;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  });

  const r2 = 1 - (ssRes / ssTot);

  return { k1, k2, r2 };
}

/**
 * Calcula a relação a/c necessária para uma resistência alvo
 * a/c = ln(k1/fc) / ln(k2)
 */
export function calcularAC(fcAlvo: number, k1: number, k2: number): number {
  if (fcAlvo <= 0 || k1 <= 0 || k2 <= 1) return 0;
  return Math.log(k1 / fcAlvo) / Math.log(k2);
}

/**
 * Calcula a resistência esperada para uma relação a/c
 * fc = k1 / (k2 ^ (a/c))
 */
export function calcularFC(ac: number, k1: number, k2: number): number {
  return k1 / Math.pow(k2, ac);
}

/**
 * Interface de retorno do cálculo de traço unitário
 */
export interface TracoUnitarioResult {
  /** Traço unitário em massa: 1 : a : p : a/c */
  areia: number;      // proporção de areia em relação ao cimento
  brita: number;      // proporção de brita em relação ao cimento
  ac: number;         // relação água/cimento
  m: number;          // agregado total (a + p)
  /** Consumo por m³ */
  consumoCimento: number;  // kg/m³
  consumoAreia: number;    // kg/m³
  consumoBrita: number;    // kg/m³
  consumoAgua: number;     // L/m³
  /** Volumes absolutos (dm³/m³) */
  volumeCimento: number;
  volumeAreia: number;
  volumeBrita: number;
  volumeAgua: number;
  volumeAr: number;
  /** Verificação */
  massaEspecifica: number; // kg/m³
  somaVolumes: number;     // deve ser ~1000 dm³
}

/**
 * Calcula o traço unitário pelo método ABCP/IPT-EPUSP
 * 
 * O teor de argamassa (α) em massa é definido como:
 *   α = (1 + a) / (1 + m)
 * onde a = proporção de areia, m = a + p (agregado total)
 * 
 * O consumo de cimento é obtido pela equação dos volumes absolutos:
 *   C = 1000 / (1/dc + a/da + p/dp + ac/dw + ar)
 * 
 * @param ac Relação água/cimento
 * @param teorArgamassa Teor de argamassa seco em massa (0.0 a 1.0, ex: 0.54)
 * @param aguaUnitaria Consumo de água estimado (L/m³), tipicamente 160-220
 * @param densidades Densidades dos materiais (kg/dm³, ex: cimento 3.10, areia 2.65, brita 2.70, agua 1.00)
 * @param teorArIncorporado Teor de ar incorporado (0.0 a 0.10, ex: 0.02 para 2%)
 */
export function calcularTracoUnitario(
  ac: number,
  teorArgamassa: number,
  aguaUnitaria: number,
  densidades: {
    cimento: number;
    areia: number;
    brita: number;
    agua: number;
  },
  teorArIncorporado: number = 0.02
): TracoUnitarioResult {
  const { cimento: dc, areia: da, brita: dp, agua: dw } = densidades;

  // 1. Consumo de cimento a partir da água unitária
  const consumoCimento = aguaUnitaria / ac;

  // 2. Agregado total em relação ao cimento (m)
  //    Volume de pasta + volume de agregados + ar = 1000 dm³
  //    C/dc + C·a/da + C·p/dp + C·ac/dw + ar·1000 = 1000
  //    C · (1/dc + m_areia/da + m_brita/dp + ac/dw) = 1000 · (1 - ar)
  //    m = (1000·(1-ar)/C - 1/dc - ac/dw) / (propAreia/da + propBrita/dp)
  //
  //    Mas é mais direto calcular m primeiro pelo teor de argamassa:
  //    α = (1 + a) / (1 + m)  →  a = α·(1+m) - 1  →  p = m - a
  //
  //    E depois verificar com os volumes absolutos.
  //    O consumo real de cimento vem de:
  //    C = 1000 / (1/dc + a/da + p/dp + ac/dw + Var/C)
  //    Var = 1000·ar (volume de ar em dm³)
  
  // Calcular m pela equação dos volumes absolutos:
  // 1000 = C·(1/dc + a/da + p/dp + ac/dw) + 1000·ar
  // onde a = α·(1+m) - 1 e p = m - a = m - α·(1+m) + 1 = m·(1-α) + (1-α) = (1-α)·(1+m)
  // 
  // Substituindo:
  // 1000·(1-ar) = C · [1/dc + (α·(1+m)-1)/da + ((1-α)·(1+m))/dp + ac/dw]
  //
  // Como C = aguaUnitaria/ac, podemos resolver para m:
  // 1000·(1-ar)/C - 1/dc - ac/dw = (α·(1+m)-1)/da + (1-α)·(1+m)/dp
  // 
  // Seja K = 1000·(1-ar)/C - 1/dc - ac/dw
  // K = [α·(1+m) - 1]/da + [(1-α)·(1+m)]/dp
  // K = (1+m)·[α/da + (1-α)/dp] - 1/da
  // K + 1/da = (1+m)·[α/da + (1-α)/dp]
  // 1+m = (K + 1/da) / [α/da + (1-α)/dp]
  // m = (K + 1/da) / [α/da + (1-α)/dp] - 1

  const ar = teorArIncorporado;
  const alfa = teorArgamassa;
  const C = consumoCimento;

  const K = (1000 * (1 - ar)) / C - 1 / dc - ac / dw;
  const denominador = alfa / da + (1 - alfa) / dp;
  const m = (K + 1 / da) / denominador - 1;

  // 3. Proporções de areia e brita
  //    a = α·(1+m) - 1
  //    p = (1-α)·(1+m)
  const a = alfa * (1 + m) - 1;
  const p = (1 - alfa) * (1 + m);

  // Validações
  if (a < 0 || p < 0 || m < 0) {
    // Parâmetros incompatíveis - retornar valores zerados
    return {
      areia: 0, brita: 0, ac, m: 0,
      consumoCimento: 0, consumoAreia: 0, consumoBrita: 0, consumoAgua: 0,
      volumeCimento: 0, volumeAreia: 0, volumeBrita: 0, volumeAgua: 0, volumeAr: 0,
      massaEspecifica: 0, somaVolumes: 0,
    };
  }

  // 4. Consumos por m³
  const consumoAreia = C * a;
  const consumoBrita = C * p;
  const consumoAgua = C * ac;

  // 5. Volumes absolutos (dm³/m³)
  const volumeCimento = C / dc;
  const volumeAreia = consumoAreia / da;
  const volumeBrita = consumoBrita / dp;
  const volumeAgua = consumoAgua / dw;
  const volumeAr = 1000 * ar;

  const somaVolumes = volumeCimento + volumeAreia + volumeBrita + volumeAgua + volumeAr;
  const massaEspecifica = C + consumoAreia + consumoBrita + consumoAgua;

  return {
    areia: a,
    brita: p,
    ac,
    m,
    consumoCimento: C,
    consumoAreia,
    consumoBrita,
    consumoAgua,
    volumeCimento,
    volumeAreia,
    volumeBrita,
    volumeAgua,
    volumeAr,
    massaEspecifica,
    somaVolumes,
  };
}
