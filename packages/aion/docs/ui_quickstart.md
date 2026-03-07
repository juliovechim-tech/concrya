# AION UI — Guia Rápido de Operação

Versão 1.0.0 · CONCRYA AION CORE

---

## Pré-requisitos

| Requisito | Versão mínima |
|-----------|--------------|
| Docker Desktop | 24+ |
| Navegador moderno | Chrome 120+ / Firefox 121+ / Edge 120+ |

---

## 1. Subir a aplicação

```bash
# Clone / copie o pacote e entre na pasta
cd aion

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env e defina AION_SESSION_SECRET, AION_LOGIN_USER, AION_LOGIN_PASS

# Suba tudo com um comando
docker compose up -d

# Aguarde ~20 s e acesse:
# http://localhost:8000/app/
```

> **Sem Docker:** veja `docs/backend_quickstart.md` para execução local com SQLite.

---

## 2. Login

1. Abra `http://localhost:8000/app/` — a tela de login aparece automaticamente.
2. Digite o usuário e senha configurados em `.env` (`AION_LOGIN_USER` / `AION_LOGIN_PASS`).
3. Clique **Entrar**. A sessão é mantida por cookie HttpOnly (12 horas).
4. Para sair: clique **⎋ Sair** no canto superior direito do Topbar.

---

## 3. Seleção de Planta

O seletor de planta fica no **Topbar** (barra superior).

- Escolha a planta antes de qualquer outra ação — todos os dados exibidos são filtrados por planta.
- Plantas são cadastradas diretamente no banco (`plants` table) ou via seed (`python -m app.seed`).

---

## 4. Tela Cockpit

**Caminho:** menu lateral → **Cockpit**

Exibe o estado de saúde da planta em tempo real:

| Elemento | O que mostra |
|----------|-------------|
| **Status pill** | `normal` (verde) / `drift` (âmbar) / `NC` (vermelho) — último alerta |
| **KPI cards** | fc∞, k, σ vigentes; número de lotes / ensaios / alertas na semana |
| **Tabela de alertas** | Últimos 10 alertas (tipo, severidade, fc real vs previsto) |
| **Série de resíduos** | Gráfico |resíduo médio|/dia vs 1σ — detecta deriva visual |

**Atualizar:** clique no botão de refresh ou recarregue a página.

---

## 5. Tela Batches (Lotes)

**Caminho:** menu lateral → **Batches**

### Criar lote manualmente

1. Preencha os campos obrigatórios: **ID Externo**, **Data/Hora**, **Temperatura (°C)**, **fck alvo (MPa)**.
2. Clique **Criar Lote**.

### Importar CSV

Formato esperado (cabeçalho obrigatório):

```csv
external_id,occurred_at,target_fck,temperature,water_cement_ratio,admixture_kg_m3,notes
L001,2026-02-20T08:00:00,30.0,22.5,0.50,,Lote piloto
L002,2026-02-21T08:00:00,30.0,24.0,0.48,1.5,
```

1. Clique **Importar CSV** e selecione o arquivo.
2. Os lotes importados aparecem na tabela em segundos.

---

## 6. Tela Ensaio (Resultados de Resistência)

**Caminho:** menu lateral → **Ensaio**

### Registrar ensaio

1. Selecione o **Lote** na lista.
2. Informe **Idade (dias)**, **fc medido (MPa)** e, opcionalmente, n° de CPs, laboratório e observações.
3. Clique **Registrar Resultado**.

### Painel de resultado (lado direito)

Aparece imediatamente após o registro:

| Campo | Descrição |
|-------|-----------|
| **fc medido / fc previsto** | Valor registrado vs predição Arrhenius |
| **Resíduo** | fc medido − fc previsto (MPa) |
| **Barra de resíduo** | Verde ≤ 1σ · Âmbar ≤ 2σ · Vermelho > 2σ |
| **fc∞ / k / σ** | Parâmetros vigentes após este ensaio |
| **Snapshot** | Badge com ID do novo snapshot de calibração |
| **Alertas** | Lista de alertas gerados (NC / DRIFT + severidade) |

---

## 7. Geração de Relatório Semanal PDF

O relatório é gerado via API e armazenado no servidor:

```bash
# Substitua PLANTA-01 pelo ID da planta e a data pelo último dia da semana desejada
curl -b "aion_session=<token>" \
  "http://localhost:8000/api/v1/reports/weekly?plant_id=PLANTA-01&week_end=2026-02-26"
```

O arquivo é salvo em `reports/out/<plant_id>/aion_weekly_<plant_id>_<YYYYMMDD>.pdf`.
O registro do relatório aparece em `GET /api/v1/health/details` (`last_weekly_report` por planta).

---

## 8. Observabilidade

```bash
# Status geral + dados por planta (sem dados sensíveis)
curl -b "aion_session=<token>" http://localhost:8000/api/v1/health/details | python -m json.tool
```

Campos retornados por planta:
- `latest_snapshot`: fc∞, k, σ, n_pairs, model, created_at
- `last_result_at`: timestamp do último ensaio registrado
- `last_alert`: tipo, severidade, created_at do último alerta
- `last_weekly_report`: week_end, created_at, file_path do último PDF

---

## 9. Solução de Problemas Comuns

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| Tela de login não carrega | Container não subiu | `docker compose ps` → `docker compose up -d` |
| Login retorna 401 | Usuário/senha errado no `.env` | Verifique `AION_LOGIN_USER` e `AION_LOGIN_PASS` |
| Planta não aparece no seletor | Planta não cadastrada ou `is_active=false` | `python -m app.seed` ou INSERT direto |
| Ensaio retorna 422 | Campo obrigatório faltando | Verifique `temperature` no lote |
| `alembic check` falha | Drift de schema | Compare `__table_args__` com migration |

---

*Dúvidas e suporte: consulte `docs/backend_quickstart.md` ou abra uma issue no repositório.*
