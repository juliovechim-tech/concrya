import type { ModeloPredict } from "./types"
import { DATASET } from "./dataset"
import { treinar } from "./regression"

// Treina uma vez na importação — sem runtime training
export const MODELO_PADRAO: ModeloPredict = treinar(DATASET)
