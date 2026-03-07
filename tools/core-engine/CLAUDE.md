# CONCRYA AION™ — CORE MIX PRO
## Guia de Contexto Permanente para Claude Code

**Projeto:** CORE MIX PRO — plataforma SaaS de engenharia cimentícia preditiva  
**Empresa:** CONCRYA Technologies  
**Responsável:** Julio Vechim — Fundador & Especialista em Concretos Especiais  
**Contato:** www.concrya.com  
**Mestrado:** Unisinos + Universidade São Judas  
**Versão deste documento:** v2.0 — Março 2026

---

## Glossário de Nomes — Módulos ENGINE

> Consultar esta tabela quando houver dúvida sobre nome de módulo ou arquivo.

| Nome canônico   | Aliases históricos      | Arquivo ts             | Router tRPC              |
|----------------|-------------------------|------------------------|--------------------------|
| Hydra4D Engine | CaloriCore, HydraCore   | lib/hydra4d.ts         | routers/hydra4d.ts       |
| ThermoCore     | —                       | lib/thermocore.ts      | routers/thermocore.ts    |
| IceEngine      | —                       | lib/iceengine.ts       | routers/iceengine.ts     |
| RheoCore       | —                       | lib/rheocore.ts        | routers/rheocore.ts      |
| MicroEngine    | —                       | lib/microengine.ts     | routers/microengine.ts   |
| LifeEngine     | —                       | lib/lifeengine.ts      | routers/lifeengine.ts    |

---

## Stack Técnica

```
Next.js 15 App Router · tRPC v11 · Zod · Prisma + SQLite · Tailwind CSS
Recharts · react-hook-form · Zustand · @react-pdf/renderer
TypeScript estrito — zero `any`, zero dependências externas nos motores físicos
```

---

## Arquitetura Modular CONCRYA AION

O ecossistema é dividido em camadas progressivas (TRL crescente):

```
CONCRYA MIX      → Dosagem técnica e empacotamento granulométrico (TRL 7 — VALIDADO)
CONCRYA ENGINE   → Motores físico-matemáticos multiescala       (TRL 4-5 — EM BUILD)
CONCRYA QUANTUM  → Simulação microestrutural 4D + IA            (TRL 3-4 — PESQUISA)
CONCRYA NEXUS    → Integração industrial IoT + ERP              (TRL 3   — PLANNING)
```

### Paleta Oficial CONCRYA
```
Preto Profundo:    #0B0F14
Azul Técnico:      #1E88E5
Verde Hidratação:  #00E676
Dourado Inst.:     #C6A75E
Branco Gelo:       #EAEFF4
```

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── api/trpc/[trpc]/route.ts     ← Handler HTTP tRPC (App Router)
│   ├── dosagem/page.tsx             ← Otimizador de empacotamento
│   ├── projeto/                     ← Hub integrado (fluxo completo)
│   │   ├── page.tsx                 ← Hub com progresso circular
│   │   ├── empacotamento/page.tsx
│   │   ├── traco/page.tsx
│   │   ├── piloto/page.tsx
│   │   ├── comparar/page.tsx
│   │   └── relatorio/page.tsx
│   └── layout.tsx                   ← Provider tRPC + QueryClient
├── server/
│   ├── trpc.ts                      ← initTRPC + Context
│   ├── root.ts                      ← AppRouter raiz
│   └── routers/
│       ├── dosagem.ts               ← 4 endpoints: otimizar, traço, piloto, comparar
│       ├── projeto.ts               ← persistênciaRouter Prisma (5 sub-routers)
│       └── thermocore.ts            ← [NOVO] 4 endpoints motor de maturidade
├── lib/
│   ├── abrams.ts                    ← Lei de Abrams + CEB-FIP MC2010
│   ├── comparativo.ts               ← Ranking multicritério
│   ├── constants.ts                 ← Banco de materiais DPCON PRO
│   ├── dosagem.ts                   ← Método IPT-EPUSP
│   ├── empacotamento.ts             ← CPM de Larrard
│   ├── granulometria.ts             ← Andreasen · CPM · AIM · WLS
│   ├── laboratorio.ts               ← Dimensionamento CPs
│   ├── prisma.ts                    ← Singleton PrismaClient
│   ├── thermocore.ts                ← [NOVO] Motor maturidade Arrhenius
│   └── trpc.ts                      ← Cliente tRPC frontend
├── shared/
│   └── schemas.ts                   ← Schemas Zod compartilhados
├── types/
│   └── materiais.ts                 ← Tipos de domínio puros
├── store/
│   └── projeto.ts                   ← Zustand (5 slices de estado global)
└── components/
    ├── OtimizadorEmpacotamento.tsx
    ├── TracoTeorico.tsx
    ├── EscalonadorPiloto.tsx
    ├── ComparadorTracos.tsx
    ├── PainelPersistencia.tsx
    └── RelatorioTraco.tsx           ← PDF 4 páginas (@react-pdf/renderer)
