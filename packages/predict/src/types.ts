export interface AmostraConcreto {
  // Inputs do traço
  ac: number              // relação água/cimento
  consumoCimento: number  // kg/m³
  cimentoType: string     // CP I..V
  slump: number           // mm
  idadeDias: number       // 7, 14, 28, 56, 91
  // Adições (frações em relação ao cimento)
  silicaAtiva?: number    // 0..0.15
  metacaulim?: number     // 0..0.15
  escoria?: number        // 0..0.40
  cinzaVolante?: number   // 0..0.30
  // Output
  fcMedido: number        // MPa — resistência real ensaiada
}

export interface ModeloPredict {
  versao: string
  algoritmo: "polynomial-regression" | "random-forest-lite" | "abrams-enhanced"
  coeficientes: number[]
  features: string[]
  r2: number              // coeficiente de determinação 0..1
  rmse: number            // erro quadrático médio (MPa)
  nAmostras: number
  treinadoEm: string      // ISO date
}

export interface ResultadoPredict {
  fcPredito: number              // MPa
  intervalo: [number, number]    // IC 90% [min, max]
  confianca: number              // 0..1
  drift: boolean
  modelo: ModeloPredict
}
