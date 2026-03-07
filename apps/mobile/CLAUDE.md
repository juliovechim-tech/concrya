# CONCRYA DENSUS ENGINE — CLAUDE CODE MASTER PLAN
## `CORE MIX PRO` → `DENSUS ENGINE v1.1` · Março 2026

> **Instrução para o Claude Code:**
> 1. Leia este arquivo **inteiro** antes de executar qualquer tarefa.
> 2. Execute as fases em **ordem estrita**. Nunca avance sem `tsc --noEmit` e `next build` limpos.
> 3. Faça **commit** ao final de cada fase com a tag indicada.
> 4. Se encontrar conflito com qualquer instrução abaixo, **pergunte antes de agir**.

---

## 📐 CONTEXTO DO PROJETO

### Identidade
- **Produto:** CONCRYA DENSUS Engine — software profissional de dosagem de concretos especiais
- **Responsável:** Julio Vechim — Fundador & Especialista em Concretos Especiais · CONCRYA Technologies
- **Site:** www.concrya.com

### Stack atual
```
Next.js 14 (App Router) · TypeScript · tRPC v11 · Zustand · Prisma + SQLite
Tailwind CSS · Recharts · @react-pdf/renderer · react-hook-form + Zod
```

### Localização no VS Code
```
/core-mix-pro-claude/
  src/
    app/                    ← rotas Next.js (App Router)
    components/             ← 6 componentes React (UI de módulos)
    lib/                    ← 8 engines de cálculo TypeScript PUROS
    server/routers/         ← roteadores tRPC (dosagem.ts, projeto.ts)
    shared/schemas.ts       ← schemas Zod compartilhados (396 linhas)
    store/projeto.ts        ← estado global Zustand (183 linhas)
    types/materiais.ts      ← tipos TypeScript de materiais
  prisma/
    schema.prisma           ← 151 linhas, 5 models existentes
    seed.ts                 ← A CRIAR na Fase 1
```

---

## 🔒 ENGINES EXISTENTES — NUNCA REESCREVER

> Estes 8 arquivos estão em produção. Apenas **adicione funções ao final**. Nunca delete ou altere funções existentes.

| Arquivo | Engine | Descrição técnica |
|---------|--------|-------------------|
| `lib/abrams.ts` | Lei de Abrams | Regressão OLS + fator de maturidade CEB-FIP + inverso a/c |
| `lib/dosagem.ts` | IPT-EPUSP | Volumes absolutos, consumos 1m³, teor de argamassa |
| `lib/empacotamento.ts` | Packing | CPM (De Larrard) + AIM + WLS + Monte Carlo + RMSE ativo |
| `lib/granulometria.ts` | Granulometria | NBR NM 248, Andreasen modificado, curva ideal, RMSE |
| `lib/laboratorio.ts` | LIMS | 17 geometrias CP, ensaios físico-mecânicos, NBR 5739 |
| `lib/comparativo.ts` | Comparativo | KPI ranking multicritério + recalibração OLS Abrams |
| `lib/constants.ts` | Constantes | Densidades, limites NBR, tabelas de referência |
| `lib/prisma.ts` | Prisma | Cliente singleton — não instanciar direto |

### Componentes existentes (UI)
| Componente | Rota atual | Status |
|-----------|-----------|--------|
| `OtimizadorEmpacotamento.tsx` | `/projeto/empacotamento` | ✅ |
| `TracoTeorico.tsx` | `/projeto/traco` | ✅ (bugs conhecidos — corrigir Fase 1-B) |
| `EscalonadorPiloto.tsx` | `/projeto/piloto` | ✅ |
| `ComparadorTracos.tsx` | `/projeto/comparar` | ✅ (expandir Fase 2) |
| `PainelPersistencia.tsx` | sidebar | ✅ |
| `RelatorioTraco.tsx` | `/projeto/relatorio` | ✅ PDF 4p (expandir Fase 6) |

---

## 🗂️ BANCO DE MATERIAIS CORE MIX V1 — REFERÊNCIA TÉCNICA

### Cimentos (ensaios reais — rastreados)
| ID | Nome | ρ g/cm³ | Blaine | R28d MPa | Família |
|----|------|---------|--------|----------|---------|
| C1 | CP II-E-40 Brennand/Sete Lagoas | 3.06 | — | ~45 | CCV Basáltica |
| C2 | CP V-ARI MAX Brennand/Sete Lagoas | 3.06 | — | 48.7 | CCV/CAA Granítica |
| C3 | CP V ARI PLUS Holcim Barroso | 3.10 | 5089 | 50.2–53.1 | CAA FÊNIX |
| C4 | CP V RS Holcim | 3.00 | — | ~50 | CAA Agressivo |

> ⚠️ C3: C₃A estimado ≈ 7,85% (Bogue). Não é RS formal. Não usar em CA Classe III/IV.

### Agregados graúdos
| ID | Nome | DMC mm | ρ g/cm³ | abs % | Fonte |
|----|------|--------|---------|-------|-------|
| G4 | Pedrisco Granítico PSI | 9.5 | 2.70 | 1.0 | RE-ASSTEC-001 v3.0 |
| G6 | Brita 0 Gnaisse FÊNIX | 9.5 | 2.70 | ~1.0 | Piso Preto xlsx Mar/2020 |

### Agregados miúdos
| ID | Nome | MF | ρ g/cm³ | abs % | Status |
|----|------|-----|---------|-------|--------|
| M4 | Areia Natural Porto Guararema | 2.60 | 2.60 | 0.4 | ✅ PRIMÁRIA — dados completos |
| M7 | Areia Granítica Prime Embu | 2.29 | ~2.65 | — | ✅ PRIMÁRIA CAA |
| M9 | Areia Artificial Gnaisse FÊNIX | 2.98 | 2.69 | — | ✅ composição |

### Curvas de Abrams calibradas (5 famílias + 3 Holcim)
```
FAM-1  CCV Basáltica:     y = A/B^(a/c) · A=78.0, B=1.65    R²=0.99  [fc7]
FAM-2  CCV Granítica:     y = A/B^(a/c) · A=95.0, B=1.75    R²=0.998 [fc7]
FAM-3  CAA GALLEON:       sem Abrams — a/c 0.50–0.55, fc45+ (Metacaulim 5.2%)
FAM-4  CAA FÊNIX:         sem Abrams — a/c 0.48–0.58, fc45 (Filler Pau Pedra)
FAM-5  CAA Agressivo:     sem Abrams — a/c 0.354, fc30 (CP V RS, sulfatos)
FAM-H1 Holcim 100% CIM:  fc28 = 22.906 × ac^-1.768          R²=0.9999
FAM-H2 Holcim 50% POZ:   fc28 = 14.626 × ac^-2.525          R²=0.9969
FAM-H3 Holcim 30% POZ:   fc28 = 16.774 × ac^-2.582          R²=0.9997
```

