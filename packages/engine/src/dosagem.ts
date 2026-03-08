// Densus Engine — Funções de dosagem de concreto
//
// @ref NBR 12655:2022 — Concreto de cimento Portland
// @ref IPT/EPUSP — Helene & Terzian, 1992

/** Traço unitário: 1 : areia : brita : a/c */
export interface TracoUnitario {
  cimento: 1
  areia: number
  brita: number
  agua: number
}

/** Resultado de volumes absolutos por componente */
export interface VolumesAbsolutos {
  cimento: number   // dm³
  agua: number      // dm³
  areia: number     // dm³
  brita: number     // dm³
  ar: number        // dm³ (ar incorporado)
  total: number     // dm³ (deve ser ≈ 1000)
}

/** Resultado completo de dosagem */
export interface ResultadoDosagem {
  consumoCimento: number   // kg/m³
  consumoAgua: number      // L/m³
  consumoAreia: number     // kg/m³
  consumoBrita: number     // kg/m³
  tracoUnitario: TracoUnitario
  volumes: VolumesAbsolutos
}

// Densidades típicas (kg/dm³)
const DENSIDADES: Record<string, number> = {
  cimento: 3.10,
  agua: 1.00,
  areia: 2.62,
  brita: 2.70,
}

/**
 * Lei de Abrams: fc = k1 / k2^(a/c)
 * @ref Abrams, D.A. (1918). Design of Concrete Mixtures. Bulletin 1, PCA.
 */
export function calcularAbrams(k1: number, k2: number, ac: number): number {
  if (ac <= 0) throw new Error("Relacao a/c deve ser positiva")
  if (k2 <= 0) throw new Error("k2 deve ser positivo")
  return k1 / Math.pow(k2, ac)
}

/**
 * Consumo de cimento a partir do consumo de agua e relacao a/c
 * C = agua / (a/c)
 * @ref IPT/EPUSP — Helene & Terzian, 1992
 */
export function calcularConsumoCimento(agua: number, ac: number): number {
  if (ac <= 0) throw new Error("Relacao a/c deve ser positiva — divisao por zero bloqueada")
  const consumo = agua / ac
  return Math.round(consumo * 10) / 10
}

/**
 * Volumes absolutos de cada componente em dm³/m³
 * Soma deve ser ≈ 1000 dm³ (±5)
 * @ref NBR 12655:2022
 */
export function calcularVolumesAbsolutos(
  consumoCimento: number,
  consumoAreia: number,
  consumoBrita: number,
  consumoAgua: number,
  densidades?: Partial<Record<string, number>>,
  arIncorporado = 0.015, // 1.5% default
): VolumesAbsolutos {
  const dc = densidades?.cimento ?? DENSIDADES.cimento
  const da = densidades?.agua ?? DENSIDADES.agua
  const dar = densidades?.areia ?? DENSIDADES.areia
  const dbr = densidades?.brita ?? DENSIDADES.brita

  const vCimento = consumoCimento / dc
  const vAgua = consumoAgua / da
  const vAreia = consumoAreia / dar
  const vBrita = consumoBrita / dbr
  const vAr = arIncorporado * 1000

  const total = vCimento + vAgua + vAreia + vBrita + vAr

  return {
    cimento: Math.round(vCimento * 10) / 10,
    agua: Math.round(vAgua * 10) / 10,
    areia: Math.round(vAreia * 10) / 10,
    brita: Math.round(vBrita * 10) / 10,
    ar: Math.round(vAr * 10) / 10,
    total: Math.round(total * 10) / 10,
  }
}

/**
 * Traço unitário: todas as massas divididas pelo consumo de cimento
 * Resultado: 1 : a : p : a/c
 * @ref IPT/EPUSP — Helene & Terzian, 1992
 */
export function calcularTracoUnitario(
  consumoCimento: number,
  consumoAreia: number,
  consumoBrita: number,
  consumoAgua: number,
): TracoUnitario {
  if (consumoCimento <= 0) throw new Error("Consumo de cimento deve ser positivo")
  return {
    cimento: 1,
    areia: Math.round((consumoAreia / consumoCimento) * 1000) / 1000,
    brita: Math.round((consumoBrita / consumoCimento) * 1000) / 1000,
    agua: Math.round((consumoAgua / consumoCimento) * 1000) / 1000,
  }
}

/**
 * Custo por m³ a partir dos consumos e preços unitários
 */
export function calcularCusto(
  consumos: Record<string, number>,
  precos: Record<string, number>,
): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {}
  let total = 0

  for (const [material, consumo] of Object.entries(consumos)) {
    const preco = precos[material]
    if (preco !== undefined && preco > 0) {
      const custo = Math.round(consumo * preco * 100) / 100
      breakdown[material] = custo
      total += custo
    }
  }

  return { total: Math.round(total * 100) / 100, breakdown }
}
