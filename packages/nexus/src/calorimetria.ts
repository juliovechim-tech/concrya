/**
 * NEXUS — Calorimetria Semi-Adiabática
 *
 * Q = α × Qmax                     [J/g]
 * Qmax (CP V ARI) ≈ 420 J/g
 * Qmax (CP II E)  ≈ 350 J/g
 * Qmax (CP III)   ≈ 310 J/g
 * Qmax (CP IV)    ≈ 290 J/g
 *
 * Fases de hidratação (por α):
 *   0.00–0.05  INDUCAO
 *   0.05–0.30  ACELERACAO
 *   0.30–0.70  DESACELERACAO
 *   0.70–1.00  DIFUSAO
 *
 * Ref: Taylor (1997), Riding et al. (2012)
 */

export type FaseHidratacao = "INDUCAO" | "ACELERACAO" | "DESACELERACAO" | "DIFUSAO";

export interface CalorResult {
  /** Calor total liberado [J] */
  calor_total_J: number;
  /** Calor específico liberado [J/g] */
  calor_especifico_J_g: number;
  /** Taxa de pico estimada [J/(g·h)] */
  taxa_pico_J_g_h: number;
  /** Fase atual da hidratação */
  fase: FaseHidratacao;
  /** Qmax do cimento [J/g] */
  qmax: number;
}

/** Calor máximo por tipo de cimento [J/g] */
const QMAX_MAP: Record<string, number> = {
  "CP V ARI": 420,
  "CP V": 420,
  "CP II E": 350,
  "CP II F": 370,
  "CP II Z": 340,
  "CP III": 310,
  "CP IV": 290,
};

const QMAX_DEFAULT = 380; // J/g — genérico

function getFase(alpha: number): FaseHidratacao {
  if (alpha < 0.05) return "INDUCAO";
  if (alpha < 0.30) return "ACELERACAO";
  if (alpha < 0.70) return "DESACELERACAO";
  return "DIFUSAO";
}

/**
 * Calcula resultados de calorimetria a partir do grau de hidratação.
 *
 * @param alpha - Grau de hidratação (0–1)
 * @param cimento_kg - Consumo de cimento [kg/m³]
 * @param tipo_cp - Tipo de cimento (ex: "CP V ARI")
 */
export function calcCalorimetria(
  alpha: number,
  cimento_kg: number,
  tipo_cp: string
): CalorResult {
  const qmax = QMAX_MAP[tipo_cp] ?? QMAX_DEFAULT;

  // Calor específico liberado [J/g]
  const calor_especifico = alpha * qmax;

  // Calor total [J] = calor_especifico [J/g] × massa [g]
  const calor_total = calor_especifico * cimento_kg * 1000;

  // Taxa de pico estimada — Riding et al. (2012)
  // Pico típico CP V ARI ≈ 12–18 J/(g·h) na fase de aceleração
  // Modelo simplificado: taxa_pico ≈ 0.035 × qmax (correlação empírica)
  const taxa_pico = 0.035 * qmax;

  return {
    calor_total_J: calor_total,
    calor_especifico_J_g: calor_especifico,
    taxa_pico_J_g_h: taxa_pico,
    fase: getFase(alpha),
    qmax,
  };
}
