/**
 * @file shared/schemas.ts
 * @description CORE MIX PRO — Schemas Zod para validação de inputs e outputs.
 *              Fundação tipada do sistema, derivada da aba DADOS + DOSAGEM
 *              do Densus Engine.
 *
 * CONVENÇÃO:
 *   - *InputSchema   → dados que o usuário fornece (células amarelas na planilha)
 *   - *OutputSchema  → resultados calculados pelo sistema
 *   - *Schema        → tipos intermediários / entidades de domínio
 *
 * Dependências: zod ^3.x
 */

import { z } from "zod";
import type {
  CimentoId,
  AgregadoMiudoId,
  AgregadoGraudoId,
  AditivoId,
  ScmId,
} from "../lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTAÇÃO DOS TIPOS DE ID (para consumo externo sem importar constants)
// ─────────────────────────────────────────────────────────────────────────────

export const CimentoIdSchema = z.enum(["CIM-1", "CIM-2", "CIM-3", "CIM-4"]);
export const AgregadoMiudoIdSchema = z.enum(["M1", "M2"]);
export const AgregadoGraudoIdSchema = z.enum(["G1", "G2", "G3"]);
export const AditivoIdSchema = z.enum(["AD-1", "AD-2", "AD-3", "AD-4", "AD-5"]);
export const ScmIdSchema = z.enum(["SCM-1", "SCM-2", "SCM-3", "SCM-4"]);

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 1 — DADOS DO PROJETO
// Corresponde ao bloco "1. DADOS DO PROJETO" da aba DOSAGEM
// ─────────────────────────────────────────────────────────────────────────────

export const DadosProjetoInputSchema = z.object({
  /** Nome da obra ou cliente */
  obra: z.string().min(1, "Nome da obra é obrigatório"),

  /** Responsável técnico (engenheiro ou tecnologista) */
  responsavelTecnico: z.string().optional(),

  /** Data do estudo de dosagem (ISO 8601) */
  dataEstudo: z.string().optional(),

  /**
   * Resistência característica à compressão especificada em projeto — MPa
   * Faixa válida: 10–120 MPa (concretos convencionais a UHPC)
   */
  fckMPa: z
    .number()
    .min(10, "fck mínimo: 10 MPa")
    .max(120, "fck máximo: 120 MPa"),

  /**
   * Desvio padrão do controle tecnológico — MPa
   * Nível fraco: σ > 6 | Médio: 4–6 | Bom: 2.5–4 | Excelente: < 2.5
   * Referência: NBR 12655 Tabela 2
   */
  desvioPadraoCampoMPa: z
    .number()
    .min(0)
    .max(10)
    .default(4.0),

  /**
   * Fator t de Student (grau de confiança)
   * 1.65 = 95% | 1.28 = 90% | 2.33 = 99%
   */
  fatorTStudent: z.number().min(1.0).max(3.0).default(1.65),

  /**
   * Slump (abatimento) especificado — mm
   * Referência: NBR 6118:2023 Tabela 8.1
   */
  slumpMm: z.number().min(0).max(260).default(100),

  /**
   * Dimensão máxima característica do agregado — mm
   * Valores típicos: 9.5 | 12.5 | 19 | 25 | 37.5 | 50
   */
  dmcMm: z.number().positive().default(19),

  /**
   * Classe de agressividade ambiental (NBR 6118:2023 Tabela 6.1)
   * CAA-I (fraca) → CAA-IV (muito agressiva)
   */
  classeAgressividade: z
    .enum(["CAA-I", "CAA-II", "CAA-III", "CAA-IV"])
    .default("CAA-II"),

  /** Norma de referência para o projeto */
  norma: z.string().default("NBR 6118:2023"),
});

export type DadosProjetoInput = z.infer<typeof DadosProjetoInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 2 — SELEÇÃO DE MATERIAIS (GENÉRICO N MATERIAIS)
// O usuário escolhe quais materiais do banco serão usados na dosagem
// ─────────────────────────────────────────────────────────────────────────────

