// Densus Engine — CPM (Compressible Packing Model) de De Larrard
//
// @ref De Larrard, F. (1999). Concrete Mixture Proportioning: A Scientific Approach.

/** Material de entrada para o CPM */
export interface MaterialCPM {
  nome: string
  d50: number       // mm — diâmetro médio
  densidade: number // kg/dm³
  teor: number      // fração volumétrica 0..1
}

/** Resultado do CPM solver */
export interface ResultadoCPM {
  phi: number              // empacotamento virtual 0..1
  empacotamentoReal: number // empacotamento real (phi × K)
  materialDominante: string
}

/**
 * Efeito de afrouxamento (loosening) — partícula fina i em matriz grossa j
 * a_ij = 1 - (1 - d_i/d_j)^1.02
 * @ref De Larrard (1999), eq. 3.2
 */
function looseningEffect(di: number, dj: number): number {
  if (dj <= 0) return 0
  const ratio = di / dj
  if (ratio >= 1) return 1
  return 1 - Math.pow(1 - ratio, 1.02)
}

/**
 * Efeito de parede (wall effect) — partícula grossa j em matriz fina i
 * b_ij = 1 - (d_j/d_i)^1.50
 * @ref De Larrard (1999), eq. 3.3
 */
function wallEffect(dj: number, di: number): number {
  if (di <= 0) return 0
  const ratio = dj / di
  if (ratio >= 1) return 1
  return 1 - Math.pow(ratio, 1.50)
}

/**
 * CPM Solver — calcula empacotamento virtual e real
 *
 * Para cada classe i (dominante), calcula beta_i considerando
 * interações loosening (classes maiores) e wall effect (classes menores).
 *
 * phi = max(beta_i) para a classe dominante.
 *
 * @ref De Larrard, F. (1999). Concrete Mixture Proportioning.
 */
export function cpmSolver(materiais: MaterialCPM[]): ResultadoCPM {
  if (materiais.length === 0) {
    throw new Error("Ao menos um material é necessário para o CPM")
  }

  // Validar soma de teores
  const somaTeores = materiais.reduce((s, m) => s + m.teor, 0)
  if (Math.abs(somaTeores - 1.0) > 0.01) {
    throw new Error(
      `Soma dos teores deve ser 1.0 (atual: ${somaTeores.toFixed(4)}). ` +
      `Ajuste as fracoes volumetricas dos ${materiais.length} materiais.`
    )
  }

  // Empacotamento individual (beta_i residual) — valor típico
  const betaIndividual = 0.64 // random packing for spheres

  // Ordenar por d50 decrescente
  const sorted = [...materiais].sort((a, b) => b.d50 - a.d50)

  let bestPhi = 0
  let dominante = sorted[0].nome

  for (let i = 0; i < sorted.length; i++) {
    const yi = sorted[i].teor
    if (yi <= 0) continue

    let denominador = 1

    for (let j = 0; j < sorted.length; j++) {
      if (i === j) continue
      const yj = sorted[j].teor

      // Limiar de interação: d_j/d_i < 0.01 → ignora
      const ratio = Math.min(sorted[i].d50, sorted[j].d50) /
                    Math.max(sorted[i].d50, sorted[j].d50)
      if (ratio < 0.01) continue

      if (sorted[j].d50 > sorted[i].d50) {
        // j é mais grosso → loosening effect
        const aij = looseningEffect(sorted[i].d50, sorted[j].d50)
        denominador -= (1 - betaIndividual + aij * betaIndividual) * yj
      } else {
        // j é mais fino → wall effect
        const bij = wallEffect(sorted[j].d50, sorted[i].d50)
        denominador -= (1 - bij) * yj
      }
    }

    const betaI = betaIndividual / Math.max(denominador, 0.01)
    if (betaI > bestPhi && betaI <= 1.0) {
      bestPhi = betaI
      dominante = sorted[i].nome
    }
  }

  // Clamp
  bestPhi = Math.min(bestPhi, 0.95)
  bestPhi = Math.round(bestPhi * 1000) / 1000

  // Empacotamento real: tipicamente 85-95% do virtual
  const K = 0.92
  const empacotamentoReal = Math.round(bestPhi * K * 1000) / 1000

  return {
    phi: bestPhi,
    empacotamentoReal,
    materialDominante: dominante,
  }
}
