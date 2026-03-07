# src/server — Routers tRPC CONCRYA AION

## Routers disponíveis

| Arquivo               | Router              | Status     | Endpoints                                         |
|----------------------|---------------------|-----------|---------------------------------------------------|
| routers/dosagem.ts   | dosagemRouter       | ✅ COMPLETO | otimizarMistura · calcularTracoTeorico · escalonarPiloto · compararTracos |
| routers/projeto.ts   | persistenciaRouter  | ✅ COMPLETO | obra · projeto · traco · piloto · ensaio (5×CRUD) |
| routers/thermocore.ts| thermoCoreRouter    | ✅ COMPLETO | calcular · salvarLeitura · calibrar · historico · statusDesforma |

## Como adicionar ao root.ts

```typescript
import { dosagemRouter }     from "./routers/dosagem";
import { persistenciaRouter } from "./routers/projeto";
import { thermoCoreRouter }   from "./routers/thermocore";

export const appRouter = router({
  dosagem:      dosagemRouter,
  persistencia: persistenciaRouter,
  thermocore:   thermoCoreRouter,
});
```

## Padrão de router ENGINE

Cada motor físico tem seu próprio router com este padrão:
- `calcular` — mutation: recebe payload completo, retorna resultado do motor
- `salvarLeitura` — mutation: persiste dado IoT via Prisma (graceful degradation se tabela não existe)
- `calibrar` — mutation: calibra parâmetros com dados laboratoriais
- `historico` — query: série temporal filtrada por device/canal/período
- `status*` — query: decisão ao vivo para o operador (ex: statusDesforma)

## Graceful degradation no IoT

Todos os endpoints que acessam tabelas IoT (LeituraSensor) usem `.catch(() => null)`:
```typescript
const leitura = await ctx.db?.leituraSensor?.create({ ... }).catch(() => null);
return { salvo: !!leitura, ... };
```
Permite rodar sem migração Prisma completa — as tabelas IoT são opcionais até NEXUS v5.2.
