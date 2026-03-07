# CORE MIX PRO — Guia de Contexto para o Claude

## O que é este projeto

Sistema LIMS (Laboratory Information Management System) de engenharia de concreto.
Calcula dosagem, otimiza empacotamento granulométrico e gere ensaios laboratoriais.

**Stack:** Next.js 15 App Router · tRPC v11 · Zod · Tailwind CSS · Recharts · react-hook-form · Prisma (SQLite) · NextAuth v5

---

## Estrutura de pastas

```
src/
├── app/
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts        ← Handler HTTP do tRPC
│   │   ├── auth/[...nextauth]/route.ts  ← NextAuth route handler
│   │   └── registro/route.ts            ← Endpoint de criação de conta
│   ├── dosagem/page.tsx        ← Módulo 01: Otimizador de empacotamento
│   ├── traco/page.tsx          ← Módulo 02: Traço teórico (Abrams + IPT-EPUSP)
│   ├── piloto/page.tsx         ← Módulo 03: Escalonamento piloto (pesagem)
│   ├── comparar/page.tsx       ← Módulo 04: Comparação multicritério
│   ├── projetos/page.tsx       ← Gestão de projetos (CRUD)
│   ├── tracos/page.tsx         ← Histórico de traços salvos
│   ├── login/page.tsx          ← Página de login
│   ├── registro/page.tsx       ← Página de cadastro
│   ├── layout.tsx              ← Provider tRPC + QueryClient + Nav
│   ├── page.tsx                ← Home (navegação entre módulos)
│   └── globals.css             ← Estilos globais + @media print
├── server/
│   ├── trpc.ts                 ← initTRPC + Context (prisma, userId) + protectedProc
│   ├── db.ts                   ← Singleton PrismaClient
│   ├── root.ts                 ← AppRouter (dosagem + projeto)
│   └── routers/
│       ├── dosagem.ts          ← 4 endpoints de cálculo
│       └── projeto.ts          ← CRUD projetos + traços + ensaios
├── lib/
│   ├── trpc.ts                 ← Cliente tRPC para o frontend
│   ├── granulometria.ts        ← Andreasen · CPM · AIM · WLS
│   ├── empacotamento.ts        ← Grid Search + Monte Carlo
│   ├── abrams.ts               ← Lei de Abrams + CEB-FIP MC2010
│   ├── dosagem.ts              ← Método IPT-EPUSP (volumes absolutos)
│   ├── laboratorio.ts          ← Dimensionamento CPs + pesagem betoneira
│   ├── comparativo.ts          ← Ranking multicritério de traços
│   ├── relatorio-pdf.ts        ← Geração de relatórios PDF (jsPDF + autotable)
│   └── constants.ts            ← Banco de materiais Densus Engine
├── shared/
│   └── schemas.ts              ← Schemas Zod (DadosProjeto, Materiais, Parâmetros)
├── types/
│   └── materiais.ts            ← Tipos de domínio puros (sem Zod)
├── components/
│   ├── OtimizadorEmpacotamento.tsx  ← UI Módulo 01
│   ├── DosagemTracoTeorico.tsx      ← UI Módulo 02
│   ├── PlanilhaPiloto.tsx           ← UI Módulo 03
│   ├── ComparativoTracos.tsx         ← UI Módulo 04
│   ├── Dashboard.tsx                ← Dashboard métricas agregadas
│   ├── GestaoProjetos.tsx           ← CRUD de projetos
│   ├── Toast.tsx                     ← Sistema de notificações (ToastProvider + useToast)
│   └── Nav.tsx                      ← Barra de navegação compartilhada (responsiva)
├── auth.ts                     ← Config NextAuth v5 (Credentials + JWT)
├── middleware.ts               ← Proteção de rotas (redireciona p/ /login)
prisma/
└── schema.prisma               ← User, Projeto, TracoSalvo, EnsaioLab
.env                            ← DATABASE_URL + NEXTAUTH_SECRET
```

---

## Status dos módulos

| Módulo | Rota | Status | Componente |
|--------|------|--------|------------|
| 01 Empacotamento | `/dosagem` | ONLINE | OtimizadorEmpacotamento.tsx |
| 02 Traço Teórico | `/traco` | ONLINE | DosagemTracoTeorico.tsx |
| 03 Escalonamento | `/piloto` | ONLINE | PlanilhaPiloto.tsx |
| 04 Comparação | `/comparar` | ONLINE | ComparativoTracos.tsx |
| Histórico | `/tracos` | ONLINE | tracos/page.tsx |
| Projetos | `/projetos` | ONLINE | GestaoProjetos.tsx |
| Dashboard | `/dashboard` | ONLINE | Dashboard.tsx |
| Auth | `/login` `/registro` | ONLINE | NextAuth v5 |

---

## Setup do projeto

```bash
# 1. Criar projeto T3 App Router
pnpm create t3-app@latest core-mix-pro \
  --nextAuth false --prisma false --tailwind true --trpc true --appRouter true

# 2. Dependências
pnpm add react-hook-form @hookform/resolvers recharts
pnpm add @prisma/client next-auth@beta bcryptjs
pnpm add -D @types/node prisma @types/bcryptjs

# 3. Copiar src/ + prisma/ + .env

# 4. Prisma setup
npx prisma generate
npx prisma db push

# 5. Rodar
pnpm dev
```

