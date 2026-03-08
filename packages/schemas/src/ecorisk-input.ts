// ECORISK — Input tipado para análise de eco-risco
//
// Aceita CONCRETO ou ARGAMASSA. Foco nos campos de risco.
// Ref: Derringer-Suich (1980) · ECORISK® framework

export interface EcoriskInput {
  tipoMaterial: "CONCRETO" | "ARGAMASSA"
  cimentoType: string
  fck: number
  ac: number
  /** Slump — mm (concreto) */
  slump?: number
  /** Espalhamento — mm (argamassa) */
  espalhamento?: number
  consumoCimento: number
  consumoAgua: number
  /** Areia total — kg/m³ */
  consumoAreia: number
  /** Brita — kg/m³ (0 para argamassa) */
  consumoBrita: number
  agenteExpansivo?: "CSA-K" | "CSA-G" | "ETTRINGITA" | "NENHUM"
  teorAgente?: number
  adicoes?: Record<string, number>
}
