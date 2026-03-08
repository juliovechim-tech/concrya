import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router, requirePlano } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { materiais, tracos, ensaios, curvasAbrams, historicoCustos, licencas, historicoLicencas, users, assinaturasHotmart, planos, leads, calculations } from "../drizzle/schema";
import { and, count, isNull, lt } from "drizzle-orm";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { runPipeline } from "@concrya/engine/pipeline";
import type { MixInput } from "@concrya/schemas";

// Limites de traços por nível de plano
const LIMITE_TRACOS: Record<string, number> = {
  gratuito: 3,
  basico: 3,
  tecnico: -1, // ilimitado
  avancado: -1,
  cientifico: -1,
  completo: -1,
};

async function verificarLimiteTracos(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number) {
  // Buscar licença do usuário
  const licencaResult = await db.select().from(licencas)
    .where(eq(licencas.userId, userId))
    .limit(1);

  let nivel = "gratuito";
  if (licencaResult.length > 0) {
    const lic = licencaResult[0];
    const ativa = lic.status === "ativa";
    const naoExpirada = !lic.dataExpiracao || new Date(lic.dataExpiracao) > new Date();
    if (ativa && naoExpirada) {
      nivel = lic.nivel;
    }
  }

  const limite = LIMITE_TRACOS[nivel] ?? 3;
  if (limite === -1) return; // ilimitado

  const [resultado] = await db.select({ total: count() }).from(tracos)
    .where(eq(tracos.userId, userId));

  if (resultado.total >= limite) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Limite de ${limite} traços atingido no plano ${nivel}. Faça upgrade para salvar mais traços.`,
    });
  }
}

// Procedures com verificação de plano no backend
const tecnicoProcedure = protectedProcedure.use(requirePlano("tecnico"));
const avancadoProcedure = protectedProcedure.use(requirePlano("avancado"));
const cientificoProcedure = protectedProcedure.use(requirePlano("cientifico"));

// Schema Zod para MixInput (validacao server-side)
const mixInputSchema = z.object({
  cimentoType: z.string().min(1),
  fck: z.number().min(1).max(200),
  ac: z.number().min(0.20).max(0.90),
  slump: z.number().min(0).max(800),
  consumoCimento: z.number().min(50).max(1200),
  consumoAgua: z.number().min(50).max(500),
  consumoAreia: z.number().min(0).max(1500),
  consumoBrita: z.number().min(0).max(1500),
  adicoes: z.record(z.string(), z.number()).optional(),
  project: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Materiais Router
  materiais: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(materiais).where(eq(materiais.userId, ctx.user.id)).orderBy(desc(materiais.updatedAt));
    }),

    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        tipo: z.enum(["cimento", "areia", "brita", "filler_reativo", "filler_inerte", "aditivo", "fibra", "pigmento", "agua"]),
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
        granulometria: z.any().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(materiais).values({
          userId: ctx.user.id,
          nome: input.nome,
          tipo: input.tipo,
          fornecedor: input.fornecedor || null,
          densidade: input.densidade,
          custoUnitario: input.custoUnitario || null,
          custoFrete: input.custoFrete || null,
          embalagem: input.embalagem || null,
          qtdEmbalagem: input.qtdEmbalagem || null,
          moduloFinura: input.moduloFinura || null,
          dmaxCaract: input.dmaxCaract || null,
          blaine: input.blaine || null,
          bet: input.bet || null,
          malhaRetencao: input.malhaRetencao || null,
          teorSolidos: input.teorSolidos || null,
          teorAgua: input.teorAgua || null,
          granulometria: input.granulometria || null,
          observacoes: input.observacoes || null,
        });
        
        return { success: true, id: result[0].insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1),
        tipo: z.enum(["cimento", "areia", "brita", "filler_reativo", "filler_inerte", "aditivo", "fibra", "pigmento", "agua"]),
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
        granulometria: z.any().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.update(materiais)
          .set({
            nome: input.nome,
            tipo: input.tipo,
            fornecedor: input.fornecedor || null,
            densidade: input.densidade,
            custoUnitario: input.custoUnitario || null,
            custoFrete: input.custoFrete || null,
            embalagem: input.embalagem || null,
            qtdEmbalagem: input.qtdEmbalagem || null,
            moduloFinura: input.moduloFinura || null,
            dmaxCaract: input.dmaxCaract || null,
            blaine: input.blaine || null,
            bet: input.bet || null,
            malhaRetencao: input.malhaRetencao || null,
            teorSolidos: input.teorSolidos || null,
            teorAgua: input.teorAgua || null,
            granulometria: input.granulometria || null,
            observacoes: input.observacoes || null,
          })
          .where(and(eq(materiais.id, input.id), eq(materiais.userId, ctx.user.id)));
        
        if (result[0].affectedRows === 0) throw new Error("Material não encontrado ou sem permissão");
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.delete(materiais).where(and(eq(materiais.id, input.id), eq(materiais.userId, ctx.user.id)));
        if (result[0].affectedRows === 0) throw new Error("Material não encontrado ou sem permissão");
        return { success: true };
      }),
  }),

  // Traços Router
  tracos: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(tracos).where(eq(tracos.userId, ctx.user.id)).orderBy(desc(tracos.updatedAt));
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;
        const result = await db.select().from(tracos).where(and(eq(tracos.id, input.id), eq(tracos.userId, ctx.user.id))).limit(1);
        return result[0] || null;
      }),

    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1),
        descricao: z.string().optional(),
        tipoConcreto: z.enum(["convencional", "caa", "hpc", "uhpc", "grc", "colorido", "leve", "bloco", "paver", "arquitetonico"]),
        fckAlvo: z.number().optional(),
        slumpAlvo: z.number().optional(),
        flowAlvo: z.number().optional(),
        teorArgamassa: z.string().optional(),
        relacaoAC: z.string().optional(),
        teorArIncorporado: z.string().optional(),
        composicao: z.any(),
        consumoCimento: z.string().optional(),
        custoM3: z.string().optional(),
        massaEspecifica: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verificar limite de traços pelo plano do usuário
        if (ctx.user.role !== "admin") {
          await verificarLimiteTracos(db, ctx.user.id);
        }

        const result = await db.insert(tracos).values({
          userId: ctx.user.id,
          nome: input.nome,
          descricao: input.descricao || null,
          tipoConcreto: input.tipoConcreto,
          fckAlvo: input.fckAlvo || null,
          slumpAlvo: input.slumpAlvo || null,
          flowAlvo: input.flowAlvo || null,
          teorArgamassa: input.teorArgamassa || null,
          relacaoAC: input.relacaoAC || null,
          teorArIncorporado: input.teorArIncorporado || null,
          composicao: input.composicao,
          consumoCimento: input.consumoCimento || null,
          custoM3: input.custoM3 || null,
          massaEspecifica: input.massaEspecifica || null,
        });
        
        // Salvar histórico de custo
        if (input.custoM3) {
          await db.insert(historicoCustos).values({
            userId: ctx.user.id,
            tracoId: result[0].insertId,
            data: new Date(),
            custoM3: input.custoM3,
            detalhes: input.composicao,
          });
        }
        
        return { success: true, id: result[0].insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
        tipoConcreto: z.enum(["convencional", "caa", "hpc", "uhpc", "grc", "colorido", "leve", "bloco", "paver", "arquitetonico"]),
        fckAlvo: z.number().optional(),
        slumpAlvo: z.number().optional(),
        flowAlvo: z.number().optional(),
        teorArgamassa: z.string().optional(),
        relacaoAC: z.string().optional(),
        teorArIncorporado: z.string().optional(),
        composicao: z.any(),
        consumoCimento: z.string().optional(),
        custoM3: z.string().optional(),
        massaEspecifica: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.update(tracos)
          .set({
            nome: input.nome,
            descricao: input.descricao || null,
            tipoConcreto: input.tipoConcreto,
            fckAlvo: input.fckAlvo || null,
            slumpAlvo: input.slumpAlvo || null,
            flowAlvo: input.flowAlvo || null,
            teorArgamassa: input.teorArgamassa || null,
            relacaoAC: input.relacaoAC || null,
            teorArIncorporado: input.teorArIncorporado || null,
            composicao: input.composicao,
            consumoCimento: input.consumoCimento || null,
            custoM3: input.custoM3 || null,
            massaEspecifica: input.massaEspecifica || null,
          })
          .where(and(eq(tracos.id, input.id), eq(tracos.userId, ctx.user.id)));
        
        if (result[0].affectedRows === 0) throw new Error("Traço não encontrado ou sem permissão");
        
        // Salvar histórico de custo
        if (input.custoM3) {
          await db.insert(historicoCustos).values({
            userId: ctx.user.id,
            tracoId: input.id,
            data: new Date(),
            custoM3: input.custoM3,
            detalhes: input.composicao,
          });
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.delete(tracos).where(and(eq(tracos.id, input.id), eq(tracos.userId, ctx.user.id)));
        if (result[0].affectedRows === 0) throw new Error("Traço não encontrado ou sem permissão");
        return { success: true };
      }),
  }),

  // Ensaios Router (requer plano avançado - laboratório)
  ensaios: router({
    list: avancadoProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ensaios).where(eq(ensaios.userId, ctx.user.id)).orderBy(desc(ensaios.updatedAt));
    }),

    create: avancadoProcedure
      .input(z.object({
        nome: z.string().min(1),
        tracoId: z.number().optional(),
        dataEnsaio: z.string(),
        resultados: z.any(),
        k1: z.string().optional(),
        k2: z.string().optional(),
        r2: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(ensaios).values({
          userId: ctx.user.id,
          nome: input.nome,
          tracoId: input.tracoId || null,
          dataEnsaio: new Date(input.dataEnsaio),
          resultados: input.resultados,
          k1: input.k1 || null,
          k2: input.k2 || null,
          r2: input.r2 || null,
          observacoes: input.observacoes || null,
        });
        
        return { success: true, id: result[0].insertId };
      }),

    delete: avancadoProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.delete(ensaios).where(and(eq(ensaios.id, input.id), eq(ensaios.userId, ctx.user.id)));
        if (result[0].affectedRows === 0) throw new Error("Ensaio não encontrado ou sem permissão");
        return { success: true };
      }),
  }),

  // Curvas de Abrams Router (requer plano técnico)
  curvas: router({
    list: tecnicoProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(curvasAbrams).where(eq(curvasAbrams.userId, ctx.user.id)).orderBy(desc(curvasAbrams.updatedAt));
    }),

    create: tecnicoProcedure
      .input(z.object({
        nome: z.string().min(1),
        tipoCimento: z.string().optional(),
        idade: z.number(),
        pontos: z.any(),
        k1: z.string(),
        k2: z.string(),
        r2: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(curvasAbrams).values({
          userId: ctx.user.id,
          nome: input.nome,
          tipoCimento: input.tipoCimento || null,
          idade: input.idade,
          pontos: input.pontos,
          k1: input.k1,
          k2: input.k2,
          r2: input.r2 || null,
          observacoes: input.observacoes || null,
        });
        
        return { success: true, id: result[0].insertId };
      }),

    delete: tecnicoProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.delete(curvasAbrams).where(and(eq(curvasAbrams.id, input.id), eq(curvasAbrams.userId, ctx.user.id)));
        if (result[0].affectedRows === 0) throw new Error("Curva não encontrada ou sem permissão");
        return { success: true };
      }),
  }),

  // Histórico de Custos Router
  historico: router({
    list: protectedProcedure
      .input(z.object({ tracoId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        
        if (input.tracoId) {
          return db.select().from(historicoCustos)
            .where(eq(historicoCustos.tracoId, input.tracoId))
            .orderBy(desc(historicoCustos.data));
        }
        
        return db.select().from(historicoCustos)
          .where(eq(historicoCustos.userId, ctx.user.id))
          .orderBy(desc(historicoCustos.data));
      }),
  }),

  // Licenças Router (Admin Only)
  licencas: router({
    // Listar todas as licenças (admin only)
    listAll: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      
      const result = await db
        .select({
          licenca: licencas,
          usuario: {
            id: users.id,
            name: users.name,
            email: users.email,
            lastSignedIn: users.lastSignedIn,
          }
        })
        .from(licencas)
        .leftJoin(users, eq(licencas.userId, users.id))
        .orderBy(desc(licencas.updatedAt));
      
      return result;
    }),

    // Obter licença do usuário logado
    minha: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(licencas).where(eq(licencas.userId, ctx.user.id)).limit(1);
      return result[0] || null;
    }),

    // Criar licença (admin only)
    criar: adminProcedure
      .input(z.object({
        userId: z.number(),
        tipo: z.enum(["mensal", "anual", "vitalicia", "trial"]),
        nivel: z.enum(["basico", "tecnico", "avancado", "cientifico", "completo"]),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Calcular data de expiração
        let dataExpiracao: Date | null = null;
        const agora = new Date();
        
        if (input.tipo === "mensal") {
          dataExpiracao = new Date(agora.setMonth(agora.getMonth() + 1));
        } else if (input.tipo === "anual") {
          dataExpiracao = new Date(agora.setFullYear(agora.getFullYear() + 1));
        } else if (input.tipo === "trial") {
          dataExpiracao = new Date(agora.setDate(agora.getDate() + 7));
        }
        // vitalicia = null (sem expiração)
        
        const result = await db.insert(licencas).values({
          userId: input.userId,
          tipo: input.tipo,
          nivel: input.nivel,
          status: "ativa",
          dataInicio: new Date(),
          dataExpiracao,
          observacoes: input.observacoes || null,
          criadoPor: ctx.user.id,
        });
        
        // Registrar histórico
        await db.insert(historicoLicencas).values({
          licencaId: result[0].insertId,
          userId: input.userId,
          acao: "criada",
          detalhes: `Licença ${input.tipo} - Nível ${input.nivel}`,
          realizadoPor: ctx.user.id,
        });
        
        return { success: true, id: result[0].insertId };
      }),

    // Atualizar licença (admin only)
    atualizar: adminProcedure
      .input(z.object({
        id: z.number(),
        tipo: z.enum(["mensal", "anual", "vitalicia", "trial"]).optional(),
        nivel: z.enum(["basico", "tecnico", "avancado", "cientifico", "completo"]).optional(),
        status: z.enum(["ativa", "expirada", "cancelada", "suspensa"]).optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const licencaAtual = await db.select().from(licencas).where(eq(licencas.id, input.id)).limit(1);
        if (!licencaAtual[0]) throw new Error("Licença não encontrada");
        
        const updateData: Partial<{
          tipo: "mensal" | "anual" | "vitalicia" | "trial";
          nivel: "basico" | "tecnico" | "avancado" | "cientifico" | "completo";
          status: "ativa" | "expirada" | "cancelada" | "suspensa";
          observacoes: string | null;
        }> = {};
        if (input.tipo) updateData.tipo = input.tipo;
        if (input.nivel) updateData.nivel = input.nivel;
        if (input.status) updateData.status = input.status;
        if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
        
        await db.update(licencas).set(updateData).where(eq(licencas.id, input.id));
        
        // Registrar histórico
        await db.insert(historicoLicencas).values({
          licencaId: input.id,
          userId: licencaAtual[0].userId,
          acao: "alterada",
          detalhes: JSON.stringify(updateData),
          realizadoPor: ctx.user.id,
        });
        
        return { success: true };
      }),

    // Renovar licença (admin only)
    renovar: adminProcedure
      .input(z.object({
        id: z.number(),
        meses: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const licencaAtual = await db.select().from(licencas).where(eq(licencas.id, input.id)).limit(1);
        if (!licencaAtual[0]) throw new Error("Licença não encontrada");
        
        let novaExpiracao: Date | null = null;
        const baseDate = licencaAtual[0].dataExpiracao && new Date(licencaAtual[0].dataExpiracao) > new Date()
          ? new Date(licencaAtual[0].dataExpiracao)
          : new Date();
        
        if (licencaAtual[0].tipo === "mensal") {
          novaExpiracao = new Date(baseDate.setMonth(baseDate.getMonth() + (input.meses || 1)));
        } else if (licencaAtual[0].tipo === "anual") {
          novaExpiracao = new Date(baseDate.setFullYear(baseDate.getFullYear() + 1));
        }
        
        await db.update(licencas).set({
          status: "ativa",
          dataExpiracao: novaExpiracao,
        }).where(eq(licencas.id, input.id));
        
        // Registrar histórico
        await db.insert(historicoLicencas).values({
          licencaId: input.id,
          userId: licencaAtual[0].userId,
          acao: "renovada",
          detalhes: `Renovada até ${novaExpiracao?.toLocaleDateString("pt-BR")}`,
          realizadoPor: ctx.user.id,
        });
        
        return { success: true };
      }),

    // Suspender/Cancelar licença (admin only)
    suspender: adminProcedure
      .input(z.object({
        id: z.number(),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const licencaAtual = await db.select().from(licencas).where(eq(licencas.id, input.id)).limit(1);
        if (!licencaAtual[0]) throw new Error("Licença não encontrada");
        
        await db.update(licencas).set({ status: "suspensa" }).where(eq(licencas.id, input.id));
        
        // Registrar histórico
        await db.insert(historicoLicencas).values({
          licencaId: input.id,
          userId: licencaAtual[0].userId,
          acao: "suspensa",
          detalhes: input.motivo || "Suspensa pelo administrador",
          realizadoPor: ctx.user.id,
        });
        
        return { success: true };
      }),

    // Histórico de uma licença (admin only)
    historico: adminProcedure
      .input(z.object({ licencaId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(historicoLicencas)
          .where(eq(historicoLicencas.licencaId, input.licencaId))
          .orderBy(desc(historicoLicencas.createdAt));
      }),
  }),

  // Admin - Listar usuários
  admin: router({
    listarUsuarios: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(users).orderBy(desc(users.createdAt));
    }),

    promoverAdmin: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(users).set({ role: "admin" }).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // Licença do usuário atual
  minhaLicenca: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { licenca: null, plano: "gratuito" };
      
      const licencaResult = await db.select().from(licencas)
        .where(eq(licencas.userId, ctx.user.id))
        .limit(1);
      
      if (licencaResult.length === 0) {
        return { licenca: null, plano: "gratuito" };
      }
      
      const licenca = licencaResult[0];
      
      // Verificar se está expirada
      if (licenca.dataExpiracao && new Date(licenca.dataExpiracao) < new Date()) {
        return { licenca: { ...licenca, status: "expirada" }, plano: "gratuito" };
      }
      
      return { licenca, plano: licenca.nivel };
    }),

    // Iniciar trial de 7 dias
    iniciarTrial: protectedProcedure
      .input(z.object({ nivel: z.enum(["tecnico", "avancado", "cientifico"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se já usou trial
        const existente = await db.select().from(licencas)
          .where(eq(licencas.userId, ctx.user.id))
          .limit(1);
        
        if (existente.length > 0 && existente[0].tipo === "trial") {
          throw new Error("Você já utilizou seu período de trial");
        }
        
        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + 7);
        
        if (existente.length > 0) {
          await db.update(licencas)
            .set({
              tipo: "trial",
              nivel: input.nivel,
              status: "ativa",
              dataExpiracao,
            })
            .where(eq(licencas.userId, ctx.user.id));
        } else {
          await db.insert(licencas).values({
            userId: ctx.user.id,
            tipo: "trial",
            nivel: input.nivel,
            status: "ativa",
            dataExpiracao,
          });
        }
        
        return { success: true, dataExpiracao };
      }),

    // Contar traços do usuário (para verificar limite)
    contarTracos: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return 0;
      const result = await db.select().from(tracos).where(eq(tracos.userId, ctx.user.id));
      return result.length;
    }),
  }),

  // Leads Router - Captura de e-mails (público)
  leads: router({
    create: publicProcedure
      .input(z.object({
        email: z.string().email(),
        nome: z.string().optional(),
        telefone: z.string().optional(),
        origem: z.string(),
        ferramenta: z.string().optional(),
        interesse: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Verificar se já existe lead com este email
        const existing = await db.select().from(leads).where(eq(leads.email, input.email)).limit(1);
        
        if (existing.length > 0) {
          // Atualizar lead existente
          await db.update(leads)
            .set({
              nome: input.nome || existing[0].nome,
              telefone: input.telefone || existing[0].telefone,
              ferramenta: input.ferramenta || existing[0].ferramenta,
              interesse: input.interesse || existing[0].interesse,
            })
            .where(eq(leads.email, input.email));
          return { success: true, isNew: false, id: existing[0].id };
        }
        
        // Criar novo lead
        const result = await db.insert(leads).values({
          email: input.email,
          nome: input.nome || null,
          telefone: input.telefone || null,
          origem: input.origem,
          ferramenta: input.ferramenta || null,
          interesse: input.interesse || null,
          utmSource: input.utmSource || null,
          utmMedium: input.utmMedium || null,
          utmCampaign: input.utmCampaign || null,
        });
        
        return { success: true, isNew: true, id: result[0].insertId };
      }),

    // Verificar se email já existe (para não pedir novamente)
    checkEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { exists: false };
        const result = await db.select().from(leads).where(eq(leads.email, input.email)).limit(1);
        return { exists: result.length > 0 };
      }),

    // Admin: Listar todos os leads
    list: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(leads).orderBy(desc(leads.createdAt));
    }),
  }),

  // COMPENSA CORE Router
  compensa: router({
    calculate: avancadoProcedure
      .input(mixInputSchema)
      .mutation(async ({ ctx, input }) => {
        const packet = runPipeline(input);

        // Logar no DB
        const db = await getDb();
        if (db) {
          await db.insert(calculations).values({
            userId: ctx.user.id,
            feature: "compensa",
            input: input,
            output: packet,
          });
        }

        return packet;
      }),
  }),

  // NIVELIX Router
  nivelix: router({
    calculate: avancadoProcedure
      .input(mixInputSchema.extend({
        temFibra: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const { temFibra: _temFibra, ...mixData } = input;
        const packet = runPipeline(mixData);

        // Logar no DB
        const db = await getDb();
        if (db) {
          await db.insert(calculations).values({
            userId: ctx.user.id,
            feature: "nivelix",
            input: input,
            output: packet,
          });
        }

        return packet;
      }),
  }),

  // ECORISK Router
  ecorisk: router({
    analyze: avancadoProcedure
      .input(mixInputSchema)
      .mutation(async ({ ctx, input }) => {
        const packet = runPipeline(input);

        // Logar no DB
        const db = await getDb();
        if (db) {
          await db.insert(calculations).values({
            userId: ctx.user.id,
            feature: "ecorisk",
            input: input,
            output: packet,
          });
        }

        return packet;
      }),
  }),

  // Histórico de cálculos
  history: router({
    list: protectedProcedure
      .input(z.object({
        feature: z.enum(["compensa", "nivelix", "ecorisk"]).optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { items: [], nextCursor: undefined };

        const conditions = [
          eq(calculations.userId, ctx.user.id),
          isNull(calculations.deletedAt),
        ];

        if (input.feature) {
          conditions.push(eq(calculations.feature, input.feature));
        }

        if (input.cursor) {
          conditions.push(lt(calculations.id, input.cursor));
        }

        const items = await db.select().from(calculations)
          .where(and(...conditions))
          .orderBy(desc(calculations.id))
          .limit(input.limit + 1);

        let nextCursor: number | undefined;
        if (items.length > input.limit) {
          const extra = items.pop();
          nextCursor = extra?.id;
        }

        return { items, nextCursor };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        const result = await db.select().from(calculations)
          .where(and(
            eq(calculations.id, input.id),
            eq(calculations.userId, ctx.user.id),
            isNull(calculations.deletedAt),
          ))
          .limit(1);

        return result[0] ?? null;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.update(calculations)
          .set({ deletedAt: new Date() })
          .where(and(
            eq(calculations.id, input.id),
            eq(calculations.userId, ctx.user.id),
            isNull(calculations.deletedAt),
          ));

        if (result[0].affectedRows === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Calculo nao encontrado ou sem permissao",
          });
        }

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
