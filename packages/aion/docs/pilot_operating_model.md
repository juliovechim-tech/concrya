# AION Pilot Operating Model (G.1)

## Objetivo
Operar o AION como um "piloto automático" do processo de concreto: prever desempenho, aprender com resultados reais, detectar mudança de regime (drift) e entregar um relatório semanal acionável.

## Escopo do piloto
- Duração recomendada: 30–90 dias
- Escopo inicial: 1–2 plantas (plant_id), com batches e ensaios 7d/28d
- Entregáveis: UI (/app), API (/api/v1), PDF semanal, logs e health/details

## Papéis e responsabilidades

### 1) Sponsor (Decisor)
- Define objetivo do piloto e critérios de sucesso
- Garante acesso a dados e disponibilidade de time
- Decide continuação/expansão ao final do piloto

### 2) Plant Owner (Dono do Processo)
- Responsável pela disciplina operacional diária
- Garante que batches sejam importados/cadastrados corretamente (external_id, data, fck, temperatura, slump)
- Aciona ajustes operacionais quando alertas/recomendações indicarem

### 3) Lab Owner (Dono do Laboratório/Ensaio)
- Garante ensaios consistentes (idade, procedimento, CPs, padrão)
- Registra resultados (7d/28d) no AION com metadados mínimos
- Comunica qualquer anomalia de ensaio (cura, ruptura, lote de CP, etc.)

### 4) Operator (Execução / Rotina)
- Importa CSV de batches (ou cadastra lote)
- Registra ensaios no formulário "Ensaio"
- Confirma geração/entrega do PDF semanal

### 5) AION Admin (TI/Operação)
- Mantém o serviço disponível (VM/Notebook), backups e atualizações
- Garante credenciais seguras (sem default)
- Monitora logs e /api/v1/health/details

## Ritmo operacional (cadência)

### Diariamente (5–10 min)
- Importar/cadastrar batches do dia (ou da semana)
- Registrar ensaios disponíveis (quando houver)
- Verificar Cockpit (status, sigma, alertas)

### Semanal (automático + 15 min de revisão)
- Segunda 07:00: job gera PDF semanal por planta (reports/out/<plant_id>/)
- Segunda 08:00: reunião de 15 min com 3 perguntas:
  1. Processo está estável? (sigma + alertas)
  2. Previsão está boa? (MAE/RMSE steady-state)
  3. Qual ação de melhoria da semana? (1–3 ações objetivas)

### Mensal (30–45 min)
- Revisar métricas agregadas e decidir:
  - manter piloto, expandir plantas, integrar dados (automação), avançar módulos

## Fluxo padrão (do lote ao aprendizado)

```
1) Batch (Lote)
   └─ Criar/importar batch com external_id e plant_id

2) Result (Ensaio)
   └─ Registrar fc_mpa em age_days (7, 28…)

3) AION pipeline (automático)
   ├─ predict()                  → fc_pred e teq
   ├─ run_after_result()         → snapshot + sigma
   └─ check_and_create_alerts()  → DRIFT / NC

4) Output
   ├─ UI atualiza status imediatamente
   └─ PDF semanal consolida KPIs + gráficos + snapshots + alertas
```

## Regras de disciplina (não negociáveis)
- `external_id` único por planta
- `plant_id` sempre preenchido (calibração isolada por planta)
- Resultados devem incluir: `age_days`, `fc_mpa`, CPs (se aplicável), lab (se aplicável)
- Evitar "múltiplas versões" de dados (um lote = uma verdade)

## Dados mínimos recomendados (para entrar em steady-state)
- **MIN_PAIRS:** pelo menos 2 pares 7d/28d por planta para ativar calibração
- **Ideal:** 10–15 pares por mês para estabilizar sigma e reduzir erro

## Comunicação e escalonamento
- **WARN/HIGH/CRITICAL:** Plant Owner é notificado e valida ação
- **Incidente** (falha de serviço): AION Admin aciona restore/backup e registra ocorrência
- **"Data quality"** (resultado suspeito): Lab Owner revisa e confirma

## Evidências do piloto
- PDF semanal (por planta)
- Logs estruturados (`result_processed`)
- `GET /api/v1/health/details` (estado do sistema)