```

---

## MÓDULOS CORE ENGINE — Status e Especificações

### STATUS GERAL

| Módulo       | Arquivo             | Status          | Prioridade |
|-------------|---------------------|-----------------|------------|
| ThermoCore  | lib/thermocore.ts   | ✅ COMPLETO     | P1 — done  |
| Hydra4D Engine  | lib/hydra4d.ts   | ✅ COMPLETO     | P1 — done  |
| IceEngine   | lib/iceengine.ts    | ✅ COMPLETO     | P2 — done  |
| RheoCore    | lib/rheocore.ts     | ✅ COMPLETO     | P3 — done  |
| MicroEngine | lib/microengine.ts  | ✅ COMPLETO     | P4 — done  |
| LifeEngine  | lib/lifeengine.ts   | ✅ COMPLETO     | P5 — done  |
| NEXUS v5.2  | server/nexus.ts     | 🔲 PENDENTE     | P6         |

---

### THERMOCORE — ✅ COMPLETO (lib/thermocore.ts)

Motor físico-matemático de maturidade, idade equivalente e resistência em função do tempo.

**Modelos implementados:**
- Nurse-Saul (1949): `M(t) = Σ (T_c − T_0) · Δt` [°C·h]
- Arrhenius / ASTM C1074-19: `t_e = Σ Δt · exp[Ea/R · (1/T_r − 1/T_c)]` [h]
- Freiesleben Hansen & Pedersen (1977): `α(t_e) = α_max · exp[-(τ/t_e)^β]`
- Su et al. (2001): `S(t_e) = Su · exp[-(τ/t_e)^β]` [MPa]
- CEB-FIP MC90 / fib MC2010: `β_cc(t) = exp(s · (1 − √(28/t)))` — fallback
- Powers (1949) + Bentz (1997): `α_max = f(a/c)` — UHPC a/c < 0.28
- Critério de desforma ACI 207.1R + NBR 6118:2023 (4 critérios simultâneos)
- Calibração OLS Su/τ/β com linearização ln-ln (ASTM C1074 §7.2.4)

**Funções exportadas:**
```typescript
calcularAlphaMax(relacaoAC)
calcularDeltaTeArrhenius(deltaT_h, temperaturaMed_C, Ea_J_mol)
calcularDeltaMaturidade(deltaT_h, temperaturaMed_C, T0_C?)
calcularAlphaFHP(te_h, tau_h, beta, alphaMax)
predizFckTeCalibrado(te_h, cal)
predizFckCebFip(idade_h, fck28_MPa, s)
calibrarSuTauBeta(pontos[])
calcularTeDesforma(fckAlvo_MPa, cal)
executarThermoCore(entrada)       // motor principal — integração completa
gerarCurvaMaturidade(cal, fck28, s, teMax_h?, nPontos?)
```

**Constantes exportadas:**
```typescript
R_GAS = 8.314           // J/(mol·K)
T_REF_K = 293.15        // 20°C em Kelvin
T_DATUM_CELSIUS = -10   // Nurse-Saul datum
EA_J_MOL                // Record<TipoCimento, number>
CALIBRACAO_DEFAULT      // Record<TipoCimento, ParamsCalibracao>
S_CEB_FIP               // Record<string, CoeficienteCebFip>
```

**Energias de ativação por cimento:**
```
CP_V_ARI: 40000 J/mol  |  CP_II_F: 37000  |  CP_II_E: 35000
CP_III:   30000 J/mol  |  CP_IV:   35500  |  LC3:     38000
```

**Critério de desforma (4 condições simultâneas):**
```
fck_pred ≥ 0.70 × fck_proj28d         (resistência mínima)
ΔT núcleo/superfície ≤ 20°C          (ACI 207.1R-05)
T_núcleo ≤ 70°C                       (NBR 6118:2023)
t_e ≥ t_e_min_obra                    (restrição de obra — opcional)
```

**Router tRPC** (`server/routers/thermocore.ts`):
```typescript
thermocore.calcular         // mutation — integração completa a partir de payload MQTT
thermocore.salvarLeitura    // mutation — persiste leitura Eletroterm no banco
thermocore.calibrar         // mutation — calibra Su/τ/β com CPs de ruptura
thermocore.historico        // query   — série temporal de um device
thermocore.statusDesforma   // query   — decisão ao vivo para o operador
```

**Adicionar ao root.ts:**
```typescript
import { thermoCoreRouter } from "./routers/thermocore";
// thermocore: thermoCoreRouter,
```

---

### HYDRA4D ENGINE — 🔲 PENDENTE (lib/hydra4d.ts)

**Papel:** Coração científico do AION. Processa ensaios de calorimetria semi-adiabática
(pasta de cimento, termopar tipo K, a/c = 0.38–0.42) e extrai os parâmetros que
alimentam todos os outros motores.

**Banco de dados Hydra4D Engine DB v1.0** já documentado em:
`Hydra4D-Engine-DB_v1.0.docx` — 9 seções, 6 cimentos, 4 SCMs, 3 aditivos, 15 referências.

**Fluxo de dados Hydra4D Engine → outros módulos:**
```
Q∞, Q_ef [kJ/kg]         → IceEngine    (calor total para dissipação térmica)
Ea [J/mol]               → ThermoCore   (energia de ativação do lote real)
τ, β                     → ThermoCore   (calibração curva α(t_e))
t_indução, t_início_pega → IceEngine + NEXUS (janela de trabalhabilidade)
Δt_retardo (aditivo)     → IceEngine + ThermoCore (shift temporal τ)
Efeito SCM em Q∞         → IceEngine + MicroEngine
```

**5 Fases identificadas:**
```
Fase I   — Dissolução Inicial:  0–15 min (CP V-ARI) / 0–30 min (CP III)
Fase II  — Indução/Latência:    platô térmico — janela de trabalhabilidade
Fase III — Aceleração:          t_início_pega → T_pico (domínio C₃S, C-S-H)
Fase IV  — Desaceleração:       t_fim_pega, início C₂S tardio
Fase V   — Difusão:             calor residual SCMs, α_∞ para MicroEngine
```

**Banco de cimentos calibrados (defaults Hydra4D Engine DB v1.0):**

| ID     | Cimento              | Q_ef [kJ/kg] | Ea [J/mol] | τ [h] | β    | T_pico pasta | Fonte       |
|--------|---------------------|-------------|-----------|-------|------|-------------|-------------|
| CIM-01 | CP V-ARI MAX CNC    | 380         | 40000     | 8.5   | 1.08 | 97.2°C      | ENSAIO REAL |
| CIM-02 | CP V-ARI PLUS Holcim| 360         | 40000     | 9.0   | 1.06 | 83.4°C      | ENSAIO REAL |
| CIM-03 | CP V-ARI CAUE       | 370         | 40000     | 8.8   | 1.07 | 93.7°C      | ENSAIO REAL |
| CIM-04 | CP II-E-40 CNC      | 310         | 35000     | 12.5  | 0.94 | 70.2°C      | ENSAIO REAL |
| CIM-05 | CP IV-32 RS         | 270         | 35500     | 13.0  | 0.92 | 62.0°C      | Literatura  |
| CIM-06 | CP III-40 RS        | 250         | 30000     | 16.0  | 0.88 | 55.0°C      | Literatura  |

**Banco de aditivos (efeito de retardo medido):**

| Produto         | Dosagem | Cimento ref.      | Δt retardo | % retardo | Fonte        |
|----------------|---------|------------------|-----------|----------|--------------|
| Powerflow 1180 | 1.0%    | CP V-ARI MAX CNC  | +276 min  | +230%    | ASSTEC-018   |
| Techniflow 560 | 0.6%    | CP V-ARI PLUS     | +159 min  | +102%    | MC-Bauchemie |
| Techniflow 560 | 0.6%    | CP V-ARI CAUE     | +156 min  | +153%    | MC-Bauchemie |

---

### ICEENGINE — 🔲 PENDENTE (lib/iceengine.ts)

**Papel:** Concreto massa → conformidade ACI 207.1R-05 → decisão de campo.

**Modelos a implementar:**
```
Fourier 1D:      ∂T/∂t = α · ∂²T/∂x² + Q(t)/(ρ · cp)
Geração de calor: Q(t) = Q∞ · (1 − exp[−(t_e/τ)^β])  [kJ/m³]
Balanço de gelo:  Q_gelo = m_gelo × L   (L = 334 kJ/kg)
Balanço LN2:      Q_N2   = m_N2 × (L_N2 + cp_N2 × ΔT)
Critério ACI 207: ΔT_nucleo_superficie ≤ 20°C
Critério NBR:     T_nucleo ≤ 70°C
```

**Caso de validação real disponível:**
```
CP II-E-40 CNC, 350 kg/m³, e = 1.5m, T_lanc = 25°C, T_amb = 25°C
Q_ef = 310 kJ/kg (medido — Mestres do Concreto 03.02.2026)
Resultado: T_max = 70.2°C, ΔT = 20.3°C → NÃO CONFORME (por 0.2°C e 0.3°C)
```

---

### RHEOCORE — ✅ COMPLETO (lib/rheocore.ts)

Reometria rotacional via ADS1115 amperagem → torque → τ₀ + μ_p Bingham.
Modelos: Bingham (1922), Herschel-Bulkley (1926). Correlações: Slump (Roussel 2006), Flow (Roussel & Coussot 2005), T500 (Wallevik 2006), Marsh (de Larrard 1998).
Classificação: FLUIDO / UHPC / CAA_1–3 / CCV. Análise de perda de trabalhabilidade com regressão linear τ(t).

---

### MICROENGINE — ✅ COMPLETO (lib/microengine.ts)

Microestrutura e durabilidade. Powers (1946/1958) gel-space ratio, ITZ (Scrivener 2004), difusão cloretos Fick 2ª Lei (Crank 1975, Xi 1999), carbonatação (Tuutti 1982).
Estimativa fc via X^n, porosidade capilar, envelhecimento D(t), perfil C(x), vida útil por cloretos e carbonatação.

---

### LIFEENGINE — 🔲 PENDENTE (lib/lifeengine.ts)

Vida útil. Tuutti (1982), Monte Carlo, VPL 50 anos.

---

## Padrão dos Motores Físico-Matemáticos (lib/*.ts)

Todo motor ENGINE segue **exatamente** este padrão (baseado em thermocore.ts):

1. **Zero dependências externas** — funções puras TypeScript
2. **JSDoc PhD-level** — referências bibliográficas ABNT, equações nos comentários
3. **Interfaces explícitas** exportadas: `Entrada*`, `Resultado*`, `Params*`
4. **Helpers internos** prefixados com `_` — `_validar()`, `_ar()`
5. **Validação** com `_validar(cond, msg)` — lança `[NomeMotor] mensagem`
6. **Constantes físicas** exportadas com unidade no nome (`R_GAS`, `T_REF_K`)
7. **Defaults calibrados** — `CALIBRACAO_DEFAULT` por tipo de cimento
8. **Testes** — `__tests__/nomemodulo.test.ts` cobertura 100%

---

## Convenções Críticas — Nunca Alterar

```typescript
abrams.fcjMPa                          // NÃO: fckMPa
abrams.relacaoAc.acAdotado             // NÃO: abrams.acRelacao
abrams.resistenciasPorIdade.fc28dMPa   // sufixo MPa em todas as idades
cobrimentoMinMm                        // NÃO: cobrimentoMin
// PontoCalibracaoAbrams — SEM campo 'referencia'
{ id: "P1", relacaoAc: 0.40, fc28dMPa: 52 }
// Imports críticos — NUNCA cruzar
import { DADOS_GRANULO_DPCON_DEFAULT } from "../lib/granulometria";
import { PERFIS_LASER_CIMENTICIO }     from "../lib/constants";
```

---

## Bugs Corrigidos — Histórico

- `comparativo.ts`: `arL` → fechamento volumétrico
- `comparativo.ts`: `fckMPa` → `fcjMPa`
- `comparativo.ts`: `acRelacao` → `relacaoAc.acAdotado`
- `abrams.ts`: campo `referencia` removido de PontoCalibracaoAbrams
- `routers/dosagem.ts`: `DADOS_GRANULO` importado de `granulometria.ts`
- `routers/dosagem.ts`: `cobrimentoMin` → `cobrimentoMinMm`

---

## Roadmap Imediato

1. ~~**Hydra4D Engine**~~ ✅ — motor TypeScript: parser de ensaio + extração 5 fases + Ea/τ/β + banco DB
2. ~~**IceEngine**~~ ✅ — Fourier 1D + Q_ef do Hydra4D Engine + balanço de gelo/LN2
3. ~~**UI ThermoCore**~~ ✅ — painel monitoramento ao vivo (temperatura + fck(t) + decisão desforma)
4. ~~**Integração NEXUS**~~ ✅ — proxy API + webhook + Live Mode + Prisma MonitoramentoTC/LeituraTC
5. ~~**RheoCore**~~ ✅ — ADS1115 → torque → τ₀ + μ_p Bingham + correlações + classificação

---

## Referências Científicas dos Motores

```
ASTM C1074-19 | ACI 207.1R-05 | fib MC2010 | NBR 6118:2023
Freiesleben Hansen & Pedersen (1977) | Su et al. (2001) | Powers (1948/1949)
Bentz (1997) | Schindler & Folliard (2005) | Mehta & Monteiro (2014) | Neville (2016)
CNC ASSTEC-018 (2017) | MC-Bauchemie ECOVERDE (s.d.) | Vechim (2026) ACI 207
```
