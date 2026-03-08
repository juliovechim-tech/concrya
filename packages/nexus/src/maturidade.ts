/**
 * NEXUS — Maturidade IoT
 *
 * Nurse-Saul:  M = Σ (T - T0) × Δt        [°C·h]
 *   T0 = -10 °C (datum temperature, ASTM C1074)
 *
 * Arrhenius:   te = Σ Δt × exp(Ea/R × (1/Tr - 1/T))   [h]
 *   Ea = 33 500 J/mol (CP V ARI típico)
 *   R  = 8.314 J/(mol·K)
 *   Tr = 293 K (20 °C referência)
 *
 * Grau de hidratação estimado (Avrami simplificado):
 *   α(te) = 1 − exp(−(k × te)^n)
 *   k ≈ 0.04 h⁻¹, n ≈ 1.2 (CP V ARI, a/c ~0.45)
 *
 * Ref: ASTM C1074-19, Carino & Lew (2001), Avrami (1939)
 */

/** Leitura IoT — formato do hardware Eletroterm */
export interface LeituraIoT {
  tempo_h: number;
  temp_C: number;
}

export interface MaturidadeResult {
  /** Maturidade Nurse-Saul [°C·h] */
  maturidade_Celsius_hora: number;
  /** Tempo equivalente Arrhenius a 20 °C [h] */
  tempo_equivalente_h: number;
  /** Grau de hidratação estimado (0–1) */
  grauHidratacao: number;
  /** Curva de maturidade ao longo do tempo */
  curva: { tempo_h: number; nurseSaul: number; arrhenius_te: number }[];
}

// Constantes
const T0_NURSE_SAUL = -10; // °C — datum temperature
const EA = 33_500;         // J/mol — energia de ativação CP V ARI
const R_GAS = 8.314;       // J/(mol·K)
const TR = 293;            // K — temperatura referência (20 °C)

// Avrami simplificado para CP V ARI, a/c ~0.45
const K_AVRAMI = 0.04;    // h⁻¹
const N_AVRAMI = 1.2;

function kelvin(c: number): number {
  return c + 273.15;
}

/**
 * Calcula maturidade a partir de leituras IoT.
 * Leituras devem estar ordenadas por tempo_h crescente.
 */
export function calcMaturidade(leituras: LeituraIoT[]): MaturidadeResult {
  if (leituras.length < 2) {
    return {
      maturidade_Celsius_hora: 0,
      tempo_equivalente_h: 0,
      grauHidratacao: 0,
      curva: [],
    };
  }

  let nurseSaul = 0;
  let teArrhenius = 0;
  const curva: MaturidadeResult["curva"] = [];

  // Ponto inicial
  curva.push({ tempo_h: leituras[0].tempo_h, nurseSaul: 0, arrhenius_te: 0 });

  for (let i = 1; i < leituras.length; i++) {
    const dt = leituras[i].tempo_h - leituras[i - 1].tempo_h;
    if (dt <= 0) continue;

    // Temperatura média no intervalo
    const tMed = (leituras[i].temp_C + leituras[i - 1].temp_C) / 2;

    // Nurse-Saul: Σ (T - T0) × Δt
    nurseSaul += (tMed - T0_NURSE_SAUL) * dt;

    // Arrhenius: Σ Δt × exp(Ea/R × (1/Tr - 1/T))
    const tK = kelvin(tMed);
    const fatorArr = Math.exp((EA / R_GAS) * (1 / TR - 1 / tK));
    teArrhenius += dt * fatorArr;

    curva.push({
      tempo_h: leituras[i].tempo_h,
      nurseSaul,
      arrhenius_te: teArrhenius,
    });
  }

  // Grau de hidratação via Avrami simplificado
  const grauHidratacao = Math.min(
    1,
    1 - Math.exp(-Math.pow(K_AVRAMI * teArrhenius, N_AVRAMI))
  );

  return {
    maturidade_Celsius_hora: nurseSaul,
    tempo_equivalente_h: teArrhenius,
    grauHidratacao,
    curva,
  };
}
