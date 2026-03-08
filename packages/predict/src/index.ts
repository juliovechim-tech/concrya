import type { AmostraConcreto, ResultadoPredict } from "./types"
import { MODELO_PADRAO } from "./model"
import { prever, treinar } from "./regression"

/**
 * API pública — prever fc com modelo pré-treinado.
 * Se fcMedido ausente, drift baseado só em ac e fcPredito.
 */
export function predict(
  input: Omit<AmostraConcreto, "fcMedido"> & { fcMedido?: number },
): ResultadoPredict {
  const amostra: AmostraConcreto = {
    ...input,
    fcMedido: input.fcMedido ?? 0,
  }
  return prever(amostra, MODELO_PADRAO)
}

export { MODELO_PADRAO, treinar, prever }
export type { AmostraConcreto, ModeloPredict, ResultadoPredict } from "./types"
export { DATASET } from "./dataset"
export { extractFeatures, FEATURE_NAMES } from "./features"
