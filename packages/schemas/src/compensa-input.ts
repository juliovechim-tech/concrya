// COMPENSA CORE — Input tipado para concreto de retração compensada
//
// Concreto TEM brita. TEM agente expansivo. TEM adições opcionais.
// Ref: ACI 223R-10 · fib MC2010

import { z } from "zod"

export const compensaInputSchema = z.object({
  cimentoType: z.string().min(1),
  fck: z.number().min(1).max(200),
  ac: z.number().min(0.20).max(0.90),
  slump: z.number().min(0).max(800),
  consumoCimento: z.number().min(50).max(1200),
  consumoAgua: z.number().min(50).max(500),
  consumoAreia: z.number().min(0).max(1500),
  consumoBrita: z.number().min(0).max(1500),
  agenteExpansivo: z.enum(["CSA-K", "CSA-G", "ETTRINGITA", "NENHUM"]),
  teorAgente: z.number().min(0).max(200),
  adicoes: z.object({
    silicaAtiva: z.number().min(0).optional(),
    metacaulim: z.number().min(0).optional(),
  }).optional(),
})

export type CompensaInput = z.infer<typeof compensaInputSchema>
