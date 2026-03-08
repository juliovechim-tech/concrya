// DENSUS ENGINE — Input tipado para dosagem completa
//
// Concreto com granulometria, empacotamento CPM e custo.
// Ref: Fuller (1907) · Faury (1958) · Bolomey (1935) · Andreasen-Mulcahy

import { z } from "zod"

export const densusInputSchema = z.object({
  cimentoType: z.string().min(1),
  fck: z.number().min(1).max(200),
  ac: z.number().min(0.20).max(0.90),
  slump: z.number().min(0).max(800),
  consumoCimento: z.number().min(50).max(1200),
  consumoAgua: z.number().min(50).max(500),
  consumoAreia: z.number().min(0).max(1500),
  consumoBrita: z.number().min(0).max(1500),
  adicoes: z.object({
    silicaAtiva: z.number().min(0).optional(),
    metacaulim: z.number().min(0).optional(),
    escoria: z.number().min(0).optional(),
    cinzaVolante: z.number().min(0).optional(),
  }).optional(),
  metodoGranulometria: z.enum(["Fuller", "Faury", "Bolomey", "Andreasen"]),
  dmax: z.number().min(1).max(150),
  dmin: z.number().min(0.001).max(10).optional(),
  q: z.number().min(0.1).max(0.9).optional(),
  precos: z.object({
    cimento: z.number().min(0).optional(),
    areia: z.number().min(0).optional(),
    brita: z.number().min(0).optional(),
  }).optional(),
})

export type DensusInput = z.infer<typeof densusInputSchema>
