// @concrya/schemas — Schemas Zod compartilhados do ecossistema CONCRYA

import { z } from "zod"

// ── Peneiras (NBR NM 248 + #200) ───────────────────────────────

export const PENEIRAS_VALIDAS = [
  "75", "63", "50", "37.5", "31.5", "25", "19", "12.5", "9.5",
  "6.3", "4.8", "2.4", "1.2", "0.6", "0.3", "0.15", "0.075", "fundo",
] as const

export type PeneiraValida = (typeof PENEIRAS_VALIDAS)[number]

// ── Schemas de materiais ────────────────────────────────────────

export const litologiaSchema = z.enum([
  "basalto", "diabasio", "granitico", "gnaisse",
  "calcario", "arenito", "seixo", "quartzo",
])

export const sistemaConcreteSchema = z.enum(["CCV", "CAA", "UHPC", "SEMIDRY"])

export const classeAgressividadeSchema = z.enum(["I", "II", "III", "IV"])

export const cimentoSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  tipo: z.string().min(1),
  fabricante: z.string().min(1),
  fabrica: z.string().optional(),
  rhoCimento: z.number().positive(),
  blaine: z.number().positive().optional(),
  r1d: z.number().nonnegative().optional(),
  r3d: z.number().nonnegative().optional(),
  r7d: z.number().nonnegative().optional(),
  r28d: z.number().nonnegative().optional(),
  c3aEstimado: z.number().nonnegative().optional(),
  so3: z.number().nonnegative().optional(),
  familia: sistemaConcreteSchema,
  origem: z.enum(["ensaio_real", "literatura"]).optional(),
  fonte: z.string().optional(),
  dataRef: z.string().optional(),
})

export const agregadoGraudoSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  tipo: z.enum(["brita0", "brita1", "pedrisco", "brita4"]),
  litologia: litologiaSchema,
  origem: z.string().min(1),
  dmc: z.number().positive(),
  mf: z.number().nonnegative().optional(),
  rhoDry: z.number().positive().optional(),
  rhoSss: z.number().positive().optional(),
  rhoAparente: z.number().positive().optional(),
  muSolto: z.number().positive().optional(),
  muCompactado: z.number().positive().optional(),
  absorcao: z.number().nonnegative().optional(),
  materialPulv: z.number().nonnegative().optional(),
  curvaGranulo: z.record(z.string(), z.number()).optional(),
  statusNBR: z.enum(["ok", "warn", "fail"]).default("ok"),
  fonte: z.string().optional(),
})

export const agregadoMiudoSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  tipo: z.enum(["natural", "artificial", "po_pedra"]),
  litologia: litologiaSchema,
  origem: z.string().min(1),
  dmc: z.number().positive(),
  mf: z.number().nonnegative(),
  rhoDry: z.number().positive().optional(),
  rhoSss: z.number().positive().optional(),
  muSolto: z.number().positive().optional(),
  muCompactado: z.number().positive().optional(),
  absorcao: z.number().nonnegative().optional(),
  materialPulv: z.number().nonnegative().optional(),
  curvaGranulo: z.record(z.string(), z.number()).optional(),
  statusMF: z.enum(["ok", "warn", "fail"]).default("ok"),
  fonte: z.string().optional(),
})

export const aditivoSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  fabricante: z.string().min(1),
  tipo: z.enum(["SP", "VMA", "AR", "AC", "RE"]),
  classe: z.string().optional(),
  baseQuimica: z.string().optional(),
  rhoDensidade: z.number().positive().optional(),
  dosMin: z.number().nonnegative().optional(),
  dosMax: z.number().nonnegative().optional(),
  dosRef: z.number().nonnegative().optional(),
  unidadeDose: z.enum(["%", "L/100kg"]).optional(),
  sistemaAlvo: sistemaConcreteSchema,
  compatSCM: z.enum(["sim", "parcial", "restrita"]).optional(),
  impactoPega: z.enum(["acelera", "retarda", "neutro"]).optional(),
  fonte: z.string().optional(),
})

export const adicaoSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  tipo: z.enum(["metacaulim", "silica_ativa", "cinza_f", "escoria", "filler"]),
  tipoFuncional: z.enum(["inerte", "pozzolanica", "latente_hidraulica"]).optional(),
  estado: z.enum(["po", "dispersao_aquosa"]).optional(),
  fabricante: z.string().optional(),
  rhoDensidade: z.number().positive().optional(),
  blaine: z.number().positive().optional(),
  sio2: z.number().nonnegative().optional(),
  al2o3: z.number().nonnegative().optional(),
  areaEspecifica: z.number().positive().optional(),
  reatividade: z.enum(["alta", "media", "inerte"]).optional(),
  teorSolidos: z.number().min(0).max(100).optional(),
  teorAgua: z.number().min(0).max(100).optional(),
  dosRef: z.number().nonnegative().optional(),
  fonte: z.string().optional(),
})

export const familiaTracoSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  descricao: z.string().optional(),
  cimentoCodigo: z.string().min(1),
  sistemaConcreto: sistemaConcreteSchema,
  abramsA: z.number(),
  abramsB: z.number(),
  abramsR2: z.number().min(0).max(1).optional(),
  abramsForm: z.enum(["exponencial", "potencia"]).default("exponencial"),
  acMin: z.number().positive(),
  acMax: z.number().positive(),
  fc28Ref: z.number().positive(),
  slumpRef: z.number().nonnegative().optional(),
  notas: z.string().optional(),
  fonte: z.string().optional(),
})

// ── Schema de traço (input para cálculo) ────────────────────────

export const tracoInputSchema = z.object({
  fckAlvo: z.number().positive(),
  sistemaConcreto: sistemaConcreteSchema,
  classeAgressividade: classeAgressividadeSchema,
  cimentoCodigo: z.string().min(1),
  familiaCodigo: z.string().optional(),
  aguaKg: z.number().positive().optional(),
  aguaSuspensaoKg: z.number().min(0).optional(),
  litologia: litologiaSchema.optional(),
})
