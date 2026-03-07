/**
 * @file server/root.ts
 * @description CORE MIX PRO — AppRouter raiz (ponto de montagem de todos os sub-roteadores)
 *
 * Adicione novos roteadores aqui conforme o sistema cresce:
 *   laboratorioRouter  → registros de pilotos, histórico de ensaios
 *   relatorioRouter    → geração de PDF, export Excel
 *   projetoRouter      → CRUD de projetos e traços salvos
 */

import { router }          from "./trpc";
import { dosagemRouter }   from "./routers/dosagem";
import { projetoRouter }   from "./routers/projeto";
import { hydra4dRouter }   from "./routers/hydra4d";
import { iceEngineRouter } from "./routers/iceengine";
import { thermoCoreRouter } from "./routers/thermocore";
import { rheoCoreRouter }    from "./routers/rheocore";
import { microEngineRouter } from "./routers/microengine";
import { lifeEngineRouter } from "./routers/lifeengine";

export const appRouter = router({
  dosagem:     dosagemRouter,
  projeto:     projetoRouter,
  hydra4d:     hydra4dRouter,
  iceEngine:   iceEngineRouter,
  thermocore:  thermoCoreRouter,
  rheocore:    rheoCoreRouter,
  microengine: microEngineRouter,
  lifeengine:  lifeEngineRouter,
});

/** Tipo do AppRouter — exportar para o cliente tRPC no frontend */
export type AppRouter = typeof appRouter;
