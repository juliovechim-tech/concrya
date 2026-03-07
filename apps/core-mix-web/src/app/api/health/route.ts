import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [
      company,
      machine,
      operator,
      material,
      product,
      mixDesign,
      lot,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.machine.count(),
      prisma.operator.count(),
      prisma.material.count(),
      prisma.product.count(),
      prisma.mixDesign.count(),
      prisma.lot.count(),
    ]);

    return Response.json({
      ok: true,
      counts: {
        company,
        machine,
        operator,
        material,
        product,
        mixDesign,
        lot,
      },
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
