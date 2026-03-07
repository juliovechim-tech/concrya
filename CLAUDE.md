# CLAUDE.md — CONCRYA Technologies · Monorepo Unificado

## Quem Somos
**CONCRYA Technologies** — Engineering Intelligence for Concrete.
Plataforma modular de engenharia cimentícia preditiva.
Modelagem física · IoT Industrial · IA física-regularizada (PINNs) · SaaS B2B.

## Dono
**Julio Vechim** — Fundador e Engenheiro-chefe.
Empresas: CONCRYA Technologies · ABSTRATA · Mestres do Concreto · IDEARE.
Filosofia: **"Matéria, Dados, Propósito."** · **"Menos tese, mais repetibilidade."**

## Arquitetura em Camadas
```
AION ═══ CÉREBRO IA (PINNs · Drift · Agentes) ═══ Permeia TUDO
  ↕
C5 · DOMINIUM ──── ERP, BI, Plannix/Topcon, ESG Reporting
C4 · QUANTUM ───── Hydra4D, U-Net MEV/BSE, Digital Twin, DFT, C-S-H MD
C3 · NEXUS ─────── IoT Eletroterm, Maturidade, Calorimetria, Avrami/BNGM, Retração, Durabilidade
C2 · CORE MIX PRO  Motor avançado: SCC/UHPC, ESG CO₂, CPM, Fuller/Faury/Bolomey/MAA
C1 · CORE MIX ──── Base validada (TRL 7): Abrams, IDE, Correção Umidade, 43 Materiais

Soluções Verticais (produtos B2B):
  COMPENSA CORE │ NIVELIX CORE │ CRF │ FRP │ ARGAS │ PERM │ ARCH │ COLOR

Framework Transversal: ECORISK® (6 eco-indicadores + 7 domínios de risco → Score Dw)
```

## Estrutura do Monorepo
```
concrya/
├── apps/
│   ├── platform/          @concrya/platform    SaaS web (React 19 + tRPC + Drizzle + MySQL)
│   ├── core-mix-pro/      @concrya/core-mix-pro Motor de dosagem single-file (Densus Engine HTML)
│   └── landing/           (futuro)             Site público concrya.com.br
│
├── packages/
│   ├── engine/            @concrya/engine       Densus Engine — cálculos puros (Abrams, traço, empacotamento)
│   ├── aion/              @concrya/aion         IA: predição fc(t), drift, PINNs, ensemble ML
│   ├── ecorisk/           @concrya/ecorisk      ECORISK®: Derringer-Suich, 6 eco + 7 risco → Dw
│   ├── compensa/          @concrya/compensa     COMPENSA CORE: retração compensada (CRC)
│   ├── nivelix/           @concrya/nivelix      NIVELIX CORE: autonivelante RC + acústica
│   ├── schemas/           @concrya/schemas      Schemas Zod compartilhados (materiais, traços, ensaios)
│   ├── types/             @concrya/types        Types TypeScript compartilhados
│   └── ui/                @concrya/ui           Componentes UI compartilhados (shadcn customizado)
│
├── tools/
│   ├── core-engine/       Testes de validação do ecossistema inteiro
│   └── scripts/           Scripts de build, deploy, migração
│
├── docs/
│   ├── roadmap.html       Roadmap Unificado Definitivo v3
│   ├── pitch-deck.pdf     Pitch deck CONCRYA para investidores
│   ├── ecorisk.md         Documento completo ECORISK®
│   └── quantum.pdf        Aprofundamento Quântico em Concreto Avançado
│
├── .claude/
│   └── settings.json      Permissões dos agentes Claude Code
│
├── CLAUDE.md              ← ESTE ARQUIVO (maestro)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.base.json
```

## Comandos
```bash
pnpm install              # instalar tudo (todos os workspaces)
pnpm dev                  # rodar todos os apps em dev
pnpm platform:dev         # rodar só o SaaS
pnpm core-mix:dev         # rodar só o motor Densus Engine
pnpm test                 # rodar todos os testes
pnpm build                # build de produção
pnpm check                # TypeScript check em tudo
```

## Stack Principal (apps/platform)
- **Server:** Express + tRPC + Drizzle ORM + MySQL
- **Client:** React 19 + Vite 7 + Tailwind 4 + shadcn/ui
- **Auth:** OAuth + JWT (jose)
- **Pagamentos:** Hotmart webhooks
- **OS dev:** Windows (usar cross-env para NODE_ENV)
- **Package manager:** pnpm workspaces
- **Build system:** Turborepo

## Regras Invioláveis (para TODOS os agentes)

