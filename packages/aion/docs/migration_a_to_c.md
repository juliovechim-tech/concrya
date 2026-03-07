# Migração A → C: Notebook → VM/Cloud

Guia para transferir o piloto de um notebook local para uma VM de produção,
preservando plantas, usuários, relatórios e histórico de calibração.

---

## Pré-requisitos

| Onde | O que precisa estar pronto |
|------|--------------------------|
| **Notebook (origem)** | AION rodando via `docker compose up -d` |
| **VM destino** | Ubuntu 22.04 LTS · 2 vCPU · 4 GB RAM · 40 GB disco |
| **VM destino** | Docker Engine 24+ e Docker Compose Plugin instalados |
| **VM destino** | Porta 80/443 liberada no firewall/security group |
| **DNS (opcional)** | Registro A apontando para o IP da VM |

---

## Passo 1 — Backup no notebook

### 1a. Identificar o banco em uso

```bash
# Verifique o docker-compose.yml / .env
grep DATABASE_URL .env
```

- `sqlite:///./aion.db` → siga a seção **SQLite**
- `postgresql://...`   → siga a seção **Postgres**

---

### 1b-sqlite. Backup SQLite

```bash
# Na raiz do projeto (notebook)
cp aion.db aion_backup_$(date +%Y%m%d).db
```

Transfira o arquivo `.db` para a VM (seção 4).

---

### 1b-pg. Backup Postgres (Docker Compose)

```bash
# Identifica o nome do container Postgres
docker compose ps

# Dump completo (substitua "db" pelo nome do serviço se diferente)
docker compose exec db pg_dump -U postgres aion \
  > aion_backup_$(date +%Y%m%d).sql
```

---

### 1c. Backup dos relatórios PDF gerados

```bash
# Cria tarball da pasta de saída
tar czf reports_backup_$(date +%Y%m%d).tar.gz reports/out/
```

---

## Passo 2 — Preparar a VM

```bash
# Ubuntu 22.04 — instalar Docker
sudo apt update && sudo apt install -y ca-certificates curl gnupg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/usr/share/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli \
  containerd.io docker-compose-plugin

# Adicionar usuário ao grupo docker (evitar sudo)
sudo usermod -aG docker $USER && newgrp docker

# Verificar
docker version && docker compose version
```

---

## Passo 3 — Copiar o projeto para a VM

```bash
# Opção A: rsync direto
rsync -avz --exclude='venv/' --exclude='*.db' --exclude='frontend/node_modules/' \
  --exclude='frontend/dist/' --exclude='.env' \
  /caminho/local/aion/ usuario@IP_VM:/opt/aion/

# Opção B: zip + scp
zip -r aion_src.zip . -x "venv/*" -x "*.db" -x "frontend/node_modules/*" \
  -x "frontend/dist/*" -x ".env"
scp aion_src.zip usuario@IP_VM:/opt/aion/
# Na VM: unzip aion_src.zip
```

---

## Passo 4 — Restaurar dados na VM

### 4a-sqlite → sqlite

```bash
# Copiar backup
scp aion_backup_YYYYMMDD.db usuario@IP_VM:/opt/aion/aion.db
```

### 4b-pg → pg (dump SQL)

```bash
# Copiar dump para a VM
scp aion_backup_YYYYMMDD.sql usuario@IP_VM:/opt/aion/

# Na VM: subir só o Postgres primeiro
cd /opt/aion
docker compose up -d db
sleep 5

# Restaurar
docker compose exec -T db psql -U postgres aion \
  < aion_backup_YYYYMMDD.sql
```

### 4c. Restaurar PDFs

```bash
scp reports_backup_YYYYMMDD.tar.gz usuario@IP_VM:/opt/aion/
# Na VM:
cd /opt/aion && tar xzf reports_backup_YYYYMMDD.tar.gz
```

---

## Passo 5 — Configurar `.env` na VM

```bash
# Na VM
cp .env.example .env
nano .env
```

Campos obrigatórios a alterar:

```env
# Banco (se Postgres)
DATABASE_URL=postgresql://postgres:SUA_SENHA_PG@db:5432/aion

# Auth — NUNCA use os valores abaixo em produção
AION_SESSION_SECRET=gere-com-openssl-rand-hex-32
AION_LOGIN_USER=operador.piloto
AION_LOGIN_PASS=senha-forte-aqui   # qualquer coisa != "admin123"
```

Gerar secret forte:
```bash
openssl rand -hex 32
```

---

## Passo 6 — Subir o stack completo

```bash
cd /opt/aion
docker compose up -d --build
```

Verificar:

```bash
# Health
curl http://localhost:8000/health
# Esperado: {"status": "ok"}

# Detalhes por planta (requer cookie — use -c/-b)
curl -c /tmp/c.txt -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador.piloto","password":"senha-forte-aqui"}'
curl -b /tmp/c.txt http://localhost:8000/api/v1/health/details
```

---

## Passo 7 — HTTPS com Caddy (recomendado)

Caddy obtém e renova certificado TLS automaticamente.

```bash
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:
```
aion.suaempresa.com.br {
    reverse_proxy localhost:8000
}
```

```bash
sudo systemctl reload caddy
```

Acesse `https://aion.suaempresa.com.br/app/` — TLS ativo.

---

## Passo 8 — Job semanal de relatório (cron)

```bash
crontab -e
```

Adicione (toda segunda às 06:00):

```cron
0 6 * * 1 cd /opt/aion && docker compose exec -T app \
  python jobs/weekly_report_job.py >> logs/cron_weekly.log 2>&1
```

Crie a pasta de logs se não existir:
```bash
mkdir -p /opt/aion/logs
```

---

## Passo 9 — Backup automático na VM

```bash
# Cron diário às 02:00 — dump Postgres
0 2 * * * docker compose -f /opt/aion/docker-compose.yml exec -T db \
  pg_dump -U postgres aion \
  > /opt/aion/backups/aion_$(date +\%Y\%m\%d).sql 2>&1

# Manter últimos 30 dias
30 2 * * * find /opt/aion/backups/ -name "*.sql" -mtime +30 -delete
```

```bash
mkdir -p /opt/aion/backups
```

---

## Passo 10 — Validação final

| Teste | Comando / URL | Esperado |
|-------|--------------|---------|
| Stack up | `docker compose ps` | Todos `healthy` / `running` |
| Health | `GET /health` | `{"status":"ok"}` |
| Login UI | `https://domínio/app/` | Tela de login |
| Dados migrados | Cockpit → planta | Histórico preservado |
| PDF | `GET /api/v1/reports/weekly?plant_id=...` | PDF gerado |
| Job cron | `cat logs/cron_weekly.log` | Sem erros |
| TLS | `https://domínio` | Cadeado verde |

---

## Rollback (se necessário)

1. Voltar ao notebook: `docker compose up -d` (banco local intacto)
2. Restaurar backup na VM: repita passo 4
3. O notebook nunca perde dados enquanto `aion.db` / volume Postgres existir

---

*AION CORE v1.0.0 · docs/migration_a_to_c.md*
