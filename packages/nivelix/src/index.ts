// @concrya/nivelix — NIVELIX CORE
// Motor de formulacao para argamassa autonivelante RC + acustica
// Parceria: Chimica Edile (IT/US/BR/AR) + LIVELLARE
//
// Fundamentacao:
//   EN 13813: Screed material and floor screeds
//   NBR 15258: Argamassa para revestimento
//   NBR 15575-3:2021: Desempenho de edificacoes — Pisos
//   EN ISO 717-2: Avaliacao do isolamento acustico — Ruido de impacto
//   Roussel, N. (2005): Modelo de espalhamento reologico
//   Cremer, L. & Heckl, M. (1988): Structure-Borne Sound
//   Collepardi, M. (2006): The New Concrete, Tintoretto

export { avaliarReologia, estimarEspalhamento, estimarTau0DeEspalhamento, estimarT250, classificarEspalhamento } from "./reologia"
export { calcConsumo } from "./consumo"
export { calcAcustica } from "./acustica"
export { calcFormulacao } from "./formulacao"
export type {
  ClasseEspalhamento,
  ClasseResistencia,
  TipoAplicacao,
  TipoLigante,
  ParamsFormulacao,
  ResultadoFormulacao,
  ParamsConsumo,
  ResultadoConsumo,
  ParamsReologia,
  ResultadoReologia,
  ParamsAcustica,
  ResultadoAcustica,
} from "./types"
export { applyNivelix } from "./apply"
