"use client";

/**
 * @file app/layout.tsx
 * @description Root layout com Provider tRPC + React Query.
 * IBM Plex Mono importada via Google Fonts para a UI de engenharia.
 */

import "./globals.css";
import { useState }                        from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getTrpcClient }             from "../lib/trpc";
import { Nav }                             from "../components/Nav";
import { ToastProvider }                   from "../components/Toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries:   { staleTime: 60_000, retry: 1 },
      mutations: { retry: 0 },
    },
  }));

  const [trpcClient] = useState(() => getTrpcClient());

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <title>CORE MIX PRO</title>
        <meta name="description" content="Sistema LIMS de Dosagem e Empacotamento de Concreto" />
      </head>
      <body className="bg-slate-950 text-slate-200 antialiased" suppressHydrationWarning>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <Nav />
              {children}
            </ToastProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </body>
    </html>
  );
}
