import type { AmostraConcreto } from "./types"

export const FEATURE_NAMES: string[] = [
  "ac",
  "1/ac",
  "log(ac)",
  "consumoCimento/1000",
  "slump/300",
  "idadeDias/28",
  "silicaAtiva",
  "metacaulim",
  "escoria",
  "cinzaVolante",
  "CP_V_ARI",
  "CP_IV",
  "CP_II_E",
  "CP_II_F",
]

export function extractFeatures(amostra: AmostraConcreto): number[] {
  return [
    amostra.ac,
    1 / amostra.ac,
    Math.log(amostra.ac),
    amostra.consumoCimento / 1000,
    amostra.slump / 300,
    amostra.idadeDias / 28,
    amostra.silicaAtiva ?? 0,
    amostra.metacaulim ?? 0,
    amostra.escoria ?? 0,
    amostra.cinzaVolante ?? 0,
    amostra.cimentoType === "CP V ARI" ? 1 : 0,
    amostra.cimentoType === "CP IV" ? 1 : 0,
    amostra.cimentoType === "CP II-E" ? 1 : 0,
    amostra.cimentoType === "CP II-F" ? 1 : 0,
  ]
}
