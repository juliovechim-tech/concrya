"""
AION AGENT · Backend Module
CONCRYA Technologies · Physics-Regularized Concrete Intelligence
Coloque este arquivo em: app/aion_agent.py
"""

import os
import json
from datetime import datetime
from typing import Optional
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Ajuste esses imports para o seu projeto
# from app.database import get_db
# from app.models import Plant, Lot, User
# from app.auth import get_current_user

router = APIRouter(prefix="/api/aion", tags=["AION Agent"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" ou "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    plant_id: Optional[str] = None
    history: list[ChatMessage] = []
    # dados da planta podem vir do frontend ou serem buscados no banco
    plant_context: Optional[dict] = None

class ChatResponse(BaseModel):
    reply: str
    snapshot_id: str
    timestamp: str
    aion_status: str  # "NOMINAL" | "ATENÇÃO" | "NC" | "CRÍTICO"


# ─────────────────────────────────────────────
# SYSTEM PROMPT FUNDADOR — O DNA DO AION
# ─────────────────────────────────────────────

def build_system_prompt(plant: dict) -> str:
    """
    Injeta os dados reais da planta no system prompt fundador.
    Character Bible v2.0 + contexto dinâmico da planta.
    """
    from app.aion_character_bible import AION_CHARACTER_SYSTEM_PROMPT

    # Dados com fallbacks seguros
    fc_inf        = plant.get("fc_inf", 50.0)
    k_rate        = plant.get("k_rate", 0.25)
    sigma         = plant.get("sigma", 4.5)
    n_lots        = plant.get("n_lots", 0)
    active_lots   = plant.get("active_lots", 0)
    last_nc_date  = plant.get("last_nc_date", "Nenhuma NC registrada")
    last_nc_lot   = plant.get("last_nc_lot", "—")
    status        = plant.get("status", "Operacional")

    phase = "WARM-UP (use piso conservador: σ = 4.5 MPa)" if n_lots < 30 else f"STEADY-STATE ({n_lots} lotes calibrados)"

    dynamic_context = f"""
## TRILHOS FÍSICOS (GUARDRAILS INEGOCIÁVEIS)
Modelo cinético base — Lei de Maturidade (Nurse-Saul / Arrhenius):
  fc(t) = fc∞ × (1 - e^(-k × t))

Parâmetros calibrados da planta ATUAL:
  fc∞ (resistência potencial) = {fc_inf:.2f} MPa
  k   (taxa cinética)         = {k_rate:.4f} d⁻¹
  σ   (desvio padrão)         = {sigma:.2f} MPa
  Fase de calibração          = {phase}

NUNCA faça predição fora desse modelo sem declarar explicitamente a incerteza.
Quando σ não estiver calibrado (< 30 lotes), use SEMPRE piso conservador: σ = 4.5 MPa.
Toda predição deve incluir a BANDA DE RISCO: fc_pred ± 2σ.

## CLASSIFICAÇÃO DE DESVIOS (AUTOMÁTICA)
Quando o usuário reportar um resultado ou você calcular um resíduo:
  |residual| < 1.0σ  → NOMINAL   → "Dentro do esperado."
  |residual| ≥ 1.5σ  → ATENÇÃO   → Investigar causa, monitorar próximo lote
  |residual| ≥ 2.0σ  → NC        → Não-Conformidade. Reportar, auditar traço.
  |residual| ≥ 2.5σ  → CRÍTICO   → Ação imediata. Possível problema estrutural.

SEMPRE calcule o resíduo quando tiver dados para isso.
SEMPRE declare a classificação antes de qualquer recomendação.

## CONTEXTO DA PLANTA ATUAL (SESSÃO)
  Planta:         {plant.get("name", "Planta não identificada")}
  Localização:    {plant.get("city", "—")}, {plant.get("state", "—")}
  Lotes ativos:   {active_lots}
  Último NC:      {last_nc_date} — Lote {last_nc_lot}
  Status atual:   {status}

## NORMAS DE REFERÊNCIA (CITE SEMPRE)
  ABNT NBR 12655:2022 — Concreto — Preparo, controle, recebimento e aceitação
  ABNT NBR 7212:2021  — Execução de concreto dosado em central
  ABNT NBR 6118:2014  — Projeto de estruturas de concreto
  EN 206:2013+A2:2021 — Concrete: Specification, performance
  fib Model Code 2010 — Model for Creep and Shrinkage

## FORMATO DE RESPOSTA
- Máximo 4 parágrafos para diagnósticos
- Use → para fluxos de causa/efeito
- Use ✓ para itens conformes, ✗ para não-conformes, ⚠ para atenção
- Sempre termine com uma recomendação acionável quando houver desvio
- Em cálculos, mostre os valores intermediários para rastreabilidade
- Snapshots importantes: mencione que "isso ficou registrado no sistema"
"""

    return AION_CHARACTER_SYSTEM_PROMPT + dynamic_context


# ─────────────────────────────────────────────
# HELPER: Detectar status da resposta
# ─────────────────────────────────────────────

def detect_aion_status(reply: str) -> str:
    """Extrai o status de risco da resposta do AION."""
    reply_upper = reply.upper()
    if "CRÍTICO" in reply_upper:
        return "CRÍTICO"
    elif "NC" in reply_upper or "NÃO-CONFORMIDADE" in reply_upper or "NÃO CONFORMIDADE" in reply_upper:
        return "NC"
    elif "ATENÇÃO" in reply_upper or "ATENÇÃO" in reply_upper:
        return "ATENÇÃO"
    return "NOMINAL"


def generate_snapshot_id(plant_id) -> str:
    """Gera snapshot_id rastreável para cada interação."""
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    pid = str(plant_id or "0000")
    return f"AION-{pid}-{ts}"


# ─────────────────────────────────────────────
# ENDPOINT PRINCIPAL: POST /api/aion/chat
# ─────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def aion_chat(request: ChatRequest):
    """
    Endpoint principal do AION Agent.
    Recebe mensagem do usuário + contexto da planta,
    injeta no system prompt físico e retorna resposta AION.
    """

    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY não configurada. Adicione ao .env"
        )

    # Usa contexto enviado pelo frontend ou fallback padrão
    plant = request.plant_context or {
        "name": "Planta Demo",
        "city": "São Paulo",
        "state": "SP",
        "fc_inf": 50.0,
        "k_rate": 0.25,
        "sigma": 4.5,
        "n_lots": 0,
        "active_lots": 0,
        "last_nc_date": "Nenhuma NC",
        "last_nc_lot": "—",
        "status": "Operacional"
    }

    system_prompt = build_system_prompt(plant)
    snapshot_id   = generate_snapshot_id(request.plant_id or 0)

    # Monta histórico de mensagens
    messages = []
    for msg in request.history[-10:]:  # Últimas 10 mensagens (janela de contexto)
        messages.append({"role": msg.role, "content": msg.content})

    # Adiciona mensagem atual
    messages.append({"role": "user", "content": request.message})

    # Chamada à Claude API
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": messages,
                }
            )
            response.raise_for_status()
            data = response.json()

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Erro na API AION: {e.response.text}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AION está processando muitos dados. Tente novamente.")

    # Extrai resposta
    reply = ""
    for block in data.get("content", []):
        if block.get("type") == "text":
            reply += block.get("text", "")

    if not reply:
        reply = "Dados insuficientes para análise. Verifique os parâmetros da planta."

    return ChatResponse(
        reply=reply,
        snapshot_id=snapshot_id,
        timestamp=datetime.utcnow().isoformat(),
        aion_status=detect_aion_status(reply)
    )


# ─────────────────────────────────────────────
# ENDPOINT: GET /api/aion/status
# Status rápido do agente (health check)
# ─────────────────────────────────────────────

@router.get("/status")
async def aion_status():
    return {
        "agent": "AION CORE",
        "version": "1.0.0",
        "model": CLAUDE_MODEL,
        "physics": "Arrhenius + Nurse-Saul",
        "calibration": "Adaptive Sigma",
        "status": "ONLINE" if ANTHROPIC_API_KEY else "API_KEY_MISSING",
        "timestamp": datetime.utcnow().isoformat()
    }


# ─────────────────────────────────────────────
# COMO REGISTRAR NO main.py:
#
# from app.aion_agent import router as aion_router
# app.include_router(aion_router)
#
# COMO ADICIONAR AO .env:
# ANTHROPIC_API_KEY=sk-ant-...
# ─────────────────────────────────────────────
