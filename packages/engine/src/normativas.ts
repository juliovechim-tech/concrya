// Densus Engine — Tabelas normativas NBR 6118:2023

type ClasseAgressividade = "I" | "II" | "III" | "IV"
type Litologia = "basalto" | "diabasio" | "granitico" | "gnaisse" | "calcario" | "arenito" | "seixo" | "quartzo"

/** a/c maximo por classe de agressividade — NBR 6118:2023 Tabela 7.1 */
export const AC_MAX_NBR6118: Record<ClasseAgressividade, number> = {
  I: 0.65,
  II: 0.60,
  III: 0.55,
  IV: 0.45,
}

/** Consumo minimo de cimento (kg/m³) — NBR 6118:2023 Tabela 7.1 */
export const CIMENTO_MIN_NBR6118: Record<ClasseAgressividade, number> = {
  I: 260,
  II: 280,
  III: 320,
  IV: 360,
}

/** Verifica conformidade de durabilidade NBR 6118 */
export function verificarConformidadeNBR6118(
  ac: number,
  consumoCimento: number,
  classe: ClasseAgressividade
): {
  acOk: boolean
  cimentoOk: boolean
  acMax: number
  cimentoMin: number
} {
  const acMax = AC_MAX_NBR6118[classe]
  const cimentoMin = CIMENTO_MIN_NBR6118[classe]
  return {
    acOk: ac <= acMax,
    cimentoOk: consumoCimento >= cimentoMin,
    acMax,
    cimentoMin,
  }
}

/** Coeficiente αi por litologia — NBR 6118:2023 Tabela 8.3 */
export const ALPHA_I_TABELA: Record<string, number> = {
  basalto: 0.90,
  diabasio: 0.90,
  granitico: 0.85,
  gnaisse: 0.85,
  calcario: 0.70,
  arenito: 0.70,
  seixo: 0.70,
  quartzo: 0.85,
} as const

/**
 * Modulo secante de elasticidade — NBR 6118:2023 Equacao (8.3)
 * Ecs = αi × 5600 × √fck  (MPa)
 */
export function calcModuloElasticidade(fck: number, litologia: Litologia): number {
  const ai = ALPHA_I_TABELA[litologia] ?? 0.85
  return ai * 5600 * Math.sqrt(fck)
}
