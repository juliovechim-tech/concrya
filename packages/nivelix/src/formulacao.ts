// NIVELIX CORE — Formulacao de Argamassa Autonivelante
//
// Verifica consistencia volumetrica e classifica a formulacao.
//
// Volume absoluto: V_lig + V_filler + V_areia + V_agua + V_ar = 1000 dm3/m3
//
// Faixas tipicas para autonivelante (referencia Chimica Edile):
//   - Volume de pasta (lig + filler + agua + ar): 55-70% do total
//   - a/lig: 0.40-0.55
//   - SP: 0.5-2.0% sobre ligante
//   - AE: 0-8% sobre ligante (se compensado)
//   - Filler: 200-500 kg/m3
//   - Ligante: 200-450 kg/m3
//   - Areia fina (0-0.5mm): 200-600 kg/m3
//   - Ar incorporado: 2-5%
//
// Ref: Collepardi, M. et al. (2006). Self-Compacting Concrete.
//      EN 13813: Screed material and floor screeds.
//      Chimica Edile — Formulacoes de referencia.

import type { ParamsFormulacao, ResultadoFormulacao, ClasseEspalhamento } from "./types"

/** Volume de ar incorporado tipico — dm3/m3 */
const AR_DEFAULT_DM3 = 30 // 3%

/**
 * Calcula e verifica formulacao de argamassa autonivelante.
 */
export function calcFormulacao(params: ParamsFormulacao): ResultadoFormulacao {
  const {
    tipoLigante,
    ligKgM3,
    aLig,
    fillerKgM3,
    areiaFinaKgM3,
    areiaMediaKgM3 = 0,
    spPct,
    aePct,
    vmaPct = 0,
    polimeroPct = 0,
    rhoLig,
    rhoFiller,
    rhoAreiaFina,
    rhoAreiaMedia = 2.65,
  } = params

  // Agua total
  const aguaKgM3 = ligKgM3 * aLig

  // Volumes absolutos (dm3/m3)
  const vLig = ligKgM3 / rhoLig
  const vFiller = fillerKgM3 / rhoFiller
  const vAreiaFina = areiaFinaKgM3 / rhoAreiaFina
  const vAreiaMedia = areiaMediaKgM3 / (rhoAreiaMedia)
  const vAgua = aguaKgM3  // rho_agua = 1.0 g/cm3 → 1 kg = 1 dm3
  const volumeAr = AR_DEFAULT_DM3

  const volumeAbsTotal = vLig + vFiller + vAreiaFina + vAreiaMedia + vAgua + volumeAr

  // Volume de pasta = ligante + filler + agua + aditivos (~desprezivel) + ar
  const volumePasta = vLig + vFiller + vAgua + volumeAr

  // Volume de agregado
  const volumeAgregado = vAreiaFina + vAreiaMedia

  // Razao pasta/agregado
  const razaoPastaAgregado = volumeAgregado > 0 ? volumePasta / volumeAgregado : Infinity

  // Massa unitaria
  const massaUnitaria = ligKgM3 + fillerKgM3 + areiaFinaKgM3 + areiaMediaKgM3 + aguaKgM3

  // Estimativa de classe de espalhamento (heuristica simplificada)
  // Baseada em a/lig e SP — correlacao empirica
  let classeEspalhamento: ClasseEspalhamento
  const fluidezScore = aLig * 100 + spPct * 30 - vmaPct * 10
  if (fluidezScore > 75) classeEspalhamento = "F4"
  else if (fluidezScore > 60) classeEspalhamento = "F3"
  else if (fluidezScore > 45) classeEspalhamento = "F2"
  else classeEspalhamento = "F1"

  // Verificacao de conformidade
  const volumeOk = Math.abs(volumeAbsTotal - 1000) <= 15
  const pastaOk = volumePasta >= 500 && volumePasta <= 750
  const aLigOk = aLig >= 0.35 && aLig <= 0.60
  const conforme = volumeOk && pastaOk && aLigOk

  // Diagnostico
  const diagnosticos: string[] = []

  if (!volumeOk) {
    diagnosticos.push(
      `Volume absoluto ${volumeAbsTotal.toFixed(0)} dm3/m3 (esperado ~1000 ±15). Ajustar proporcoes.`
    )
  }

  if (!pastaOk) {
    diagnosticos.push(
      `Volume de pasta ${volumePasta.toFixed(0)} dm3/m3 (faixa ideal: 500-750). ${volumePasta < 500 ? "Aumentar ligante/filler." : "Reduzir ligante/filler."}`
    )
  }

  if (!aLigOk) {
    diagnosticos.push(
      `a/lig ${aLig.toFixed(2)} fora da faixa recomendada (0.35-0.60).`
    )
  }

  if (aePct > 0 && tipoLigante === "gesso_anidrita") {
    diagnosticos.push(
      `AE incompativel com base gesso/anidrita — risco de expansao descontrolada.`
    )
  }

  if (spPct > 2.0) {
    diagnosticos.push(
      `SP ${spPct}% acima do maximo recomendado (2.0%). Risco de segregacao e retardo.`
    )
  }

  if (diagnosticos.length === 0) {
    diagnosticos.push(
      `Formulacao ${classeEspalhamento} conforme. Massa unitaria: ${massaUnitaria.toFixed(0)} kg/m3. Volume de pasta: ${(volumePasta / 10).toFixed(1)}%.`
    )
  }

  return {
    volumeAbsTotal: Math.round(volumeAbsTotal * 10) / 10,
    volumePasta: Math.round(volumePasta * 10) / 10,
    volumeAr,
    razaoPastaAgregado: Math.round(razaoPastaAgregado * 100) / 100,
    aguaKgM3: Math.round(aguaKgM3 * 10) / 10,
    massaUnitaria: Math.round(massaUnitaria),
    classeEspalhamento,
    conforme,
    diagnostico: diagnosticos.join(" "),
  }
}
