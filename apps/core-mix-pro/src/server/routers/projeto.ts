/**
 * @file server/routers/projeto.ts
 * @description CORE MIX PRO — Router tRPC para persistência de projetos e traços.
 *
 * CRUD de projetos, traços salvos e ensaios de laboratório.
 * Todas as rotas exigem autenticação (protectedProc).
 */

import { z } from "zod";
import { router, protectedProc } from "../trpc";

export const projetoRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // PROJETOS
  // ═══════════════════════════════════════════════════════════════════════════

  criarProjeto: protectedProc
    .input(z.object({
      nome:        z.string().min(1),
      responsavel: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.projeto.create({
        data: {
          nome:        input.nome,
          responsavel: input.responsavel,
          userId:      ctx.userId,
        },
      });
    }),

  listarProjetos: protectedProc
    .query(async ({ ctx }) => {
      return ctx.prisma.projeto.findMany({
        where: { userId: ctx.userId },
        orderBy: { criadoEm: "desc" },
        include: { _count: { select: { tracos: true, ensaios: true } } },
      });
    }),

  editarProjeto: protectedProc
    .input(z.object({
      id:          z.string().min(1),
      nome:        z.string().min(1),
      responsavel: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const projeto = await ctx.prisma.projeto.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!projeto) {
        throw new Error("Projeto não encontrado.");
      }
      return ctx.prisma.projeto.update({
        where: { id: input.id },
        data: {
          nome:        input.nome,
          responsavel: input.responsavel ?? null,
        },
      });
    }),

  deletarProjeto: protectedProc
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const projeto = await ctx.prisma.projeto.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!projeto) {
        throw new Error("Projeto não encontrado.");
      }
      // Cascade delete: traços e ensaios são removidos via onDelete: Cascade no schema
      return ctx.prisma.projeto.delete({
        where: { id: input.id },
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAÇOS SALVOS
  // ═══════════════════════════════════════════════════════════════════════════

  salvarTraco: protectedProc
    .input(z.object({
      descricao:  z.string().min(1),
      projetoId:  z.string().min(1),
      inputJson:  z.string(),
      outputJson: z.string(),
      fckMPa:     z.number(),
      acAdotado:  z.number(),
      custoM3:    z.number(),
      co2KgM3:    z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verificar que o projeto pertence ao usuário
      const projeto = await ctx.prisma.projeto.findFirst({
        where: { id: input.projetoId, userId: ctx.userId },
      });
      if (!projeto) {
        throw new Error("Projeto não encontrado.");
      }
      return ctx.prisma.tracoSalvo.create({
        data: {
          descricao:  input.descricao,
          projetoId:  input.projetoId,
          inputJson:  input.inputJson,
          outputJson: input.outputJson,
          fckMPa:     input.fckMPa,
          acAdotado:  input.acAdotado,
          custoM3:    input.custoM3,
          co2KgM3:    input.co2KgM3,
        },
      });
    }),

  listarTracos: protectedProc
    .input(z.object({ projetoId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      // Verificar que o projeto pertence ao usuário
      const projeto = await ctx.prisma.projeto.findFirst({
        where: { id: input.projetoId, userId: ctx.userId },
      });
      if (!projeto) return [];
      return ctx.prisma.tracoSalvo.findMany({
        where: { projetoId: input.projetoId },
        orderBy: { criadoEm: "desc" },
        select: {
          id:         true,
          descricao:  true,
          fckMPa:     true,
          acAdotado:  true,
          custoM3:    true,
          co2KgM3:    true,
          criadoEm:   true,
        },
      });
    }),

  buscarTraco: protectedProc
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      return input;
    }),

  deletarTraco: protectedProc
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      // Verificar ownership via join
      const traco = await ctx.prisma.tracoSalvo.findFirst({
        where: { id: input.id },
        include: { projeto: { select: { userId: true } } },
      });
      if (!traco || traco.projeto.userId !== ctx.userId) {
        throw new Error("Traço não encontrado.");
      }
      return ctx.prisma.tracoSalvo.delete({
        where: { id: input.id },
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ENSAIOS
  // ═══════════════════════════════════════════════════════════════════════════

  salvarEnsaio: protectedProc
    .input(z.object({
      projetoId:  z.string().min(1),
      tipo:       z.string().min(1),
      dataEnsaio: z.string(), // ISO 8601
      dadosJson:  z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const projeto = await ctx.prisma.projeto.findFirst({
        where: { id: input.projetoId, userId: ctx.userId },
      });
      if (!projeto) {
        throw new Error("Projeto não encontrado.");
      }
      return ctx.prisma.ensaioLab.create({
        data: {
          projetoId:  input.projetoId,
          tipo:       input.tipo,
          dataEnsaio: new Date(input.dataEnsaio),
          dadosJson:  input.dadosJson,
        },
      });
    }),

  listarEnsaios: protectedProc
    .input(z.object({ projetoId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const projeto = await ctx.prisma.projeto.findFirst({
        where: { id: input.projetoId, userId: ctx.userId },
      });
      if (!projeto) return [];
      return ctx.prisma.ensaioLab.findMany({
        where: { projetoId: input.projetoId },
        orderBy: { dataEnsaio: "desc" },
      });
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — métricas agregadas
  // ═══════════════════════════════════════════════════════════════════════════

  dashboardStats: protectedProc
    .query(async ({ ctx }) => {
      const projetos = await ctx.prisma.projeto.findMany({
        where: { userId: ctx.userId },
        include: {
          tracos: {
            select: {
              id: true,
              descricao: true,
              fckMPa: true,
              acAdotado: true,
              custoM3: true,
              co2KgM3: true,
              criadoEm: true,
            },
            orderBy: { criadoEm: "desc" },
          },
          _count: { select: { ensaios: true } },
        },
        orderBy: { criadoEm: "desc" },
      });

      const allTracos = projetos.flatMap((p) => p.tracos);
      const totalTracos = allTracos.length;
      const totalEnsaios = projetos.reduce((s, p) => s + p._count.ensaios, 0);

      const avg = (arr: number[]) =>
        arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

      return {
        totalProjetos: projetos.length,
        totalTracos,
        totalEnsaios,
        avgFckMPa: avg(allTracos.map((t) => t.fckMPa)),
        avgAc: avg(allTracos.map((t) => t.acAdotado)),
        avgCustoM3: avg(allTracos.map((t) => t.custoM3)),
        avgCo2KgM3: avg(allTracos.map((t) => t.co2KgM3)),
        projetosResumo: projetos.map((p) => ({
          id: p.id,
          nome: p.nome,
          responsavel: p.responsavel,
          totalTracos: p.tracos.length,
          totalEnsaios: p._count.ensaios,
          avgFck: avg(p.tracos.map((t) => t.fckMPa)),
          avgCusto: avg(p.tracos.map((t) => t.custoM3)),
          avgCo2: avg(p.tracos.map((t) => t.co2KgM3)),
        })),
        ultimosTracos: allTracos.slice(0, 10).map((t) => {
          const proj = projetos.find((p) => p.tracos.some((tr) => tr.id === t.id));
          return {
            ...t,
            projetoNome: proj?.nome ?? "—",
          };
        }),
      };
    }),
});

export type ProjetoRouter = typeof projetoRouter;