---

## 🚀 SEQUÊNCIA DE EXECUÇÃO — 8 FASES

```
FASE 0  → diagnóstico + build baseline
FASE 1  → banco de materiais Core Mix V1 (Prisma + seed + router)
FASE 1B → resgates dos projetos legados (bugs + engines novos)  ← NOVO
FASE 2  → comparador de traços expandido (Abrams + econômico)
FASE 3  → traço teórico conectado ao banco
FASE 4  → dosagem guiada Core Mix V1 (fluxo 4 passos)
FASE 5  → dashboard DENSUS + gestão de materiais
FASE 6  → PDF expandido + validações NBR finais
```

---

## FASE 0 — DIAGNÓSTICO E SETUP

**Objetivo:** Confirmar que o projeto builda limpo antes de qualquer alteração.

```bash
# 0.1 — Build check
cd /path/to/core-mix-pro-claude
npx tsc --noEmit 2>&1 | head -60
npx next build 2>&1 | tail -30

# 0.2 — Dependências
cat package.json | grep -E '"(next|prisma|trpc|zod|recharts)"'

# 0.3 — Estado do banco
npx prisma db push --accept-data-loss
npx prisma studio  # abrir para verificar dados existentes
```

**Critério de avanço:** zero erros de TypeScript nos 8 engines de `lib/`.
Se houver erros, listar e corrigir antes de avançar.

**Tag:** `chore: fase-0-baseline`

---

## FASE 1 — BANCO DE MATERIAIS CORE MIX V1

**Objetivo:** Criar os 6 novos models no Prisma, popular com seed completo, criar router tRPC.

### 1.1 — Expandir `prisma/schema.prisma`

Adicionar **após** os 5 models existentes (não substituir):

```prisma
// ─── BANCO DE MATERIAIS CORE MIX V1 ───────────────────────────

model Cimento {
  id            String        @id @default(cuid())
  codigo        String        @unique
  nome          String
  tipo          String        // "CP II-E-40" | "CP V-ARI MAX" | "CP V RS" | "CP V ARI PLUS"
  fabricante    String
  fabrica       String?
  rhoCimento    Float
  blaine        Float?
  r1d           Float?
  r3d           Float?
  r7d           Float?
  r28d          Float?
  c3aEstimado   Float?        // % — Equação de Bogue
  so3           Float?
  familia       String        // "CCV" | "CAA" | "UHPC"
  origem        String?       // "ensaio_real" | "literatura"
  fonte         String?
  dataRef       String?
  ativo         Boolean       @default(true)
  criadoEm      DateTime      @default(now())
  tracos        TracoSalvo[]
  familias      FamiliaTraco[]
}

model AgregadoGraudo {
  id            String   @id @default(cuid())
  codigo        String   @unique
  nome          String
  tipo          String   // "brita0" | "brita1" | "pedrisco" | "brita4"
  litologia     String   // "granitico" | "basaltico" | "calcario" | "gnaisse"
  origem        String
  dmc           Float
  mf            Float?
  rhoDry        Float?
  rhoSss        Float?
  rhoAparente   Float?
  muSolto       Float?
  muCompactado  Float?
  absorcao      Float?
  materialPulv  Float?
  curvaGranulo  String?  // JSON {"9.5": 0, "6.3": 16, ...}
  statusNBR     String   @default("ok")
  fonte         String?
  ativo         Boolean  @default(true)
  criadoEm      DateTime @default(now())
}

model AgregadoMiudo {
  id            String   @id @default(cuid())
  codigo        String   @unique
  nome          String
  tipo          String   // "natural" | "artificial" | "po_pedra"
  litologia     String
  origem        String
  dmc           Float
  mf            Float
  rhoDry        Float?
  rhoSss        Float?
  muSolto       Float?
  muCompactado  Float?
  absorcao      Float?
  materialPulv  Float?
  curvaGranulo  String?  // JSON
  statusMF      String   @default("ok")
  fonte         String?
  ativo         Boolean  @default(true)
  criadoEm      DateTime @default(now())
}

model Aditivo {
  id            String   @id @default(cuid())
  codigo        String   @unique
  nome          String
  fabricante    String
  tipo          String   // "SP" | "VMA" | "AR" | "AC" | "RE"
  classe        String?  // 14 classes: "superplastificante_pce" | "retardador" | ...
  baseQuimica   String?
  rhoDensidade  Float?
  dosMin        Float?
  dosMax        Float?
  dosRef        Float?
  unidadeDose   String?  // "%" | "L/100kg"
  sistemaAlvo   String   // "CCV" | "CAA" | "UHPC" | "SEMIDRY"
  compatSCM     String?  // "sim" | "parcial" | "restrita"
  impactoPega   String?  // "acelera" | "retarda" | "neutro"
  fonte         String?
  ativo         Boolean  @default(true)
  criadoEm      DateTime @default(now())
}

model Adicao {
  id            String   @id @default(cuid())
  codigo        String   @unique
  nome          String
  tipo          String   // "metacaulim" | "silica_ativa" | "cinza_f" | "escoria" | "filler"
  tipoFuncional String?  // "inerte" | "pozzolanica" | "latente_hidraulica"
  estado        String?  // "po" | "dispersao_aquosa"
  fabricante    String?
  rhoDensidade  Float?
  blaine        Float?
  sio2          Float?   // %
  al2o3         Float?   // %
  areaEspecifica Float?  // m²/g (BET)
  reatividade   String?  // "alta" | "media" | "inerte"
  teorSolidos   Float?   // % — para suspensões (sílica ativa em dispersão)
  teorAgua      Float?   // % — água embutida na suspensão
  dosRef        Float?
  fonte         String?
  ativo         Boolean  @default(true)
  criadoEm      DateTime @default(now())
}

model FamiliaTraco {
  id              String       @id @default(cuid())
  codigo          String       @unique
  nome            String
  descricao       String?
  cimentoCodigo   String
  cimento         Cimento      @relation(fields: [cimentoCodigo], references: [codigo])
  sistemaConcreto String       // "CCV" | "CAA" | "UHPC" | "SEMIDRY"
  abramsA         Float        // coeficiente A (ou 0 se não calibrado)
  abramsB         Float        // coeficiente B
  abramsR2        Float?
  abramsForm      String       @default("exponencial") // "exponencial" | "potencia"
  acMin           Float
  acMax           Float
  fc28Ref         Float
  slumpRef        Float?
  notas           String?
  fonte           String?
  criadoEm        DateTime     @default(now())
  tracosSalvos    TracoSalvo[]
}

// ─── CRM (Clientes + Obras) ────────────────────────────────────

model Cliente {
  id        String   @id @default(cuid())
  nome      String
  documento String?  // CPF/CNPJ
  email     String?
  telefone  String?
  endereco  String?
  notas     String?
  criadoEm  DateTime @default(now())
  obras     Obra[]
}

model Obra {
  id          String     @id @default(cuid())
  nome        String
  clienteId   String
  cliente     Cliente    @relation(fields: [clienteId], references: [id])
  descricao   String?
  local       String?
  status      String     @default("planning")
  dataInicio  String?
  dataFim     String?
  criadoEm    DateTime   @default(now())
  projetos    Projeto[]
}

// ─── Atualizar model Projeto existente para vincular à Obra ────
// ATENÇÃO: adicionar campo obraId ao model Projeto existente:
// obraId   String?
// obra     Obra?   @relation(fields: [obraId], references: [id])
```

