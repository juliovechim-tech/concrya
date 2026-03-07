/**
 * AION INTEGRATION GUIDE
 * ═══════════════════════════════════════════════════════════
 * CONCRYA Technologies · Como integrar o AION Agent no Cockpit
 * ═══════════════════════════════════════════════════════════
 *
 * ARQUIVOS A CRIAR:
 *   app/aion_agent.py          ← Backend (já criado)
 *   frontend/src/components/AIONChat.jsx  ← Componente (já criado)
 *
 * ─────────────────────────────────────────────────────────────
 * PASSO 1: .env — Adicionar chave da API
 * ─────────────────────────────────────────────────────────────
 *
 *   # .env (na raiz do projeto)
 *   AION_LOGIN_USER=admin
 *   AION_LOGIN_PASS=SuaSenhaSegura@2025
 *   ANTHROPIC_API_KEY=sk-ant-api03-...    ← NOVA LINHA
 *
 *   Obtenha a chave em: https://console.anthropic.com
 *
 * ─────────────────────────────────────────────────────────────
 * PASSO 2: app/main.py — Registrar o router do AION
 * ─────────────────────────────────────────────────────────────
 *
 *   # Adicione no topo do main.py:
 *   from app.aion_agent import router as aion_router
 *
 *   # Adicione depois de criar o app FastAPI:
 *   app.include_router(aion_router)
 *
 * ─────────────────────────────────────────────────────────────
 * PASSO 3: Instalar dependência
 * ─────────────────────────────────────────────────────────────
 *
 *   pip install httpx
 *   (httpx já pode estar instalado, mas confirme)
 *
 * ─────────────────────────────────────────────────────────────
 * PASSO 4: frontend/src/App.jsx — Adicionar botão + chat
 * ─────────────────────────────────────────────────────────────
 *
 * Cole o trecho abaixo no seu App.jsx:
 */

// ═══════════ COLE ISSO NO SEU App.jsx ═══════════

/*
// 1. Import no topo:
import { useState } from "react";
import AIONChat from "./components/AIONChat";

// 2. Dentro do componente App, adicione o estado:
const [aionOpen, setAionOpen] = useState(false);

// 3. Dados da planta atual (adapte para os seus dados reais):
const plantContext = {
  id:      currentPlant?.id    || 1,
  name:    currentPlant?.name  || "Planta Demo",
  city:    currentPlant?.city  || "Blumenau",
  state:   currentPlant?.state || "SC",
  fc_inf:  currentPlant?.fc_inf  || 55.0,
  k_rate:  currentPlant?.k_rate  || 0.25,
  sigma:   currentPlant?.sigma   || 3.0,
  n_lots:  currentPlant?.n_lots  || 0,
  active_lots: currentPlant?.active_lots || 0,
  last_nc_date: currentPlant?.last_nc_date || "Nenhuma",
  last_nc_lot:  currentPlant?.last_nc_lot  || "—",
  status:  currentPlant?.status || "Operacional",
};

// 4. No JSX, adicione o botão flutuante AION (canto inferior direito):
*/

export function AIBNButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Falar com AION"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 999,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #060D18, #0A1628)",
        border: "1px solid rgba(201,168,76,0.4)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 20px rgba(0,194,203,0.3), 0 4px 20px rgba(0,0,0,0.5)",
        transition: "all 0.3s",
        fontFamily: "'Cinzel', serif",
        fontSize: "1rem",
        fontWeight: 700,
        color: "#C9A84C",
        letterSpacing: "0.05em",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 0 30px rgba(0,194,203,0.5), 0 4px 30px rgba(0,0,0,0.6)";
        e.currentTarget.style.transform = "scale(1.08)";
        e.currentTarget.style.borderColor = "rgba(0,194,203,0.6)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 0 20px rgba(0,194,203,0.3), 0 4px 20px rgba(0,0,0,0.5)";
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)";
      }}
    >
      A
    </button>
  );
}

/*
// 5. No return do App.jsx, antes do fechamento </div> principal:

  <AIBNButton onClick={() => setAionOpen(true)} />

  <AIONChat
    plantContext={plantContext}
    isOpen={aionOpen}
    onClose={() => setAionOpen(false)}
  />

*/

// ─────────────────────────────────────────────────────────────
// TESTE RÁPIDO — Verificar se o endpoint está funcionando:
// ─────────────────────────────────────────────────────────────
//
//   GET  http://localhost:8080/api/aion/status
//   → Deve retornar: { "agent": "AION CORE", "status": "ONLINE" }
//
//   POST http://localhost:8080/api/aion/chat
//   Body: {
//     "message": "AION, qual a previsão de fc28 para fc7 = 28 MPa?",
//     "plant_context": {
//       "name": "Planta Teste",
//       "fc_inf": 50.0, "k_rate": 0.25, "sigma": 4.5, "n_lots": 0
//     }
//   }
//   → AION deve responder com física, cálculo e recomendação.
//
// ─────────────────────────────────────────────────────────────
// ESTRUTURA FINAL DO PROJETO APÓS INTEGRAÇÃO:
// ─────────────────────────────────────────────────────────────
//
//   C:\dev\aion\
//   ├── app\
//   │   ├── main.py              ← + include_router(aion_router)
//   │   ├── aion_agent.py        ← NOVO (backend AION)
//   │   └── auth.py
//   ├── frontend\
//   │   └── src\
//   │       ├── App.jsx          ← + botão + AIONChat
//   │       ├── components\
//   │       │   └── AIONChat.jsx ← NOVO (interface AION)
//   │       └── api.js
//   ├── .env                     ← + ANTHROPIC_API_KEY
//   └── aion.db
//
// ─────────────────────────────────────────────────────────────
// CUSTO ESTIMADO (para planejamento):
// ─────────────────────────────────────────────────────────────
//   Claude Sonnet 4: ~$3/M tokens input, ~$15/M tokens output
//   Sessão típica AION: ~800 tokens input + ~400 output = ~$0.009
//   50 sessões/mês/cliente: ~$0.45/mês de custo de API
//   Receita Tier Starter: R$297/mês
//   Margem bruta do AION Agent: >99%
// ─────────────────────────────────────────────────────────────
