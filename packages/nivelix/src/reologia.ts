// NIVELIX CORE — Reologia de Argamassas Autonivelantes
//
// Modelos reologicos adaptados para argamassas autonivelantes (SLM).
// Diferem do concreto: viscosidades menores, tau0 muito baixo (< 25 Pa),
// teste de espalhamento com mini-cone (EN 12706 / ASTM C1437).
//
// Espalhamento do mini-cone (Roussel, 2005 — adaptado para argamassas):
//   D_mm = sqrt(2 * rho * g * V_cone / (3 * tau0)) * 1000
//   V_cone_mini = ~0.000340 m3 (cone truncado d1=70, d2=100, h=60 mm)
//
// T250 (tempo para atingir 250mm de espalhamento):
//   T250 ~ 0.015 * mu_p + 0.2   (s) — correlacao empirica para SLM
//
// Ref: Roussel, N. (2005). Cem. Concr. Res.
//      Schwartzentruber, A. et al. (2006). Cem. Concr. Res.
//      EN 12706: Self-levelling compounds — Determination of flow.
//      NBR 15258: Argamassa para revestimento de paredes e tetos.

import type { ParamsReologia, ResultadoReologia, ClasseEspalhamento } from "./types"

/** Volume do mini-cone padrao (d_inf=100mm, d_sup=70mm, h=60mm) — m3 */
const V_MINI_CONE_M3 = (Math.PI * 0.06 / 3) *
  (0.050 * 0.050 + 0.050 * 0.035 + 0.035 * 0.035) // ~0.000340 m3

/** Aceleracao gravitacional — m/s2 */
const G = 9.81

/** Volume do cone de Abrams (concreto, NBR NM 67) — m3 (~5.5 L) */
const V_ABRAMS_M3 = 0.0055

/**
 * Estima espalhamento a partir de tau0, densidade e volume do cone.
 * Modelo de Roussel (2005): D = sqrt(2*rho*g*V / (3*tau0)).
 *
 * @param tau0Pa Tensao de escoamento — Pa
 * @param rhoKgM3 Densidade — kg/m3
 * @param volumeConeM3 Volume do cone — m3 (default: mini-cone EN 12706)
 * @returns Espalhamento — mm
 */
export function estimarEspalhamento(
  tau0Pa: number,
  rhoKgM3: number,
  volumeConeM3: number = V_MINI_CONE_M3,
): number {
  if (tau0Pa <= 0) return 999  // fluido ideal
  const D_m = Math.sqrt((2 * rhoKgM3 * G * volumeConeM3) / (3 * tau0Pa))
  return Math.round(D_m * 1000)
}

/** Volume do cone de Abrams exportado para uso no apply */
export { V_ABRAMS_M3, V_MINI_CONE_M3 }

/**
 * Estima tau0 a partir do espalhamento medido (inversao do modelo de Roussel).
 *
 * @param espalhamentoMm Espalhamento medido — mm
 * @param rhoKgM3 Densidade — kg/m3
 * @returns tau0 — Pa
 */
export function estimarTau0DeEspalhamento(espalhamentoMm: number, rhoKgM3: number): number {
  if (espalhamentoMm <= 0) return Infinity
  const D_m = espalhamentoMm / 1000
  return (2 * rhoKgM3 * G * V_MINI_CONE_M3) / (3 * D_m * D_m)
}

/**
 * Estima T250 (tempo para 250mm) a partir de viscosidade plastica.
 * Correlacao empirica para SLM (Schwartzentruber et al., 2006).
 *
 * @param muPas Viscosidade plastica — Pa·s
 * @returns T250 — s (ou null se mu muito baixo)
 */
export function estimarT250(muPas: number): number | null {
  if (muPas < 0.1) return null
  return Math.round((0.015 * muPas + 0.2) * 10) / 10
}

/**
 * Classifica o espalhamento conforme EN 13813.
 */
export function classificarEspalhamento(espalhamentoMm: number): ClasseEspalhamento {
  if (espalhamentoMm >= 260) return "F4"
  if (espalhamentoMm >= 220) return "F3"
  if (espalhamentoMm >= 180) return "F2"
  return "F1"
}

/**
 * Avaliacao reologica completa de uma argamassa autonivelante.
 */
export function avaliarReologia(params: ParamsReologia): ResultadoReologia {
  const { tau0Pa, muPas, rhoKgM3 } = params

  const espalhamentoMm = estimarEspalhamento(tau0Pa, rhoKgM3)
  const t250s = estimarT250(muPas)
  const classeEspalhamento = classificarEspalhamento(espalhamentoMm)
  const autonivelante = espalhamentoMm >= 220 && tau0Pa < 25

  let diagnostico: string
  if (autonivelante && classeEspalhamento === "F4") {
    diagnostico = `Ultra-fluida (F4) — espalhamento ${espalhamentoMm}mm, tau0=${tau0Pa.toFixed(1)} Pa. Verificar segregacao.`
  } else if (autonivelante) {
    diagnostico = `Autonivelante (${classeEspalhamento}) — espalhamento ${espalhamentoMm}mm. Faixa ideal para aplicacao por bombeamento.`
  } else if (espalhamentoMm >= 180) {
    diagnostico = `Fluida mas nao autonivelante (${classeEspalhamento}) — espalhamento ${espalhamentoMm}mm. Pode necessitar raqueamento.`
  } else {
    diagnostico = `Baixa fluidez (${classeEspalhamento}) — espalhamento ${espalhamentoMm}mm. Aumentar SP ou a/lig.`
  }

  if (muPas > 15) {
    diagnostico += ` Viscosidade alta (${muPas.toFixed(1)} Pa·s) — bombeamento pode ser dificil.`
  }

  return {
    espalhamentoMm,
    t250s,
    classeEspalhamento,
    autonivelante,
    diagnostico,
  }
}