**IMPORTANTE:** Adicionar também ao model `TracoSalvo` existente:
```prisma
familiaId     String?
coreMixVersao String?   // "V1" | "V2"
versao        Int       @default(1)
parentId      String?   // para versionamento de traços
familia       FamiliaTraco? @relation(fields: [familiaId], references: [id])
```

### 1.2 — Criar `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {

  // ── CIMENTOS ──────────────────────────────────────────────────
  await prisma.cimento.createMany({ skipDuplicates: true, data: [
    { codigo: 'C1', nome: 'CP II-E-40 Brennand/Nacional', tipo: 'CP II-E-40',
      fabricante: 'Brennand Cimentos', fabrica: 'Sete Lagoas/MG',
      rhoCimento: 3.06, r28d: 45.0, familia: 'CCV',
      origem: 'ensaio_real', fonte: 'RE-ASSTEC-014' },
    { codigo: 'C2', nome: 'CP V-ARI MAX Brennand/Nacional', tipo: 'CP V-ARI MAX',
      fabricante: 'Brennand Cimentos', fabrica: 'Sete Lagoas/MG',
      rhoCimento: 3.06, r28d: 48.7, familia: 'CAA',
      origem: 'ensaio_real', fonte: 'RE-ASSTEC-005/014' },
    { codigo: 'C3', nome: 'CP V ARI PLUS Holcim Barroso', tipo: 'CP V ARI PLUS',
      fabricante: 'Holcim', fabrica: 'Barroso/MG',
      rhoCimento: 3.10, blaine: 5089, r1d: 27.2, r3d: 36.7, r7d: 41.9, r28d: 50.2,
      c3aEstimado: 7.85, so3: 3.07, familia: 'CAA',
      origem: 'ensaio_real', fonte: 'CPV_ARI_PLUS_BO_21102021', dataRef: 'Out/2021' },
    { codigo: 'C4', nome: 'CP V RS Holcim', tipo: 'CP V RS',
      fabricante: 'Holcim', rhoCimento: 3.00, r28d: 50.0, familia: 'CAA',
      origem: 'ensaio_real', fonte: 'MC Dosagem Dez/2018' },
  ]})

  // ── AGREGADOS GRAÚDOS ─────────────────────────────────────────
  await prisma.agregadoGraudo.createMany({ skipDuplicates: true, data: [
    { codigo: 'G4', nome: 'Pedrisco Granítico PSI', tipo: 'pedrisco',
      litologia: 'granitico', origem: 'Pedreira PSI – Santa Izabel/SP',
      dmc: 9.5, mf: 5.98, rhoDry: 2.70, absorcao: 1.0,
      curvaGranulo: JSON.stringify({'9.5':1,'6.3':71,'4.75':97,'2.36':100}),
      statusNBR: 'warn', fonte: 'RE-ASSTEC-001 v3.0' },
    { codigo: 'G6', nome: 'Brita 0 Gnaisse FÊNIX/Econcreto', tipo: 'brita0',
      litologia: 'gnaisse', origem: 'Holcim – Mairiporã/SP',
      dmc: 9.5, mf: 6.11, rhoDry: 2.70,
      curvaGranulo: JSON.stringify({'12.5':0,'9.5':16,'6.3':89.2,'4.75':98.8,'2.36':99.3}),
      statusNBR: 'ok', fonte: 'Piso Preto xlsx Mar/2020' },
  ]})

  // ── AGREGADOS MIÚDOS ──────────────────────────────────────────
  await prisma.agregadoMiudo.createMany({ skipDuplicates: true, data: [
    { codigo: 'M4', nome: 'Areia Natural Porto Guararema', tipo: 'natural',
      litologia: 'quartzo', origem: 'Porto Guararema/SP',
      dmc: 2.36, mf: 2.60, rhoDry: 2.60, rhoSss: 2.61,
      muSolto: 1.51, muCompactado: 1.62, absorcao: 0.4, materialPulv: 1.7,
      curvaGranulo: JSON.stringify({'4.75':1,'2.36':4,'1.18':17,'0.6':58,'0.3':85,'0.15':96,'0.075':99}),
      statusMF: 'ok', fonte: '4987/13' },
    { codigo: 'M7', nome: 'Areia Granítica Prime Embu', tipo: 'artificial',
      litologia: 'granitico', origem: 'Pedreira Embu/SP',
      dmc: 2.36, mf: 2.29, rhoDry: 2.65,
      curvaGranulo: JSON.stringify({'2.36':3,'1.18':25,'0.6':48,'0.3':66,'0.15':88,'0.075':95}),
      statusMF: 'ok', fonte: 'RE-ASSTEC-002 v3.0' },
    { codigo: 'M9', nome: 'Areia Artificial Gnaisse FÊNIX', tipo: 'artificial',
      litologia: 'gnaisse', origem: 'Holcim – Mairiporã/SP',
      dmc: 4.8, mf: 2.98, rhoDry: 2.69,
      curvaGranulo: JSON.stringify({'4.8':0.36,'2.4':23.89,'1.2':46.71,'0.6':65.72,'0.3':75.49,'0.15':85.79,'0.075':92}),
      statusMF: 'warn', fonte: 'Piso Preto xlsx Mar/2020' },
  ]})

  // ── ADITIVOS ──────────────────────────────────────────────────
  await prisma.aditivo.createMany({ skipDuplicates: true, data: [
    { codigo: 'A1', nome: 'Powerflow 1180', fabricante: 'MC Bauchemie', tipo: 'SP',
      classe: 'superplastificante_pce', rhoDensidade: 1.06,
      dosRef: 1.06, dosMin: 0.8, dosMax: 1.5, sistemaAlvo: 'CAA' },
    { codigo: 'A2', nome: 'Tecniflow 520', fabricante: 'MC Bauchemie', tipo: 'SP',
      classe: 'superplastificante_pce',
      dosRef: 0.65, dosMin: 0.4, dosMax: 1.0, sistemaAlvo: 'CCV' },
    { codigo: 'A3', nome: 'PF1185 + PF3050', fabricante: 'MC Bauchemie', tipo: 'SP',
      classe: 'superplastificante_pce', rhoDensidade: 1.20,
      dosRef: 1.10, sistemaAlvo: 'CAA' },
    { codigo: 'A4', nome: 'Masterpolyheed 20', fabricante: 'BASF', tipo: 'SP',
      classe: 'superplastificante_pce', rhoDensidade: 1.18,
      dosRef: 0.70, sistemaAlvo: 'CCV' },
    { codigo: 'A5', nome: 'Powerflow 8930', fabricante: 'MC Bauchemie', tipo: 'SP',
      classe: 'superplastificante_pce',
      dosRef: 0.83, dosMin: 0.7, dosMax: 1.1, sistemaAlvo: 'CAA' },
  ]})

  // ── ADIÇÕES ───────────────────────────────────────────────────
  await prisma.adicao.createMany({ skipDuplicates: true, data: [
    { codigo: 'AD1', nome: 'Metacaulim Ultra HP', tipo: 'metacaulim',
      tipoFuncional: 'pozzolanica', estado: 'po',
      fabricante: 'Metacaulim – Jundiaí', rhoDensidade: 2.20,
      dosRef: 5.2, reatividade: 'alta' },
    { codigo: 'AD2', nome: 'Filler Granítico Pau Pedra #325', tipo: 'filler',
      tipoFuncional: 'inerte', estado: 'po',
      fabricante: 'Pau Pedra', dosRef: 22.0, reatividade: 'inerte' },
  ]})

  // ── FAMÍLIAS DE TRAÇO ─────────────────────────────────────────
  await prisma.familiaTraco.createMany({ skipDuplicates: true, data: [
    { codigo: 'FAM-1', nome: 'CCV Basáltica Econcreto',
      cimentoCodigo: 'C1', sistemaConcreto: 'CCV',
      abramsA: 78.0, abramsB: 1.65, abramsR2: 0.99, abramsForm: 'exponencial',
      acMin: 0.42, acMax: 0.98, fc28Ref: 45.0, slumpRef: 150,
      notas: 'fc7 calibrado. fc28 estimado = fc7 × 1.40. Aditivo: Masterpolyheed 20 @ 0.70%.',
      fonte: 'RE-ASSTEC-014 Econcreto T01-T06' },
    { codigo: 'FAM-2', nome: 'CCV Granítica Ecoverde',
      cimentoCodigo: 'C2', sistemaConcreto: 'CCV',
      abramsA: 95.0, abramsB: 1.75, abramsR2: 0.998, abramsForm: 'exponencial',
      acMin: 0.50, acMax: 0.79, fc28Ref: 48.7, slumpRef: 225,
      notas: 'Família pré-fabricados. fc28 T01=48.7 MPa. Aditivo: Tecniflow 520 @ 0.65%.',
      fonte: 'RE-ASSTEC-014 Ecoverde T01-T03' },
    { codigo: 'FAM-3', nome: 'CAA Granítica Pré-fab GALLEON',
      cimentoCodigo: 'C2', sistemaConcreto: 'CAA',
      abramsA: 0, abramsB: 0, acMin: 0.50, acMax: 0.55, fc28Ref: 45.0, slumpRef: 750,
      notas: 'CAA pré-fabricados. Slump flow 740-760mm. Metacaulim Ultra HP 5.2% obrigatório. Aditivo: PF1180 @ 1.06%.',
      fonte: 'RE-ASSTEC-005 GALLEON' },
    { codigo: 'FAM-4', nome: 'CAA Industrial FÊNIX / Piso Preto',
      cimentoCodigo: 'C3', sistemaConcreto: 'CAA',
      abramsA: 0, abramsB: 0, acMin: 0.48, acMax: 0.58, fc28Ref: 45.0, slumpRef: 750,
      notas: 'Piso industrial e piso preto. Filler Pau Pedra 22-33% subst. cimento. Aditivo: PF8930 @ 0.83-1.06%.',
      fonte: 'Piso Preto xlsx Mar/2020' },
    { codigo: 'FAM-5', nome: 'CAA Agressivo CP V RS',
      cimentoCodigo: 'C4', sistemaConcreto: 'CAA',
      abramsA: 0, abramsB: 0, acMin: 0.354, acMax: 0.40, fc28Ref: 30.0, slumpRef: 730,
      notas: 'Meios agressivos (sulfatos, cloretos, esgoto). CP V RS obrigatório. Aditivo: PF1185+PF3050 @ 1.10%.',
      fonte: 'MC Dosagem Dez/2018' },
    { codigo: 'FAM-H1', nome: 'Holcim 100% Cimento (Comparativo)',
      cimentoCodigo: 'C3', sistemaConcreto: 'CCV',
      abramsA: 22.906, abramsB: 1.768, abramsR2: 0.9999, abramsForm: 'potencia',
      acMin: 0.64, acMax: 0.91, fc28Ref: 38.0,
      notas: 'Lei potência: fc28 = 22.906 × ac^-1.768. Referência Mai/2020. R²=0.9999.',
      fonte: 'COMPARATIVO_HOLCIM.pdf Mai/2020' },
    { codigo: 'FAM-H2', nome: 'Holcim 50% Pozolana (Comparativo)',
      cimentoCodigo: 'C3', sistemaConcreto: 'CCV',
      abramsA: 14.626, abramsB: 2.525, abramsR2: 0.9969, abramsForm: 'potencia',
      acMin: 0.60, acMax: 0.88, fc28Ref: 41.0,
      notas: 'fc28 = 14.626 × ac^-2.525. Economia R$4.10/m³ em fck40. Custo poz: R$0.26/kg.',
      fonte: 'COMPARATIVO_HOLCIM.pdf Mai/2020' },
    { codigo: 'FAM-H3', nome: 'Holcim 30% Pozolana (Comparativo)',
      cimentoCodigo: 'C3', sistemaConcreto: 'CCV',
      abramsA: 16.774, abramsB: 2.582, abramsR2: 0.9997, abramsForm: 'potencia',
      acMin: 0.66, acMax: 0.86, fc28Ref: 38.0,
      notas: 'fc28 = 16.774 × ac^-2.582. Melhor custo-benefício fck25-35. Economia R$1.18/m³.',
      fonte: 'COMPARATIVO_HOLCIM.pdf Mai/2020' },
  ]})

  console.log('✅ DENSUS Core Mix V1 — seed completo.')
  console.log('   4 cimentos · 2 graúdos · 3 miúdos · 5 aditivos · 2 adições · 8 famílias')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

