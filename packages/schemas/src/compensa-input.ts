// COMPENSA CORE — Input tipado para concreto de retração compensada
//
// Concreto TEM brita. TEM agente expansivo. TEM adições opcionais.
// Ref: ACI 223R-10 · fib MC2010

export interface CompensaInput {
  cimentoType: string
  fck: number
  ac: number
  slump: number
  consumoCimento: number
  consumoAgua: number
  consumoAreia: number
  consumoBrita: number
  agenteExpansivo: "CSA-K" | "CSA-G" | "ETTRINGITA" | "NENHUM"
  teorAgente: number
  adicoes?: {
    silicaAtiva?: number   // kg/m³
    metacaulim?: number    // kg/m³
  }
}