/** Item de material selecionado: ID + fração no grupo */
export const MaterialItemSchema = z.object({
  id: z.string().min(1),
  /** Fração deste material no total da categoria (0–1) */
  fracao: z.number().min(0).max(1).default(1),
});
export type MaterialItem = z.infer<typeof MaterialItemSchema>;

/** Item de aditivo dosado por fração da massa de cimento */
export const AditivoItemSchema = z.object({
  id: z.string().min(1),
  /** Dosagem — fração da massa de cimento (ex: 0.012 = 1.2%) */
  fracaoCimento: z.number().min(0).max(0.10).default(0.012),
});
export type AditivoItem = z.infer<typeof AditivoItemSchema>;

/** Item de material dosado por kg/m³ (fibras, compensadores, etc.) */
export const MaterialDosadoKgSchema = z.object({
  id: z.string().min(1),
  /** Dosagem direta — kg/m³ de concreto */
  kgM3: z.number().min(0).max(200).default(0),
});
export type MaterialDosadoKg = z.infer<typeof MaterialDosadoKgSchema>;

export const SelecaoMateriaisInputSchema = z.object({
  /** Cimentos — min 1, max 3 (blend por fração) */
  cimentos: z.array(MaterialItemSchema).min(1).max(3),
  /** Areias — min 1, max 4 */
  areias: z.array(MaterialItemSchema).min(1).max(4),
  /** Britas — min 1, max 4 */
  britas: z.array(MaterialItemSchema).min(1).max(4),
  /** Aditivos SP — dosados por fração da massa de cimento */
  aditivosSp: z.array(AditivoItemSchema).max(3).default([]),
  /** SCMs — dosados por fração de substituição ao cimento */
  scms: z.array(MaterialItemSchema).max(4).default([]),
  /** Fibras — dosadas por kg/m³ */
  fibras: z.array(MaterialDosadoKgSchema).max(3).default([]),
  /** Compensadores de retração — dosados por kg/m³ */
  compensadores: z.array(MaterialDosadoKgSchema).max(2).default([]),
  /** Cristalizantes — dosados por kg/m³ */
  cristalizantes: z.array(MaterialDosadoKgSchema).max(2).default([]),
  /** Pigmentos — dosados por kg/m³ */
  pigmentos: z.array(MaterialDosadoKgSchema).max(2).default([]),
});

export type SelecaoMateriaisInput = z.infer<typeof SelecaoMateriaisInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 3 — PARÂMETROS DE DOSAGEM
// Proporções e parâmetros de composição (entradas editáveis do engenheiro)
// ─────────────────────────────────────────────────────────────────────────────

export const ParametrosDosagemInputSchema = z.object({
  /**
   * Relação água/cimento adotada — adimensional
   * Calculado via Lei de Abrams; pode ser ajustado manualmente
   * Limite máximo por NBR 6118 Tabela 7.1 (função da CAA)
   */
  relacaoAgua_Cimento: z
    .number()
    .min(0.25, "a/c mínimo prático: 0,25")
    .max(0.75, "a/c máximo típico: 0,75"),

  /**
   * Fração total de SCM em substituição ao cimento — fração (soma das frações de cada SCM)
   * Exemplo: 0.10 = 10% de SCM em substituição ao cimento
   */
  fracaoScm: z.number().min(0).max(0.70).default(0),

  /**
   * Porcentagem de argamassa em relação ao volume de concreto — fração
   * Típico: 0.48–0.65 (IPT-EPUSP)
   */
  fracaoArgamassa: z
    .number()
    .min(0.40)
    .max(0.75)
    .default(0.60),

  /**
   * Teor de ar aprisionado — fração do volume de concreto
   * Padrão: 0.02 (2%) para concreto vibrado sem incorporador de ar
   */
  fracaoArAprisionado: z.number().min(0).max(0.08).default(0.02),
});

export type ParametrosDosagemInput = z.infer<typeof ParametrosDosagemInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 4 — INPUT COMPOSTO (raiz do formulário de dosagem)
// Une todos os inputs numa única estrutura validável pelo tRPC
// ─────────────────────────────────────────────────────────────────────────────