Adicionar ao `package.json`:
```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```

Executar:
```bash
npx prisma migrate dev --name add-densus-core-mix-v1
npx prisma db seed
```

### 1.3 — Criar `src/server/routers/materiais.ts`

Endpoints necessários (usar Prisma Client, protectedProcedure):
- `listarCimentos` — input: `{ familia?: string }` → retorna cimentos ativos filtrados
- `listarAgregadosMiudos` — input: `{ statusMF?: string }` → retorna miúdos ativos
- `listarAgregadosGraudo` — input: `{ dmc?: number }` → retorna graúdos ativos
- `listarAditivos` — input: `{ sistemaAlvo?: string }` → retorna aditivos ativos
- `listarFamilias` — input: `{ sistemaConcreto?: string }` → retorna famílias com cimento populado
- `buscarFamiliaPorCimento` — input: `{ cimentoCodigo: string }` → famílias do cimento
- `criarCimento` — mutation com todos os campos do model Cimento
- `criarAgregado` — mutation polimórfica (tipo: "miudo" | "graudo")

Registrar em `src/server/root.ts`:
```typescript
import { materiaisRouter } from './routers/materiais'
// adicionar ao appRouter:
materiais: materiaisRouter,
```

**Tag:** `feat: fase-1-banco-materiais-core-mix-v1`

