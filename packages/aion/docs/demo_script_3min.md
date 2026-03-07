# AION CORE — Script de Demo (3 minutos)

Roteiro estruturado para apresentação ao cliente piloto.
Tempo estimado: **2:45 – 3:15 min** com sistema pré-aquecido.

---

## Pré-demo (antes de entrar na sala)

```bash
# 1. Subir o stack (se ainda não estiver rodando)
cd aion && docker compose up -d

# 2. Aguardar ~20 s e verificar saúde
curl -s http://localhost:8000/api/v1/health/details | python -m json.tool
# Esperado: "ok": true, plantas listadas

# 3. Garantir dados de demonstração
python -m app.seed          # cria Batch L001 + Plant PLANTA-01 se não existirem
```

**Abrir no navegador:** `http://localhost:8000/app/`

---

## Roteiro

### 0:00 – 0:20 · Login e contexto

> "O AION é um sistema de monitoramento contínuo de resistência de concreto.
> Tudo começa aqui — tela de login com sessão segura, sem API key exposta no browser."

- Digitar usuário + senha → clicar **Entrar**
- Selecionar **PLANTA-01** no seletor do Topbar

---

### 0:20 – 1:00 · Cockpit — saúde da planta em tempo real

> "O Cockpit é o painel de controle. Em 5 segundos o operador sabe se a planta está normal."

- Apontar o **status pill** (verde = normal, âmbar = deriva, vermelho = NC)
- Mostrar os **KPI cards**: fc∞ vigente, k, σ, total de alertas na semana
- Apontar a **tabela de alertas** (últimos 10 eventos)

> "Cada alerta foi gerado automaticamente pelo motor Arrhenius logo após o registro do ensaio —
> sem intervenção manual."

---

### 1:00 – 1:45 · Ensaio — circuito completo em tempo real

> "Vou registrar um ensaio agora e vocês vão ver o sistema recalibrar ao vivo."

1. Menu → **Ensaio**
2. Selecionar lote **L001**
3. Preencher: Idade = `28`, fc = `32.5` MPa → **Registrar Resultado**
4. Painel direito aparece — apontar:
   - fc previsto pelo modelo Arrhenius
   - **Barra de resíduo** (verde se dentro de 1σ)
   - Novos valores de fc∞, k, σ após recalibração
   - Badge do snapshot gerado

> "O modelo se auto-calibra a cada par 7d/28d. σ é atualizado incrementalmente.
> Se o resíduo ultrapassar 2σ, um alerta DRIFT é emitido automaticamente."

---

### 1:45 – 2:20 · Batches — rastreabilidade de lotes

> "Todo ensaio é amarrado a um lote de produção — rastreabilidade completa."

1. Menu → **Batches**
2. Mostrar a lista (lote L001 com temperatura, data, fck)
3. Opcional: criar um lote novo com 2 cliques → aparece na lista imediatamente

> "Também aceita importação em massa via CSV — útil para migrar histórico existente."

---

### 2:20 – 2:50 · Relatório semanal PDF

> "Toda segunda-feira, o sistema gera automaticamente um relatório PDF da semana."

```bash
# Executar no terminal visível (ou mostrar como job agendado)
curl -b "aion_session=<token>" \
  "http://localhost:8000/api/v1/reports/weekly?plant_id=PLANTA-01"
```

- Abrir o PDF gerado em `reports/out/PLANTA-01/`
- Apontar: KPIs, série de resíduos, tabela de alertas, recomendações automáticas

> "O relatório é auditável — cada geração fica registrada no banco com timestamp e path."

---

### 2:50 – 3:10 · Observabilidade e encerramento

> "Por fim, o endpoint de saúde — para integração com monitoramento externo (Datadog, Zabbix, etc.)"

```bash
curl -s http://localhost:8000/api/v1/health/details | python -m json.tool
```

- Mostrar `last_weekly_report`, `last_result_at`, `latest_snapshot` por planta

> "AION é piloto-ready: Docker, auth, logs estruturados, zero dependência de cloud.
> Dados ficam no servidor da planta — LGPD e segurança da informação endereçados."

---

## Perguntas frequentes esperadas

| Pergunta | Resposta sugerida |
|----------|------------------|
| "Integra com nosso LIMS?" | "Sim — via CSV hoje, via webhook/API REST na próxima sprint." |
| "O modelo funciona para outros traços?" | "Sim — fc∞ e k são calibrados por planta individualmente." |
| "E se a temperatura não for registrada?" | "O sistema aceita o ensaio mas não gera predição — alerta no log." |
| "Quantas plantas suporta?" | "Ilimitado — cada planta tem seus próprios parâmetros e histórico." |
| "Os dados ficam na nuvem?" | "Não por padrão — SQLite local ou Postgres on-premise. Cloud é opcional." |

---

*Arquivo mantido em `docs/demo_script_3min.md` · AION CORE v1.0.0*
