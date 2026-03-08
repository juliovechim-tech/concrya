import type { AmostraConcreto, ModeloPredict, ResultadoPredict } from "./types"
import { extractFeatures, FEATURE_NAMES } from "./features"

// --- Álgebra linear pura (zero dependências) ---

/** Transpor matriz MxN → NxM */
function transpor(m: number[][]): number[][] {
  const rows = m.length
  const cols = m[0]!.length
  const t: number[][] = []
  for (let j = 0; j < cols; j++) {
    const row: number[] = new Array(rows) as number[]
    for (let i = 0; i < rows; i++) {
      row[i] = m[i]![j]!
    }
    t.push(row)
  }
  return t
}

/** Multiplicar matrizes A (MxK) × B (KxN) → MxN */
function multiplicar(a: number[][], b: number[][]): number[][] {
  const rows = a.length
  const k = a[0]!.length
  const cols = b[0]!.length
  const result: number[][] = []
  for (let i = 0; i < rows; i++) {
    const row: number[] = new Array(cols).fill(0) as number[]
    for (let j = 0; j < cols; j++) {
      let sum = 0
      for (let p = 0; p < k; p++) {
        sum += a[i]![p]! * b[p]![j]!
      }
      row[j] = sum
    }
    result.push(row)
  }
  return result
}

/** Multiplicar matriz A (MxK) × vetor v (K) → vetor (M) */
function multiplicarVetor(a: number[][], v: number[]): number[] {
  const rows = a.length
  const k = a[0]!.length
  const result: number[] = new Array(rows).fill(0) as number[]
  for (let i = 0; i < rows; i++) {
    let sum = 0
    for (let j = 0; j < k; j++) {
      sum += a[i]![j]! * v[j]!
    }
    result[i] = sum
  }
  return result
}

/** Inversão de matriz NxN por eliminação Gaussiana com pivoteamento parcial */
function inverter(matrix: number[][]): number[][] {
  const n = matrix.length
  // Criar matriz aumentada [A | I]
  const aug: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = new Array(2 * n).fill(0) as number[]
    for (let j = 0; j < n; j++) row[j] = matrix[i]![j]!
    row[n + i] = 1
    aug.push(row)
  }

  for (let col = 0; col < n; col++) {
    // Pivoteamento parcial
    let maxVal = Math.abs(aug[col]![col]!)
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(aug[row]![col]!)
      if (val > maxVal) {
        maxVal = val
        maxRow = row
      }
    }
    if (maxVal < 1e-12) {
      throw new Error(`Matriz singular na coluna ${col}`)
    }
    if (maxRow !== col) {
      const tmp = aug[col]!
      aug[col] = aug[maxRow]!
      aug[maxRow] = tmp
    }

    // Escalonar
    const pivot = aug[col]![col]!
    for (let j = 0; j < 2 * n; j++) {
      aug[col]![j]! /= pivot
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row]![col]!
      for (let j = 0; j < 2 * n; j++) {
        aug[row]![j] = aug[row]![j]! - factor * aug[col]![j]!
      }
    }
  }

  // Extrair inversa
  return aug.map(row => row.slice(n))
}

/**
 * Treinar regressão polinomial grau 1 (linear) via normal equation.
 * θ = (XᵀX + λI)⁻¹ Xᵀy  (ridge regularization)
 */
export function treinar(dataset: AmostraConcreto[]): ModeloPredict {
  const n = dataset.length
  if (n < 15) throw new Error("Dataset insuficiente (mínimo 15 amostras)")

  // Montar X (n × p+1) com coluna de bias
  const featureVectors = dataset.map(a => extractFeatures(a))

  // X = [1, features...] → n × (p+1)
  const X: number[][] = featureVectors.map(f => [1, ...f])
  const y: number[] = dataset.map(a => a.fcMedido)

  const Xt = transpor(X)             // (p+1) × n
  const XtX = multiplicar(Xt, X)     // (p+1) × (p+1)

  // Ridge regularization (Tikhonov): (XᵀX + λI)⁻¹ para evitar singularidade
  // em features com variância zero (ex: escória, cinza volante)
  const lambda = 1e-6
  const dim = XtX.length
  for (let i = 0; i < dim; i++) {
    XtX[i]![i] = XtX[i]![i]! + lambda
  }

  const XtX_inv = inverter(XtX)      // (p+1) × (p+1)
  const Xty = multiplicarVetor(Xt, y) // (p+1)

  const theta = multiplicarVetor(XtX_inv, Xty) // (p+1)

  // Calcular R² e RMSE
  const yPred = X.map(row => {
    let sum = 0
    for (let j = 0; j < row.length; j++) sum += row[j]! * theta[j]!
    return sum
  })

  const yMean = y.reduce((a, b) => a + b, 0) / n
  let ssTot = 0
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    ssTot += (y[i]! - yMean) ** 2
    ssRes += (y[i]! - yPred[i]!) ** 2
  }

  const r2 = 1 - ssRes / ssTot
  const rmse = Math.sqrt(ssRes / n)

  return {
    versao: "predict-v1",
    algoritmo: "polynomial-regression",
    coeficientes: theta,
    features: ["bias", ...FEATURE_NAMES],
    r2: Math.round(r2 * 10000) / 10000,
    rmse: Math.round(rmse * 100) / 100,
    nAmostras: n,
    treinadoEm: new Date().toISOString(),
  }
}

/**
 * Prever fc para uma amostra usando modelo treinado.
 */
export function prever(
  input: AmostraConcreto,
  modelo: ModeloPredict,
): ResultadoPredict {
  const features = extractFeatures(input)
  const x = [1, ...features] // bias + features

  // fcPredito = θ · x
  let fcPredito = 0
  for (let i = 0; i < x.length; i++) {
    fcPredito += modelo.coeficientes[i]! * x[i]!
  }
  fcPredito = Math.round(fcPredito * 10) / 10

  // IC 90%: fcPredito ± 1.645 × rmse
  const margem = 1.645 * modelo.rmse
  const intervalo: [number, number] = [
    Math.round((fcPredito - margem) * 10) / 10,
    Math.round((fcPredito + margem) * 10) / 10,
  ]

  // Confiança
  const erroRelativo = input.fcMedido > 0
    ? Math.abs(fcPredito - input.fcMedido) / input.fcMedido
    : 0
  const confianca = Math.min(0.98, Math.max(0.40, modelo.r2 * (1 - erroRelativo)))

  // Drift detection
  const driftPorMedido = input.fcMedido > 0 && fcPredito < input.fcMedido * 0.85
  const driftPorAc = input.ac > 0.65
  const driftPorFc = fcPredito < 15
  const drift = driftPorMedido || driftPorAc || driftPorFc

  return {
    fcPredito,
    intervalo,
    confianca: Math.round(confianca * 100) / 100,
    drift,
    modelo,
  }
}