---

## FASE 1-B — RESGATES DOS PROJETOS LEGADOS

> **Contexto:** Auditoria de 6 projetos identificou código de alto valor para absorver.
> Esta fase corrige bugs conhecidos e adiciona engines resgatados ANTES de qualquer UI nova.

### R1 — Criar `src/lib/thermocore.ts` ← resgatado do `aion_pilot_kit`

**O que é:** Motor de maturidade completo — Arrhenius + Nurse-Saul + calibração automática de parâmetros. Código Python validado contra 30 lotes de dados. Portar para TypeScript.

```typescript
// src/lib/thermocore.ts
// Portado de: aion_pilot_kit/pilot_report.py (CONCRYA Technologies)

const R_GAS = 8.314462618 // J/(mol·K)

// ── MODELOS DE TEMPO EQUIVALENTE ──────────────────────────────

/** Tempo equivalente pelo modelo de Arrhenius (ASTM C1074) */
export function teqArrhenius(
  age: number,       // dias
  tempC: number,     // temperatura medida °C
  trefC = 20.0,      // temperatura de referência °C
  ea = 40000.0       // energia de ativação J/mol (padrão: OPC ~40kJ/mol)
): number {
  const T    = tempC + 273.15
  const Tref = trefC + 273.15
  return age * Math.exp((ea / R_GAS) * (1.0 / Tref - 1.0 / T))
}

/** Tempo equivalente pelo modelo de Nurse-Saul */
export function teqNurseSaul(
  age: number,
  tempC: number,
  t0C = 0.0,         // temperatura datum °C (padrão: -10°C ACI, 0°C NBR)
  trefC = 20.0
): number {
  return age * Math.max(0, tempC - t0C) / Math.max(1e-6, trefC - t0C)
}

// ── MODELO DE RESISTÊNCIA ──────────────────────────────────────

/** fc(teq) = fcInf × (1 - exp(-k × teq))^m */
export function fcModel(teq: number, fcInf: number, k: number, m = 1.0): number {
  const base = Math.max(1e-12, 1 - Math.exp(-k * teq))
  return fcInf * Math.pow(base, m)
}

/** Previsão de resistência dado temperatura e idade */
export function predictFc(params: {
  tempC: number
  age: number
  fcInf?: number
  k?: number
  m?: number
  ea?: number
  trefC?: number
  t0C?: number
  model?: 'arrhenius' | 'nurse_saul'
}): number {
  const { tempC, age, fcInf = 55, k = 0.25, m = 1.0,
          ea = 40000, trefC = 20, t0C = 0, model = 'arrhenius' } = params
  const teq = model === 'nurse_saul'
    ? teqNurseSaul(age, tempC, t0C, trefC)
    : teqArrhenius(age, tempC, trefC, ea)
  return fcModel(Math.max(1e-9, teq), fcInf, k, m)
}

// ── CALIBRAÇÃO AUTOMÁTICA DE PARÂMETROS ───────────────────────

export interface LoteEnsaio {
  externalId: string
  temperature: number   // °C
  targetFck: number     // MPa
  ageDays: number       // 7 ou 28
  fcMpa: number         // resultado real
}

/**
 * Estima fcInf e k pelos dados de campo (método dos dois pontos por bisseção).
 * Reflete o que o AION converge em calibração Bayesiana.
 */
export function estimateParams(
  records: LoteEnsaio[],
  model: 'arrhenius' | 'nurse_saul' = 'arrhenius'
): { fcInf: number; k: number } {
  const age28 = records.filter(r => Math.abs(r.ageDays - 28) < 1)
  const age7  = records.filter(r => Math.abs(r.ageDays - 7) < 0.6)

  if (!age28.length) return { fcInf: 55, k: 0.25 }

  const tempMean = age28.reduce((s, r) => s + r.temperature, 0) / age28.length

  const teq = (age: number, t: number) =>
    model === 'nurse_saul' ? teqNurseSaul(age, t) : teqArrhenius(age, t)

  const teq7m  = teq(7, tempMean)
  const teq28m = teq(28, tempMean)

  // Razão média fc7/fc28 (pares do mesmo lote)
  const byId: Record<string, Record<number, LoteEnsaio>> = {}
  for (const r of records) {
    if (!byId[r.externalId]) byId[r.externalId] = {}
    byId[r.externalId][r.ageDays] = r
  }
  const ratios = Object.values(byId)
    .map(pts => {
      const fc7  = Object.values(pts).find(p => Math.abs(p.ageDays - 7) < 0.6)?.fcMpa
      const fc28 = Object.values(pts).find(p => Math.abs(p.ageDays - 28) < 1)?.fcMpa
      return fc7 && fc28 && fc28 > 0 ? fc7 / fc28 : null
    })
    .filter(Boolean) as number[]

  let kEst = 0.12
  if (ratios.length >= 2) {
    const meanRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length
    const ratioHat = (k: number) =>
      (1 - Math.exp(-k * teq7m)) / Math.max(1e-9, 1 - Math.exp(-k * teq28m))
    let lo = 0.001, hi = 5.0
    const gLo = ratioHat(lo) - meanRatio
    const gHi = ratioHat(hi) - meanRatio
    if (gLo * gHi < 0) {
      let gLoLocal = gLo
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2
        if ((ratioHat(mid) - meanRatio) * gLoLocal <= 0) hi = mid
        else { lo = mid; gLoLocal = ratioHat(lo) - meanRatio }
      }
      kEst = (lo + hi) / 2
    }
  }

  const fc28Mean = age28.reduce((s, r) => s + r.fcMpa, 0) / age28.length
  const denom = Math.max(1e-9, 1 - Math.exp(-kEst * teq28m))
  const fcInfEst = fc28Mean / denom

  return { fcInf: Math.round(fcInfEst * 100) / 100, k: Math.round(Math.max(0.05, kEst) * 100000) / 100000 }
}

// ── MÉTRICAS DE QUALIDADE ──────────────────────────────────────

export interface ThermoMetrics {
  n: number
  mae: number
  rmse: number
  mape: number
  bias: number
}

export function calcMetrics(actual: number[], predicted: number[]): ThermoMetrics {
  const n = actual.length
  const mae  = actual.reduce((s, a, i) => s + Math.abs(a - predicted[i]), 0) / n
  const rmse = Math.sqrt(actual.reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0) / n)
  const mape = 100 * actual.reduce((s, a, i) => s + Math.abs((a - predicted[i]) / Math.max(1e-9, a)), 0) / n
  const bias = actual.reduce((s, a, i) => s + (predicted[i] - a), 0) / n
  return { n, mae: +mae.toFixed(2), rmse: +rmse.toFixed(2), mape: +mape.toFixed(1), bias: +bias.toFixed(2) }
}

// ── CRITÉRIO GO/NO-GO (AION Pilot) ────────────────────────────

export function avaliarPiloto(metrics: ThermoMetrics): {
  status: 'GO' | 'AJUSTE' | 'NO_GO'
  mensagem: string
} {
  if (metrics.mae < 3.0 && metrics.mape < 8) return { status: 'GO', mensagem: 'Pronto para piloto — MAE < 3 MPa e MAPE < 8%' }
  if (metrics.mae < 6.0) return { status: 'AJUSTE', mensagem: 'Calibrar com mais dados de campo — MAE entre 3 e 6 MPa' }
  return { status: 'NO_GO', mensagem: 'Revisar parâmetros — MAE > 6 MPa' }
}
```

