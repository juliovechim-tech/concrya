# CORE MIX PRO

Sistema LIMS de engenharia de concreto — Motor de Empacotamento Granulométrico.

## Stack

- **Next.js 15** App Router
- **tRPC v11** com React Query
- **Zod** para validação end-to-end
- **Tailwind CSS** dark theme
- **Recharts** para gráfico granulométrico (escala log)
- **react-hook-form** com resolvers Zod

## Setup

```bash
pnpm install
pnpm dev
```

Acesse: http://localhost:3000

## Módulo disponível

- `/dosagem` — Motor de Empacotamento (Andreasen · Fuller · CPM · AIM · WLS)

## Motores matemáticos (src/lib/)

| Arquivo | Função |
|---|---|
| `granulometria.ts` | Curvas granulométricas · laser · Andreasen |
| `empacotamento.ts` | Grid Search + Monte Carlo + CPM + WLS |
| `abrams.ts` | Lei de Abrams + CEB-FIP MC2010 |
| `dosagem.ts` | Método IPT-EPUSP (volumes absolutos) |
| `laboratorio.ts` | Dimensionamento de CPs + betoneira |
| `comparativo.ts` | Ranking multicritério de traços |
| `constants.ts` | Banco de materiais DPCON PRO |

## Arquitetura tRPC

```
src/server/routers/dosagem.ts
  ├── otimizarMistura      → empacotamento.ts
  ├── calcularTracoTeorico → abrams.ts + dosagem.ts
  ├── escalonarPiloto      → laboratorio.ts
  └── compararTracos       → comparativo.ts
```

## Claude no VS Code

O arquivo `.claude/CLAUDE.md` contém contexto completo do projeto
para o Claude entender a arquitetura, convenções de nomes de campos,
bugs já corrigidos e próximas features planejadas.
