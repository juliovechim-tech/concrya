/**
 * @file app/api/nexus/route.ts
 * @description Proxy API para o servidor NEXUS (Flask + MQTT)
 *
 * Endpoints:
 *   GET  /api/nexus          → Retorna dados do NEXUS (maturidade, calorimetria, reologia)
 *   POST /api/nexus          → Recebe webhook do NEXUS (push de novas leituras)
 *
 * O servidor NEXUS roda em localhost:5000 e coleta dados MQTT do Eletroterm ESP32.
 * Este proxy permite ao frontend Next.js consumir esses dados sem CORS issues.
 */

import { NextRequest, NextResponse } from "next/server";

const NEXUS_URL = process.env.NEXUS_URL ?? "http://localhost:5000";

/**
 * GET /api/nexus — Proxy para /api/dados do NEXUS
 * Retorna { maturidade[], calorimetria[], reologia[], _gravando, _mqtt_conectado, _sample_rate }
 */
export async function GET() {
  try {
    const res = await fetch(`${NEXUS_URL}/api/dados`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "NEXUS server responded with error", status: res.status },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "NEXUS server unreachable",
        detail: err.message ?? "Connection refused",
        nexusUrl: NEXUS_URL,
      },
      { status: 503 },
    );
  }
}

/**
 * POST /api/nexus — Webhook receiver (NEXUS pushes new readings here)
 * Payload esperado:
 * {
 *   tipo: "maturidade" | "calorimetria",
 *   timestamp: string,
 *   tempo_h: number,
 *   ch1: number, ch2: number, ch3: number, ch4: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validação mínima
    if (!body.tipo || body.tempo_h == null) {
      return NextResponse.json(
        { error: "Payload inválido — requer 'tipo' e 'tempo_h'" },
        { status: 400 },
      );
    }

    // Por enquanto, apenas loga e retorna OK.
    // A persistência real é feita via tRPC thermocore.salvarLeitura.
    console.info(
      `[NEXUS webhook] ${body.tipo} t=${body.tempo_h}h ch1=${body.ch1}°C`,
    );

    return NextResponse.json({ status: "received", tempo_h: body.tempo_h });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }
}