Adicionar endpoint tRPC em `server/routers/dosagem.ts`:
```typescript
calcularMaturidade: protectedProcedure
  .input(z.object({
    tempC: z.number(),
    age: z.number(),
    fcInf: z.number().optional(),
    k: z.number().optional(),
    ea: z.number().optional(),
    model: z.enum(['arrhenius', 'nurse_saul']).optional(),
  }))
  .query(({ input }) => {
    return { fc: predictFc(input) }
  }),
```

### R2 — Corrigir `src/shared/schemas.ts` — peneira 0.075mm + sílica

**Bug identificado na auditoria:** peneira `0.075` ausente nos schemas. Campo `aguaSuspensaoKg` faltando.

Localizar o array de peneiras válidas e adicionar:
```typescript
// ANTES (incompleto):
const PENEIRAS_VALIDAS = ["75","63","50","37.5","31.5","25","19","12.5","9.5",
  "6.3","4.8","2.4","1.2","0.6","0.3","0.15","fundo"]

// DEPOIS (correto — inclui 0.075 = #200):
const PENEIRAS_VALIDAS = ["75","63","50","37.5","31.5","25","19","12.5","9.5",
  "6.3","4.8","2.4","1.2","0.6","0.3","0.15","0.075","fundo"] as const
```

No `tracoBaseSchema`, adicionar:
```typescript
aguaSuspensaoKg: z.number().min(0).optional(),
// Agua embutida em adições em suspensão (ex: sílica ativa 50% sólidos)
// Impacto no cálculo: a/c_real = (aguaTotal - aguaSuspensaoKg) / cimento
```

### R3 — Corrigir bug `alphaiModulo` em `src/lib/abrams.ts` ou `dosagem.ts`

**Bug conhecido:** `αi` fixo em 0.85 (basalto). Erro de 25% no módulo para brita calcária.

Adicionar ao final do arquivo relevante:
```typescript
// NBR 6118:2023 Tabela 8.3 — coeficiente αi por tipo de agregado
export const ALPHA_I_TABELA: Record<string, number> = {
  basalto:   0.90,
  diabasio:  0.90,
  granitico: 0.85,
  gnaisse:   0.85,
  calcario:  0.70,  // ← CRÍTICO: erro comum de 25% em módulo
  arenito:   0.70,
  seixo:     0.70,
  argilas:   0.70,
} as const

/** Módulo secante de elasticidade — NBR 6118:2023 Equação (8.3)
 *  Ecs = αi × 5600 × √fck  (MPa)
 */
export function calcModuloElasticidade(fck: number, litologia: string): number {
  const ai = ALPHA_I_TABELA[litologia] ?? 0.85
  return ai * 5600 * Math.sqrt(fck)
}
```

Expor `litologia` como campo de input em `TracoTeorico.tsx` — select com as chaves do `ALPHA_I_TABELA`.

### R4 — Expandir `prisma/schema.prisma` com models de materiais avançados

Adicionar após os models da Fase 1:

```prisma
// ─── MATERIAIS AVANÇADOS (resgatados de mestres-dosagem-app) ──

model Fibra {
  id              String   @id @default(cuid())
  codigo          String   @unique
  nome            String
  tipo            String   // "aco" | "pp_micro" | "pp_macro" | "pva" | "vidro_ar" | "basalto" | "frp"
  fabricante      String?
  comprimento     Float?   // mm
  diametro        Float?   // mm
  fatorForma      Float?   // l/d
  resistTracao    Float?   // MPa
  moduloElastico  Float?   // GPa
  fr1             Float?   // MPa — resistência residual à flexão (EN 14651)
  fr4             Float?   // MPa
  dosagemTipica   Float?   // kg/m³
  fonte           String?
  ativo           Boolean  @default(true)
  criadoEm        DateTime @default(now())
}

model GranulometriaLote {
  id               String   @id @default(cuid())
  materialCodigo   String   // referência ao agregado (M4, G6, etc.)
  nome             String
  dataColeta       String?
  dataEnsaio       String?
  numeroLote       String?
  fornecedor       String?
  localColeta      String?
  tecnico          String?
  pesoAmostra      Float?   // g
  distribuicao     String?  // JSON: {"9.5": 0, "6.3": 16, ...} — inclui 0.075
  d10              Float?   // mm
  d50              Float?   // mm
  d90              Float?   // mm
  mf               Float?
  materialPulv     Float?   // %
  classificacao    String?  // "Areia Fina" | "Brita 0" | etc.
  inputMethod      String   @default("manual") // "manual" | "foto" | "excel"
  notas            String?
  criadoEm         DateTime @default(now())
}
```

