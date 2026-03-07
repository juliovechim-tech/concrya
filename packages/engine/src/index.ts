// @concrya/engine — Densus Engine: calculos puros de engenharia cimenticía

export { calcAbrams, calcAbramsPotencia, calcAcInverso } from "./abrams"
export {
  AC_MAX_NBR6118,
  CIMENTO_MIN_NBR6118,
  verificarConformidadeNBR6118,
  ALPHA_I_TABELA,
  calcModuloElasticidade,
} from "./normativas"
export {
  teqArrhenius,
  teqNurseSaul,
  fcModel,
  predictFc,
  estimateParams,
  calcMetrics,
  avaliarPiloto,
} from "./thermocore"
export type { LoteEnsaio, ThermoMetrics } from "./thermocore"
export { buildPacketFromMix } from "./packet"