---

## Router tRPC — endpoints

### dosagem router (server/routers/dosagem.ts)

Todos são **mutations** (cálculo intensivo).

1. **`otimizarMistura`** — Otimização granulométrica (Andreasen/CPM/AIM/WLS)
2. **`calcularTracoTeorico`** — Traço 1m³ via Abrams + IPT-EPUSP
3. **`escalonarPiloto`** — Planilha de pesagem em gramas + dimensionamento CPs
4. **`compararTracos`** — Ranking multicritério (custo/CO₂/eficiência)

### projeto router (server/routers/projeto.ts)

CRUD de persistência (queries e mutations):

- `criarProjeto` / `listarProjetos` / `editarProjeto` / `deletarProjeto`
- `salvarTraco` / `listarTracos` / `buscarTraco` / `deletarTraco`
- `salvarEnsaio` / `listarEnsaios`

---

## Prisma Schema (SQLite)

```prisma
model User        { id, nome, email (unique), senhaHash, laboratorio?, projetos[] }
model Projeto     { id, nome, responsavel?, userId → User, tracos[], ensaios[] }
model TracoSalvo  { id, descricao, projetoId → Projeto, inputJson, outputJson, fckMPa, acAdotado, custoM3, co2KgM3 }
model EnsaioLab   { id, projetoId → Projeto, tipo, dataEnsaio, dadosJson }
```

---

## Autenticação NextAuth v5

- **Provider:** Credentials (email + senha)
- **Estratégia:** JWT-only (sem tabelas Account/Session)
- **Senha:** bcryptjs com salt 12
- **Middleware:** `src/middleware.ts` protege todas as rotas exceto /login, /registro, /api/auth
- **Context tRPC:** `userId: string | null` no Context, `protectedProc` disponível

---

## Convenções críticas — campos de domínio

NUNCA alterar estes nomes (validados na compilação TypeScript):

```typescript
abrams.fcjMPa                          // NÃO: fckMPa
abrams.relacaoAc.acAdotado             // NÃO: abrams.acRelacao
abrams.paramsRegressao.A               // NÃO: constanteA
abrams.resistenciasPorIdade.fc28dMPa   // sufixo MPa em todas as idades
cobrimentoMinMm                        // NÃO: cobrimentoMin
{ id: "P1", relacaoAc: 0.40, fc28dMPa: 52 }  // PontoCalibracaoAbrams SEM 'referencia'

// Imports críticos
import { DADOS_GRANULO_DENSUS_DEFAULT } from "../lib/granulometria";  // NÃO de constants
import { PERFIS_LASER_CIMENTICIO }     from "../lib/constants";
```

---

## Design System

- **Tema:** Dark-first "Precision Industrial Control Room"
- **Font:** IBM Plex Mono (Google Fonts)
- **Paleta:** Amber #D97706 (accent), Emerald #059669 (success), Sky #0284C7 (info), Rose #DC2626 (error)
- **Background:** slate-950 (#020617) body, slate-900 containers
- **Componentes UI:** Label, Input, Select, Toggle, KpiCard, Ruler, Tabs — definidos inline em cada componente
- **Gráficos:** Recharts (LineChart, BarChart, ResponsiveContainer)
- **Formulários:** react-hook-form + zodResolver

---

## Cross-page data flow

- `/traco` salva `composicaoM3` no `sessionStorage` (key: `coreMixPro:composicaoM3`)
- `/piloto` oferece botão "Importar do Traço Calculado" que lê o sessionStorage
- Quando Prisma está ativo, traços também podem ser carregados do banco

---

## Banco de materiais (constants.ts)

```
Cimentos:  CIM-1 (CP IV-32) | CIM-2 (CP V-ARI) | CIM-3 (CP II-F) | CIM-4 (CP III-40)
Areias:    M1 (Areia Natural Média) | M2 (Areia Manufaturada 0-4)
Britas:    G1 (Brita 0 Pedrisco) | G2 (Brita 1) | G3 (Brita 2)
Aditivos:  AD-1..AD-5 (SP de diferentes fabricantes)
SCM:       SCM-1 (Microsílica) | SCM-2 (Cinza Volante) | SCM-3 (Metacaulim) | SCM-4 (Escória)
```

---

## Bugs corrigidos

- `comparativo.ts`: `arL` → fechamento volumétrico
- `comparativo.ts`: `fckMPa` → `fcjMPa` em ResultadoAbrams
- `comparativo.ts`: `acRelacao` → `relacaoAc.acAdotado`
- `abrams.ts`: campo `referencia` removido de PontoCalibracaoAbrams
- `routers/dosagem.ts`: DADOS_GRANULO importado de granulometria.ts
- `routers/dosagem.ts`: `cobrimentoMin` → `cobrimentoMinMm`

---

## Próximas features

1. ~~Dashboard com métricas agregadas por projeto~~ ✓
2. ~~Export de dados para Excel/CSV~~ ✓