Adicionar seed básico de fibras no `prisma/seed.ts`:
```typescript
await prisma.fibra.createMany({ skipDuplicates: true, data: [
  { codigo: 'F1', nome: 'Fibra Aço Dramix 3D 65/35', tipo: 'aco',
    fabricante: 'Bekaert', comprimento: 35, diametro: 0.55, fatorForma: 64,
    resistTracao: 1160, dosagemTipica: 30 },
  { codigo: 'F2', nome: 'Fibra PP Macro Fibermesh 650', tipo: 'pp_macro',
    fabricante: 'Sika', comprimento: 54, diametro: 0.84, fatorForma: 64,
    dosagemTipica: 4.5 },
]})
```

**Tag:** `feat: fase-1b-resgates-legados-engines-bugs`

---

## FASE 2 — COMPARADOR DE TRAÇOS EXPANDIDO

**Objetivo:** Adicionar curva de Abrams teórica sobreposta e aba de análise econômica.

### 2.1 — Expandir endpoint `compararTracos` em `server/routers/dosagem.ts`

Input adicional:
```typescript
familiaId: z.string().optional(),
precoCimento: z.number().optional(),   // R$/kg
precoPozolana: z.number().optional(),  // R$/kg
```

Output adicional:
```typescript
curvaAbramsRef: z.array(z.object({ ac: z.number(), fc: z.number() })).optional(),
custoEstimadoM3: z.number().optional(),
familiaUsada: z.string().optional(),
```

Lógica: se `familiaId` fornecido, buscar `FamiliaTraco` no banco e calcular curva com 20 pontos de a/c entre `acMin` e `acMax`.

### 2.2 — Expandir `ComparadorTracos.tsx`

1. Dropdown de seleção de família (busca `trpc.materiais.listarFamilias`)
2. No gráfico Recharts existente, adicionar `<Line>` com `curvaAbramsRef` (linha tracejada = curva teórica, pontos = ensaios reais)
3. Nova aba "Econômico" com tabela fck vs custo/m³ usando FAM-H1/H2/H3

### 2.3 — Nova página `/projeto/comparar-familias`

Selecionar até 3 famílias → plotar curvas sobrepostas → tabela de a/c por fck alvo → botão "Usar família" que pré-preenche TracoTeorico.

**Tag:** `feat: fase-2-comparador-familias-abrams`

---

## FASE 3 — TRAÇO TEÓRICO CONECTADO AO BANCO

**Objetivo:** Eliminar hardcodes. TracoTeorico busca materiais do banco real.

### 3.1 — Substituir selects hardcoded por queries tRPC

```typescript
const { data: cimentos } = trpc.materiais.listarCimentos.useQuery(
  { familia: watch('sistemaConcreto') }
)
const { data: miudos } = trpc.materiais.listarAgregadosMiudos.useQuery({})
```

### 3.2 — Auto-preenchimento de Abrams ao selecionar cimento

1. `onChange` no select de cimento → chamar `buscarFamiliaPorCimento`
2. Mostrar card: "Família sugerida: FAM-2 CCV Granítica — A=95.0, B=1.75, R²=0.998"
3. Botão "Aplicar" → setValue nos campos A, B, R²

### 3.3 — Campo `αi` selecionável no formulário

Adicionar select "Tipo de agregado graúdo" com as litologias do `ALPHA_I_TABELA`. Exibir `αi` calculado e Ecs previsto ao lado.

### 3.4 — Campo `aguaSuspensaoKg` no formulário

Adicionar campo numérico condicional: aparece quando adição selecionada é sílica em suspensão (`estado === 'dispersao_aquosa'`).

**Tag:** `feat: fase-3-traco-teorico-banco-materiais`

---

## FASE 4 — DOSAGEM GUIADA CORE MIX V1

**Objetivo:** Novo módulo com fluxo de 4 passos que usa o banco de famílias calibradas.

### Fluxo do componente `DosagemCoreMix.tsx`

**Passo 1 — Objetivo de projeto:**
- fck alvo (MPa) — slider ou input
- Sistema: CCV | CAA | UHPC | SEMIDRY
- Classe de agressividade: I | II | III | IV (NBR 6118)
- Aplicação: pré-fabricado | in situ | piso industrial | estrutural

**Passo 2 — Seleção de família:**
- Motor filtra `FamiliaTraco` por `sistemaConcreto` e calcula a/c para o fck alvo
- Para cada família compatível, mostrar:
  - a/c calculado pela equação (se abramsA > 0)
  - Consumo estimado de cimento (água=185 / a/c)
  - Custo estimado (com campo de preço editável)
  - Status de conformidade: a/c ≤ AC_MAX_NBR6118[classeAgressividade]
  - Badge verde/laranja/vermelho

**Passo 3 — Granulometria:**
- Mostrar agregados recomendados da família selecionada
- Opção "Otimizar automaticamente" → redirect para `/projeto/empacotamento` com parâmetros pré-carregados via Zustand
- Opção "Composição manual" → sliders de % areia A / % areia B

**Passo 4 — Confirmação e save:**
- Resumo: cimento, a/c, fc28 previsto, slump, custo/m³
- Campo de notas
- Botão "Salvar traço" → `TracoSalvo` com `familiaId` e `coreMixVersao: 'V1'`
- Botão "Ir para piloto" → `/projeto/piloto` com dados pré-carregados

### Tabelas NBR 6118 (criar `src/lib/normativas.ts`)

```typescript
export const AC_MAX_NBR6118: Record<string, number> = {
  I: 0.65, II: 0.60, III: 0.55, IV: 0.45
}
export const CIMENTO_MIN_NBR6118: Record<string, number> = {
  I: 260, II: 280, III: 320, IV: 360
}
export function verificarConformidadeNBR6118(ac: number, consumoCimento: number, classe: string) {
  return {
    acOk: ac <= (AC_MAX_NBR6118[classe] ?? 0.65),
    cimentoOk: consumoCimento >= (CIMENTO_MIN_NBR6118[classe] ?? 260),
    acMax: AC_MAX_NBR6118[classe],
    cimentoMin: CIMENTO_MIN_NBR6118[classe],
  }
}
```

**Tag:** `feat: fase-4-dosagem-coremix-guiada`

---

## FASE 5 — DASHBOARD DENSUS + GESTÃO DE MATERIAIS

**Objetivo:** Página inicial útil e gestão completa do banco de materiais.

### 5.1 — Reescrever `/projeto/page.tsx` como dashboard

4 seções:
1. **Status da obra** — nome, cliente, progresso dos módulos (barra visual Empacotamento → Traço → Piloto → Relatório)
2. **Traço ativo** — último traço salvo com alerta de conformidade NBR 6118
3. **Banco de materiais preview** — cards dos 4 cimentos (badge ativo/inativo + R28d)
4. **Acesso rápido** — botões grandes para cada módulo + "Novo traço CORE MIX V1"