export const DosagemInputSchema = z.object({
  projeto: DadosProjetoInputSchema,
  materiais: SelecaoMateriaisInputSchema,
  parametros: ParametrosDosagemInputSchema,
});

export type DosagemInput = z.infer<typeof DosagemInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5 — PARÂMETROS DA CURVA DE ABRAMS
// Usados pela aba ABRAMS para regressão ln-ln
// ─────────────────────────────────────────────────────────────────────────────

export const PontoAbrams = z.object({
  /** Identificador do ponto (P1, P2, ...) */
  id: z.string(),
  /** Referência / data do estudo */
  referencia: z.string().optional(),
  /** Tipo de corpo de prova (CP 10x20, CP 15x30) */
  tipoCp: z.string().optional(),
  /** Relação água/cimento do traço */
  relacaoAc: z.number().min(0.20).max(1.0),
  /** Resistência à compressão aos 28 dias — MPa */
  fc28dMPa: z.number().positive(),
  /** Resistências em idades intermediárias — MPa (opcionais) */
  fc1dMPa: z.number().positive().optional(),
  fc3dMPa: z.number().positive().optional(),
  fc7dMPa: z.number().positive().optional(),
  fc14dMPa: z.number().positive().optional(),
  fc56dMPa: z.number().positive().optional(),
  fc91dMPa: z.number().positive().optional(),
});

export type PontoAbrams = z.infer<typeof PontoAbrams>;

export const CurvaAbrams_ParamsSchema = z.object({
  /**
   * Intercepto A da regressão ln(Fc) = A + B × ln(a/c)
   * Capturado da aba ABRAMS — célula calibrada pelo banco de dados de obra
   */
  interceptoA: z.number(),
  /**
   * Inclinação B da regressão — deve ser negativo (lei de Abrams)
   * Valor de referência da planilha: −1.5318
   */
  inclinacaoB: z.number().negative(),
  /**
   * Coeficiente de determinação R² da regressão
   * Aceito: R² ≥ 0.90 | Excelente: R² ≥ 0.97
   */
  r2: z.number().min(0).max(1),
  /** Pontos de estudo utilizados na calibração (mínimo 3) */
  pontosEstudo: z.array(PontoAbrams).min(3),
});

export type CurvaAbrams_Params = z.infer<typeof CurvaAbrams_ParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 6 — OUTPUTS DE RESISTÊNCIA (DOSAGEM → ABRAMS)
// ─────────────────────────────────────────────────────────────────────────────

export const ResistenciaDosagemOutputSchema = z.object({
  /**
   * Resistência de dosagem — MPa
   * Fcj = Fck + t × σ   (NBR 12655)
   */
  fcjMPa: z.number(),
  /**
   * Resistência média esperada aos 28 dias — MPa
   * Estimada pela curva de Abrams calibrada
   */
  fcm28dEstimadoMPa: z.number(),
  /**
   * Relação a/c calculada pela Lei de Abrams para atingir Fcj
   */
  relacaoAcCalculado: z.number(),
  /** Resistências estimadas por idade pela curva de Abrams — MPa */
  resistenciasPorIdade: z.object({
    fc1d: z.number(),
    fc3d: z.number(),
    fc7d: z.number(),
    fc28d: z.number(),
    fc56d: z.number(),
    fc91d: z.number(),
  }),
});

export type ResistenciaDosagemOutput = z.infer<typeof ResistenciaDosagemOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 7 — OUTPUTS DA COMPOSIÇÃO PARA 1m³
// (Traço absoluto de volumes — método IPT-EPUSP)
// ─────────────────────────────────────────────────────────────────────────────

export const MaterialComposicaoSchema = z.object({
  /** Nome / descrição do material */
  descricao: z.string(),
  /** Massa específica real — t/m³ */
  densidadeTm3: z.number(),
  /** Massa por m³ de concreto — kg/m³ */
  massaKgM3: z.number(),
  /** Volume absoluto por m³ de concreto — L/m³ */
  volumeLM3: z.number(),
  /** Custo por m³ de concreto — R$/m³ */
  custoReaisM3: z.number(),
  /** Emissão de CO₂ por m³ de concreto — kg CO₂/m³ */
  co2KgM3: z.number(),
});

