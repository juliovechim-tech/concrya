/**
 * Schemas Zod compartilhados entre cliente e servidor
 * Elimina duplicação e garante validação consistente
 */
import { z } from "zod";

// ========================================
// Granulometria — validação rigorosa
// ========================================

/** Peneiras padrão ABNT (mm) — aceitas no campo granulometria */
const PENEIRAS_VALIDAS = [
  "75", "63", "50", "37.5", "31.5", "25", "19", "12.5", "9.5",
  "6.3", "4.8", "2.4", "1.2", "0.6", "0.3", "0.15", "0.075", "fundo"
] as const;

/**
 * Schema de granulometria: Record de peneira → % retida acumulada
 * Valores devem ser entre 0 e 100
 */
export const granulometriaSchema = z.record(
  z.string().refine(
    (val) => PENEIRAS_VALIDAS.includes(val as any),
    { message: "Peneira inválida" }
  ),
  z.number().min(0).max(100)
).optional();

// ========================================
// Materiais
// ========================================

const tipoMaterialEnum = z.enum([
  "cimento", "areia", "brita", "filler_reativo",
  "filler_inerte", "aditivo", "fibra", "pigmento", "agua"
]);

export const materialBaseSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: tipoMaterialEnum,
  fornecedor: z.string().optional(),
  densidade: z.string(),
  custoUnitario: z.string().optional(),
  custoFrete: z.string().optional(),
  embalagem: z.string().optional(),
  qtdEmbalagem: z.string().optional(),
  moduloFinura: z.string().optional(),
  dmaxCaract: z.string().optional(),
  blaine: z.number().optional(),
  bet: z.string().optional(),
  malhaRetencao: z.string().optional(),
  teorSolidos: z.string().optional(),
  teorAgua: z.string().optional(),
  granulometria: granulometriaSchema,
  observacoes: z.string().optional(),
});

export const materialCreateSchema = materialBaseSchema;
export const materialUpdateSchema = materialBaseSchema.extend({ id: z.number() });

// ========================================
// Traços
// ========================================

const tipoConcreto = z.enum([
  "convencional", "caa", "hpc", "uhpc", "grc",
  "colorido", "leve", "bloco", "paver", "arquitetonico"
]);

/** Schema para a composição do traço (JSON estruturado) */
export const composicaoSchema = z.object({
  materiais: z.array(z.object({
    materialId: z.number().optional(),
    nome: z.string(),
    tipo: z.string(),
    quantidade: z.number(),
    unidade: z.string().optional(),
    custo: z.number().optional(),
  })).optional(),
}).passthrough(); // permite campos extras para flexibilidade

export const tracoBaseSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  tipoConcreto: tipoConcreto,
  fckAlvo: z.number().optional(),
  slumpAlvo: z.number().optional(),
  flowAlvo: z.number().optional(),
  teorArgamassa: z.string().optional(),
  relacaoAC: z.string().optional(),
  teorArIncorporado: z.string().optional(),
  composicao: z.any(), // mantém flexível por enquanto (já validado no front)
  consumoCimento: z.string().optional(),
  custoM3: z.string().optional(),
  massaEspecifica: z.string().optional(),
});

export const tracoCreateSchema = tracoBaseSchema;
export const tracoUpdateSchema = tracoBaseSchema.extend({ id: z.number() });

// ========================================
// Ensaios
// ========================================

export const ensaioCreateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tracoId: z.number().optional(),
  dataEnsaio: z.string(),
  resultados: z.any(),
  k1: z.string().optional(),
  k2: z.string().optional(),
  r2: z.string().optional(),
  observacoes: z.string().optional(),
});

// ========================================
// Curvas de Abrams
// ========================================

export const curvaAbramsCreateSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipoCimento: z.string().optional(),
  idade: z.number(),
  pontos: z.any(),
  k1: z.string(),
  k2: z.string(),
  r2: z.string().optional(),
  observacoes: z.string().optional(),
});

// ========================================
// Leads
// ========================================

export const leadCreateSchema = z.object({
  email: z.string().email("Email inválido"),
  nome: z.string().optional(),
  telefone: z.string().optional(),
  origem: z.string(),
  ferramenta: z.string().optional(),
  interesse: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});