### 5.2 — Nova rota `/materiais` com `BancoMateriais.tsx`

Tabs: Cimentos | Graúdos | Miúdos | Aditivos | Adições | Famílias | Fibras

Para cada tab:
- Tabela com colunas relevantes + badge de status
- Botão "Adicionar" → modal com formulário
- Clique na linha → drawer de detalhes com curva granulométrica (se houver)

**Tag:** `feat: fase-5-dashboard-materiais`

---

## FASE 6 — PDF EXPANDIDO + VALIDAÇÕES FINAIS

**Objetivo:** Relatório técnico com rastreabilidade completa e validações NBR finais.

### 6.1 — Expandir `RelatorioTraco.tsx` para 6 páginas

Adicionar às 4 páginas existentes:

**Página 5 — Rastreabilidade Core Mix V1:**
- Família utilizada: código, nome, fonte documental, data de referência
- Materiais: código, fornecedor, origem, data do ensaio de referência
- Status de conformidade NBR 7211 para cada agregado

**Página 6 — Curva de Abrams da família:**
- SVG manual (react-pdf ViewBox) com a curva da família + ponto marcado (a/c usado, fc28 previsto)
- Equação usada e R²
- Se família sem Abrams calibrado: exibir tabela de a/c vs fc28 de referência

### 6.2 — Alerta C₃A do CPV ARI PLUS (cimento C3)

Em qualquer tela que exibir o cimento C3, adicionar:
```
⚠️ C3 — CPV ARI PLUS Holcim Barroso
C₃A estimado ≈ 7,85% (Equação de Bogue: C₃A = 2,65×Al₂O₃ - 1,69×Fe₂O₃).
NÃO confirmado como RS. Não especificar para CA Classe III/IV sem laudo formal.
```

**Tag:** `feat: fase-6-pdf-expandido-validacoes`

---

## 🔗 FLUXO DE DADOS ENTRE MÓDULOS

```
[/materiais]              ← gestão do banco Core Mix V1
     │
     ↓
[/projeto/dosagem-coremix]  ← ENTRADA: fck alvo, sistema, classe agressividade
     │  seleciona FamiliaTraco
     ↓
[/projeto/empacotamento]    ← otimização granulométrica (CPM, Andreasen)
     │  resultado: composição %A + %B + MF mistura
     ↓
[/projeto/traco]            ← Traço Teórico (a/c, consumos, fc28, αi, Ecs)
     │  salva: TracoSalvo + familiaId + coreMixVersao
     ↓
[/projeto/piloto]           ← escalonamento + planilha de pesagem
     │
     ↓
[/projeto/comparar]         ← comparação múltiplos traços + curva Abrams teórica
     │
     ↓
[/projeto/relatorio]        ← PDF 6 páginas + rastreabilidade Core Mix V1
     │
     ↓
[Prisma SQLite]             ← persistência completa
```

---

## 📋 RESUMO DE TODOS OS ARQUIVOS

### CRIAR
```
prisma/seed.ts                              ← Fase 1
src/lib/thermocore.ts                       ← Fase 1-B (R1)
src/lib/normativas.ts                       ← Fase 4
src/server/routers/materiais.ts             ← Fase 1
src/components/DosagemCoreMix.tsx           ← Fase 4
src/components/BancoMateriais.tsx           ← Fase 5
src/app/projeto/dosagem-coremix/page.tsx    ← Fase 4
src/app/projeto/comparar-familias/page.tsx  ← Fase 2
src/app/materiais/page.tsx                  ← Fase 5
```

### MODIFICAR (APENAS ADICIONAR — nunca deletar código existente)
```
prisma/schema.prisma          ← Fases 1 e 1-B: +8 models
package.json                  ← Fase 1: script prisma.seed
src/server/root.ts            ← Fase 1: registrar materiaisRouter
src/server/routers/dosagem.ts ← Fases 2 e 1-B: expandir endpoints
src/shared/schemas.ts         ← Fase 1-B (R2): peneira 0.075 + aguaSuspensaoKg
src/lib/abrams.ts             ← Fase 1-B (R3): ALPHA_I_TABELA + calcModuloElasticidade
src/components/ComparadorTracos.tsx    ← Fase 2
src/components/TracoTeorico.tsx        ← Fase 3
src/components/RelatorioTraco.tsx      ← Fase 6
src/app/projeto/layout.tsx             ← Fases 4/5: novos links
src/app/projeto/page.tsx               ← Fase 5: reescrever como dashboard
```

---

## ⚠️ REGRAS ABSOLUTAS PARA O CLAUDE CODE

1. **NUNCA reescrever** os 8 engines de `lib/`. Adicionar funções apenas ao final.
2. **Sempre rodar** `npx tsc --noEmit` após cada arquivo modificado. Zero erros antes de avançar.
3. **Seed sempre idempotente** — `skipDuplicates: true` em todos os `createMany`.
4. **Datas históricas** como `String` ("Mar/2020"), nunca `DateTime`.
5. **Não instalar** novas bibliotecas de gráfico — usar Recharts já importado.
6. **Commit com tag** após cada fase concluída.
7. **Arquivos > 400 linhas** — dividir em sub-módulos antes de editar.
8. **Em caso de dúvida técnica** sobre cálculos de concreto (equações, normas, parâmetros), **pergunte a Julio** — não invente valores.
9. **C₃A alerta** — qualquer componente que renderize o cimento C3 deve mostrar o aviso de C₃A ≈ 7,85%.
10. **peneira 0.075** — todas as novas curvas granulométricas no seed devem incluir a peneira 0.075 (mesmo que estimada).

---

## 📊 CRITÉRIOS DE CONCLUSÃO POR FASE

| Fase | Critério |
|------|----------|
| 0 | `next build` limpo, zero erros TypeScript nos 8 engines |
| 1 | `npx prisma db seed` sem erros · 4 cimentos + 8 famílias no banco |
| 1-B | `tsc --noEmit` limpo · `calcularMaturidade` endpoint funcional · `0.075` no schema · `ALPHA_I_TABELA` exportado |
| 2 | `/projeto/comparar` renderiza curva teórica da família sobreposta + aba econômica com delta de custo |
| 3 | Selects de cimento/agregado buscam do banco · campo αi configurável · a/c corrigido para sílica |
| 4 | Fluxo 4 passos completo · traço salvo com `familiaId` e `coreMixVersao: 'V1'` |
| 5 | `/projeto` mostra dashboard · `/materiais` lista todos os registros com filtros |
| 6 | PDF 6 páginas · alerta C₃A visível · curva Abrams no PDF |

---

*CONCRYA DENSUS Engine — CLAUDE.md v2.0 · Março 2026*
*Julio Vechim — Fundador & Especialista em Concretos Especiais · www.concrya.com*
