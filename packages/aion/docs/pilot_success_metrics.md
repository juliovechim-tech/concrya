# AION Pilot Success Metrics (G.2)

## Objetivo
Definir critérios objetivos (quantitativos e operacionais) para avaliar o piloto, reduzir subjetividade e permitir decisão de expansão.

## Conceitos
- **Warm-up:** período antes de MIN_PAIRS (calibração ainda não ativa/insuficiente)
- **Steady-state:** após calibração ativa, parâmetros adaptados à planta
- KPI principal deve ser steady-state (warm-up é esperado ter erro maior)

## Métricas de desempenho (por planta)

### 1) Acurácia (principal)

| Métrica | Bom | Excelente |
|---------|-----|-----------|
| MAE_28d (steady-state) | ≤ 3.5 MPa | ≤ 2.5 MPa |
| RMSE_28d (steady-state) | ≤ 5.0 MPa | ≤ 3.5 MPa |

### 2) Estabilidade do processo (saúde)
- `sigma` (effective) e tendência semanal
- Número de alertas por semana (DRIFT / NC)

Metas sugeridas:
- Alertas CRITICAL: 0 na maior parte das semanas
- Alertas totais: baixos e acionáveis (evitar *alert fatigue*)

### 3) Tempo de detecção de mudança (valor operacional)
- Tempo entre "mudança real de processo" e primeiro DRIFT relevante detectado

Meta: detectar antes do "cliente perceber" (qualitativo, mas registrável)

### 4) Cobertura de dados (disciplina)
- batches com ensaio / batches totais (semanal)
- # pares 7/28 acumulados

Meta: aumentar cobertura progressivamente, sem travar operação

## Métricas de operação do sistema (SRE básico)

### 5) Disponibilidade
- `/health` e `/api/v1/health/details` respondem OK
- Uptime semanal sem quedas em horário de operação

Meta: 99% no piloto (ainda sem HA) · PDF semanal sem falha

### 6) Latência (experiência)
- `POST /api/v1/results/strength`: p95 aceitável

Meta: resposta percebida como "instantânea" (< 1 s para piloto local/VM)

### 7) Auditoria e rastreabilidade
- Snapshots por planta sem links inválidos (`bad_links = 0`)
- Logs `result_processed` consistentes com `result_id` e `snapshot_id`

Meta: 0 inconsistências estruturais

## Critério de aprovação do piloto

O piloto é considerado bem-sucedido se, em steady-state, por planta:

- [ ] MAE_28d e RMSE_28d dentro da meta
- [ ] Alertas baixos e acionáveis
- [ ] PDF semanal automático gerado e utilizado em reunião
- [ ] Time opera a rotina sem dependência do notebook do criador (modo C)

## Entregáveis de evidência (para decisão)

- 4 PDFs semanais consecutivos por planta
- Comparação warm-up vs steady-state
- Print do `/api/v1/health/details` com `latest_snapshot` e `last_weekly_report`
- Resumo das ações tomadas e impacto (1 parágrafo por semana)

## Próximos passos após aprovação

- Expandir para 2–5 plantas
- Integrar fonte de dados (ERP / batching system) ou import automatizado
- Iniciar módulo de diagnóstico de causa provável (recomendação inteligente)
