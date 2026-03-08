// ECORISK — Input tipado para análise de eco-risco
//
// Aceita CONCRETO ou ARGAMASSA. Foco nos campos de risco.
// Ref: Derringer-Suich (1980) · ECORISK® framework

import { z } from "zod"

export const ecoriskInputSchema = z.object({
  tipoMaterial: z.enum(["CONCRETO", "ARGAMASSA"]),
  cimentoType: z.string().min(1),
  fck: z.number().min(1).max(200),
  ac: z.number().min(0.20).max(0.90),
  slump: z.number().min(0).max(800).optional(),
  espalhamento: z.number().min(0).max(800).optional(),
  consumoCimento: z.number().min(50).max(1200),
  consumoAgua: z.number().min(50).max(500),
  consumoAreia: z.number().min(0).max(1500),
  consumoBrita: z.number().min(0).max(1500),
  agenteExpansivo: z.enum(["CSA-K", "CSA-G", "ETTRINGITA", "NENHUM"]).optional(),
  teorAgente: z.number().min(0).max(200).optional(),
  adicoes: z.record(z.string(), z.number()).optional(),
})

export type EcoriskInput = z.infer<typeof ecoriskInputSchema>