export type MaterialComposicao = z.infer<typeof MaterialComposicaoSchema>;

/** Linha de composição genérica com categoria */
export const LinhaComposicaoOutputSchema = z.object({
  categoria: z.string(),
  id: z.string(),
  descricao: z.string(),
  densidadeTm3: z.number(),
  massaKgM3: z.number(),
  volumeLM3: z.number(),
  custoReaisM3: z.number(),
  co2KgM3: z.number(),
});
export type LinhaComposicaoOutput = z.infer<typeof LinhaComposicaoOutputSchema>;

export const ComposicaoM3OutputSchema = z.object({
  /** Array de todas as linhas de materiais na composição */
  linhas: z.array(LinhaComposicaoOutputSchema),

  /** Somatório para verificação: deve ser ≈ 1000 L/m³ */
  totalVolumeLM3: z.number(),
  /** Massa total — kg/m³ */
  totalMassaKgM3: z.number(),
  /** Custo total — R$/m³ */
  totalCustoReaisM3: z.number(),
  /** CO₂ total — kg CO₂/m³ */
  totalCo2KgM3: z.number(),

  /** Flag de verificação: volume ≈ 1000 L (tolerância ±15 L) */
  verificacaoVolumeOk: z.boolean(),
});

export type ComposicaoM3Output = z.infer<typeof ComposicaoM3OutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 8 — OUTPUT DO TRAÇO UNITÁRIO
// Referência: 1 parte de cimento em massa
// ─────────────────────────────────────────────────────────────────────────────

export const TracoUnitarioOutputSchema = z.object({
  cimento: z.literal(1),
  /** Areias — proporção em relação ao cimento */
  areias: z.array(z.object({ id: z.string(), valor: z.number() })),
  /** Britas — proporção em relação ao cimento */
  britas: z.array(z.object({ id: z.string(), valor: z.number() })),
  /** a/c efetivo adotado */
  agua: z.number(),
  /** fração do aditivo em relação ao cimento */
  aditivoSp: z.number().optional(),
  /** SCM — fração de substituição ao cimento */
  scm: z.number().optional(),
});

export type TracoUnitarioOutput = z.infer<typeof TracoUnitarioOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 9 — OUTPUT COMPLETO DA DOSAGEM
// Estrutura raiz retornada pelo router tRPC `dosagem.calcular`
// ─────────────────────────────────────────────────────────────────────────────

export const DosagemOutputSchema = z.object({
  /** Resistências calculadas (Fcj, Fcm, a/c calculado) */
  resistencia: ResistenciaDosagemOutputSchema,
  /** Composição para 1 m³ com todos os materiais */
  composicaoM3: ComposicaoM3OutputSchema,
  /** Traço unitário de referência */
  tracoUnitario: TracoUnitarioOutputSchema,
  /**
   * Verificações técnicas NBR 6118:2023 / ACI 318
   * Cada entrada: { campo, valorAdotado, limiteNorma, aprovado }
   */
  verificacoesTecnicas: z.array(
    z.object({
      campo: z.string(),
      valorAdotado: z.number(),
      limiteNorma: z.number(),
      aprovado: z.boolean(),
    })
  ),
});

export type DosagemOutput = z.infer<typeof DosagemOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÃO 10 — UMIDADE DE CAMPO (correção de traço em obra)
// ─────────────────────────────────────────────────────────────────────────────

/** Umidade de campo por agregado (id + % medida) */
export const UmidadeAgregadoSchema = z.object({
  id: z.string().min(1),
  umidadePercent: z.number().min(0).max(15),
});

export const UmidadeCampoInputSchema = z.object({
  /** Umidades medidas em campo — um item por agregado selecionado */
  agregados: z.array(UmidadeAgregadoSchema).default([]),
});

export type UmidadeCampoInput = z.infer<typeof UmidadeCampoInputSchema>;
