/**
 * @file api/registro/route.ts
 * @description Endpoint de criação de usuário (registro).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../server/db";
import bcrypt from "bcryptjs";

const registroSchema = z.object({
  nome:        z.string().min(1),
  email:       z.string().email(),
  senha:       z.string().min(6),
  laboratorio: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registroSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos: " + parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { nome, email, senha, laboratorio } = parsed.data;

    // Verificar se email já existe
    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
      return NextResponse.json(
        { error: "Email ja cadastrado." },
        { status: 409 }
      );
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 12);

    // Criar usuário
    const user = await prisma.user.create({
      data: { nome, email, senhaHash, laboratorio },
    });

    // Criar projeto padrão para o usuário
    await prisma.projeto.create({
      data: {
        nome: "Projeto Padrao",
        responsavel: nome,
        userId: user.id,
      },
    });

    return NextResponse.json({ id: user.id, nome: user.nome, email: user.email });
  } catch (err) {
    console.error("[registro] Erro:", err);
    return NextResponse.json(
      { error: "Erro interno ao criar conta." },
      { status: 500 }
    );
  }
}
