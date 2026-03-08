// NIVELIX CORE — Input tipado para argamassa autonivelante RC
//
// Argamassa NUNCA tem brita. Tem fíler, múltiplas areias,
// adição mineral, fibra, superplastificante, ar incorporado.
// Ref: EN 13813 · NBR 15823 · Roussel (2005)

import { z } from "zod"

export const nivelixInputSchema = z.object({
  cimentoType: z.string().min(1),
  fck: z.number().min(1).max(200),
  ac: z.number().min(0.20).max(0.90),
  consumoCimento: z.number().min(50).max(1200),
  consumoAgua: z.number().min(50).max(500),
  consumoAreiaFina: z.number().min(0).max(1500),
  consumoAreiaMedia: z.number().min(0).max(1500).optional(),
  consumoFiller: z.number().min(0).max(500).optional(),
  agenteExpansivo: z.enum(["CSA-K", "CSA-G", "ETTRINGITA", "NENHUM"]),
  teorAgente: z.number().min(0).max(200),
  adicaoMineral: z.enum(["SILICA_ATIVA", "METACAULIM", "NENHUMA"]).optional(),
  teorAdicaoMineral: z.number().min(0).max(200).optional(),
  temFibra: z.boolean(),
  tipoFibra: z.enum(["PP", "PVA"]).optional(),
  teorFibra: z.number().min(0).max(50).optional(),
  superplastificante: z.number().min(0).max(5).optional(),
  incorporadorAr: z.number().min(0).max(2).optional(),
  espalhamentoAlvo: z.number().min(50).max(400),
})

export type NivelixInput = z.infer<typeof nivelixInputSchema>
