"use client";

/**
 * @file lib/trpc.ts
 * @description Cliente tRPC com React Query para o frontend.
 * Importar `trpc` em qualquer componente para chamar as mutations.
 *
 * Uso:
 *   const mutation = trpc.dosagem.otimizarMistura.useMutation();
 *   mutation.mutate({ fontes: [...], classeConcreto: "UHPC", ... });
 */

import { createTRPCReact }       from "@trpc/react-query";
import { httpBatchStreamLink }   from "@trpc/client";
import type { AppRouter }        from "../server/root";

export const trpc = createTRPCReact<AppRouter>();

export function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL)        return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchStreamLink({
        url:     `${getBaseUrl()}/api/trpc`,
        headers: () => ({ "x-trpc-source": "react" }),
      }),
    ],
  });
}
