// DENSUS ENGINE — Input tipado para dosagem completa
//
// Concreto com granulometria, empacotamento CPM e custo.
// Ref: Fuller (1907) · Faury (1958) · Bolomey (1935) · Andreasen-Mulcahy

export interface DensusInput {
  cimentoType: string
  fck: number
  ac: number
  slump: number
  consumoCimento: number
  consumoAgua: number
  consumoAreia: number
  consumoBrita: number
  adicoes?: {
    silicaAtiva?: number    // kg/m³
    metacaulim?: number     // kg/m³
    escoria?: number        // kg/m³
    cinzaVolante?: number   // kg/m³
  }
  metodoGranulometria: "Fuller" | "Faury" | "Bolomey" | "Andreasen"
  dmax: number              // mm
  dmin?: number             // mm (Andreasen)
  q?: number                // expoente Andreasen
  precos?: {
    cimento?: number        // R$/kg
    areia?: number
    brita?: number
  }
}