### Código
1. **NUNCA usar `any`** em TypeScript — tipar tudo
2. Código compartilhado **SEMPRE em packages/** — nunca duplicar entre apps
3. Apps consomem packages via `@concrya/xxx`
4. Endpoints update/delete **SEMPRE verificam userId**
5. Endpoints com plano pago usam `requirePlano("nivel")`
6. Schemas Zod ficam em `@concrya/schemas`
7. Todo cálculo de engenharia precisa de **teste unitário**

### Nomenclatura
8. Motor de dosagem: **Densus Engine** (nunca "DPCON")
9. Plataforma SaaS: **CONCRYA Platform** (nunca "mestres-dosagem-app")
10. Marca pública: **CONCRYA Technologies** (não mais "Mestres do Concreto" no produto)

### Git
11. Commits em **português**, descritivos, com prefixo convencional:
    - `feat:` nova funcionalidade
    - `fix:` correção de bug
    - `refactor:` refatoração sem mudança de comportamento
    - `test:` testes
    - `docs:` documentação
    - `chore:` manutenção, config
12. **NUNCA fazer git push** sem revisão do Julio
13. **NUNCA deletar branches** sem aprovação

### Cálculos de Engenharia
14. Soma de volumes absolutos **DEVE ser = 1000 dm³/m³ (±1)**
15. Unidades SI sempre: kg, m³, MPa, kg/dm³, µε, Pa·s
16. Normas brasileiras (ABNT/NBR) como referência primária
17. Fórmulas documentadas com referência bibliográfica

## Fundamentos Científicos
```
Abrams:              fc = k1 / (k2 ^ (a/c))
CEB-FIP:             fc(t) = fc28 · [t / (a + b·t)]
Teor argamassa:      α = (1 + a) / (1 + m)
Volume absoluto:     1000 = C/γc + a·C/γa + p·C/γp + (a/c)·C/γw + Var
Andreasen-Mulcahy:   CPFT = (d^q - dmin^q) / (dmax^q - dmin^q)
Avrami/BNGM:         α(t) = 1 − exp(−(kt)ⁿ) com nucleação de contorno
Arrhenius:           k = A · exp(−Ea/RT), Ea ≈ 31.2 kJ/mol
Bingham:             τ = τ₀ + μ·γ̇
Herschel-Bulkley:    τ = τ₀ + K·γ̇ⁿ
Fick (2ª Lei):       ∂C/∂t = ∇·(D∇C)
Tuutti:              x = A·√t (carbonatação)
Powers:              Modelo gel-espaço (porosidade → resistência)
DLVO:                V_total = V_EDL + V_vdW
CPM De Larrard:      Empacotamento compressível (parede + afastamento)
PINNs:               L = L_data + λ₁·L_PDE + λ₂·L_trend + λ₃·L_boundary
ECORISK Dw:          Desejabilidade Global Ponderada (Derringer-Suich, 1980)
```

## Clientes e Parcerias
- **Chimica Edile** — CRC, COMPENSA CORE + NIVELIX CORE (IT/US/BR/AR)
- **LIVELLARE** — Pisos autonivelantes, NIVELIX CORE
- **Sardinha Artefatos** — 175 produtos, QC + CORE MIX PRO
- **BETONART & MASKY** — Artefatos e revestimentos, pilotos IoT
- **ABESC** — Maturidade e calorimetria (parceria institucional)
- **FORTI POLYMER** — Calorimetria
- **Eletroterm** — Hardware IoT (BLE/Wi-Fi), CORE Automation Systems
- **PROLAB / Unisinos** — Validação científica, MEV, resistência

## Soluções Verticais (prioridade)
1. **COMPENSA CORE** [P1] — Concreto de retração compensada (Chimica Edile + LIVELLARE)
2. **NIVELIX CORE** [P1] — Argamassa autonivelante RC + acústica (Chimica Edile + LIVELLARE)
3. **CRF CORE** [P2] — Concreto reforçado com fibras poliméricas
4. **FRP CORE** [P2] — Concreto armado com telas + vergalhões GFRP
5. **ARGAS CORE** [P3] — Argamassas especiais
6. **PERM CORE** [P3] — Concreto permeável / drenante
7. **ARCH CORE** [P3] — Concreto arquitetônico aparente
8. **COLOR CORE** [P3] — Concreto colorido / pigmentado

## Roadmap (resumo)
- **Fase 0 (Agora → Jun/25):** Estabilizar, corrigir bugs, kit validação AION
- **Fase 1 (Jul–Dez/25):** Integração vertical, COMPENSA + NIVELIX MVP, API AION
- **Fase 2 (2026):** SaaS completo, IoT campo, ECORISK, mestrado validando modelos
- **Fase 3 (2026–27):** CRF + FRP, DOMINIUM (ERP/BI), escala comercial
- **Fase 4 (2028–30):** QUANTUM operacional, AION autônomo, marketplace, legado

## Para Agentes Claude Code
Ao iniciar em qualquer subpasta, leia TAMBÉM o CLAUDE.md local daquele projeto:
- `apps/platform/CLAUDE.md` — regras específicas do SaaS
- `apps/core-mix-pro/CLAUDE.md` — regras do Densus Engine
- `packages/aion/CLAUDE.md` — regras do AION
- `packages/compensa/CLAUDE.md` — regras do COMPENSA CORE
- `packages/nivelix/CLAUDE.md` — regras do NIVELIX CORE
- `tools/core-engine/CLAUDE.md` — regras de teste

O CLAUDE.md da raiz é o **maestro**. Os CLAUDE.md locais são **especialistas**.
Conflito? O maestro vence.
