// AION CORE — Predicao de resistencia via @concrya/predict
//
// Modelo ML calibrado: regressao polinomial treinada em dataset sintetico
// com Lei de Abrams parametrizada + fatores de correcao da literatura.
// Substituiu abrams-v1 por predict-v1 com R² > 0.90.
//
// Ref: Abrams, D.A. (1918). Design of Concrete Mixtures. Bulletin 1, PCA.
//      Mehta, P.K. & Monteiro, P.J.M. (2014). Concrete, 4th ed.

import type { ConcretePacket } from "@concrya/schemas"
import { predict } from "@concrya/predict"

/**
 * Aplica o motor AION ao ConcretePacket.
 * Prediz fc28 via @concrya/predict (ML calibrado), ajusta confianca
 * por status dos demais modulos, calcula drift.
 * Retorna novo packet com secao `aion` preenchida.
 */
export function applyAion(packet: ConcretePacket): ConcretePacket {
  const { mix } = packet

  // Converter adicoes do packet (kg/m³) → fração relativa ao cimento
  const silicaAtiva = mix.adicoes?.silica_ativa
    ? mix.adicoes.silica_ativa / mix.consumoCimento
    : undefined
  const metacaulim = mix.adicoes?.metacaulim
    ? mix.adicoes.metacaulim / mix.consumoCimento
    : undefined
  const escoria = mix.adicoes?.escoria
    ? mix.adicoes.escoria / mix.consumoCimento
    : undefined
  const cinzaVolante = mix.adicoes?.cinza_volante
    ? mix.adicoes.cinza_volante / mix.consumoCimento
    : undefined

  const resultado = predict({
    ac: mix.ac,
    consumoCimento: mix.consumoCimento,
    cimentoType: mix.cimentoType,
    slump: mix.slump,
    idadeDias: 28,
    silicaAtiva,
    metacaulim,
    escoria,
    cinzaVolante,
  })

  // Se nexus presente com grauHidratacao real, aumentar confianca
  // (dados IoT reais são mais confiáveis que estimativa pura)
  let confianca = resultado.confianca
  if (packet.nexus && packet.nexus.grauHidratacao > 0) {
    confianca += 0.05
  }

  // Ajustar confianca por status dos outros modulos
  if (packet.compensa?.status === "CRITICO") {
    confianca -= 0.15
  }
  if (packet.nivelix?.status === "RISCO") {
    confianca -= 0.08
  }
  if (packet.ecorisk && packet.ecorisk.score > 65) {
    confianca -= 0.10
  }
  confianca = Math.round(Math.max(0.40, Math.min(0.98, confianca)) * 100) / 100

  // Drift: combinar predict drift + ecorisk
  const drift =
    resultado.drift ||
    (packet.ecorisk !== undefined && packet.ecorisk.score > 75)

  return {
    ...packet,
    aion: {
      fcPredito: resultado.fcPredito,
      confianca,
      drift,
      modelo: resultado.modelo.versao,
      intervalo: resultado.intervalo,
    },
  }
}
