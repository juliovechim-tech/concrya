"use server";

/**
 * @file app/api/trpc/[trpc]/route.ts
 * @description Handler HTTP do tRPC via Next.js App Router (fetch adapter).
 * Roteia todas as chamadas tRPC para o AppRouter.
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter }           from "../../../../server/root";
import { createContext }       from "../../../../server/trpc";
import type { NextRequest }    from "next/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint:      "/api/trpc",
    req,
    router:        appRouter,
    createContext: () => createContext(),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `[tRPC] Erro em /${path ?? "<sem-path>"}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
