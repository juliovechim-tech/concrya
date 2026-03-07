/**
 * AIONChat.jsx — Componente do Agente AION
 * CONCRYA Technologies · Physics-Regularized Concrete Intelligence
 *
 * Coloque em: frontend/src/components/AIONChat.jsx
 *
 * Dependências: já inclusas no projeto React/Vite
 * CSS: usa variáveis do tema CONCRYA (adapte se necessário)
 */

import { useState, useRef, useEffect } from "react";

// ─── STATUS COLORS ────────────────────────────────────────────
const STATUS_CONFIG = {
  NOMINAL:  { color: "#00E08A", label: "NOMINAL",  bg: "rgba(0,224,138,0.08)"  },
  ATENÇÃO:  { color: "#F0D080", label: "ATENÇÃO",  bg: "rgba(240,208,128,0.08)" },
  NC:       { color: "#FF8C42", label: "NC",        bg: "rgba(255,140,66,0.08)" },
  CRÍTICO:  { color: "#FF4B4B", label: "CRÍTICO",  bg: "rgba(255,75,75,0.1)"   },
};

// ─── MENSAGENS INICIAIS DO AION ───────────────────────────────
const WELCOME_MESSAGES = [
  "Motor de Predição Física online.",
  "Parâmetros da planta carregados.",
  "Trilhos físicos calibrados.",
  "Pronto para análise.",
];

// ─── SUGESTÕES RÁPIDAS ────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  "Analisa o último lote",
  "Qual a previsão de fc28?",
  "Tem alguma NC pendente?",
  "Como está o sigma da planta?",
  "O que é drift detection?",
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function AIONChat({ plantContext, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState("NOMINAL");
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Inicialização com mensagens de boot
  useEffect(() => {
    if (isOpen && !initialized) {
      setInitialized(true);
      let delay = 0;
      WELCOME_MESSAGES.forEach((msg, i) => {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `boot-${i}`,
            role: "system",
            content: msg,
            timestamp: new Date().toISOString(),
          }]);
        }, delay);
        delay += 300;
      });
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: "welcome",
          role: "assistant",
          content: `AION ativo para **${plantContext?.name || "planta"}**.\n\nParâmetros calibrados: fc∞ = ${plantContext?.fc_inf || 50}MPa · k = ${plantContext?.k_rate || 0.25}d⁻¹ · σ = ${plantContext?.sigma || 4.5}MPa.\n\nPergunta, manda dado, ou me diz o que está acontecendo na planta. Sem achismo aqui.`,
          timestamp: new Date().toISOString(),
          snapshot_id: "AION-INIT",
          aion_status: "NOMINAL",
        }]);
      }, delay + 200);
    }
  }, [isOpen, initialized, plantContext]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus no input quando abre
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 400);
  }, [isOpen]);

  // ─── ENVIO DE MENSAGEM ──────────────────────────────────────
  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput("");
    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Histórico para API (só mensagens user/assistant)
    const history = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/aion/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          plant_id: plantContext?.id || null,
          plant_context: plantContext || null,
          history,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: `aion-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: data.timestamp,
        snapshot_id: data.snapshot_id,
        aion_status: data.aion_status,
      }]);

      setStatus(data.aion_status);

    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "error",
        content: `Falha na comunicação com AION. Verifique a conexão.\n\nErro: ${err.message}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.NOMINAL;

  if (!isOpen) return null;

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.aionOrb}>
              <div style={{...styles.orbCore, animation: "orbPulse 2s ease-in-out infinite"}} />
            </div>
            <div>
              <div style={styles.headerTitle}>AION</div>
              <div style={styles.headerSub}>Motor de Predição Física · CONCRYA</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={{...styles.statusBadge, color: sc.color, background: sc.bg, border: `1px solid ${sc.color}40`}}>
              <span style={{width:6, height:6, borderRadius:"50%", background: sc.color, display:"inline-block", marginRight:6, animation: status !== "NOMINAL" ? "blink 1s infinite" : "none"}} />
              {sc.label}
            </div>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* PLANT INFO BAR */}
        {plantContext && (
          <div style={styles.plantBar}>
            <span style={styles.plantInfo}>📍 {plantContext.name}</span>
            <span style={styles.plantInfo}>fc∞ {plantContext.fc_inf}MPa</span>
            <span style={styles.plantInfo}>σ {plantContext.sigma}MPa</span>
            <span style={styles.plantInfo}>k {plantContext.k_rate}d⁻¹</span>
          </div>
        )}

        {/* MESSAGES */}
        <div style={styles.messages}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK SUGGESTIONS */}
        {messages.length <= 2 && (
          <div style={styles.suggestions}>
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button key={i} style={styles.suggestion} onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* INPUT */}
        <div style={styles.inputArea}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunta, manda dado, ou descreve o que está acontecendo..."
            style={styles.input}
            rows={2}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              ...styles.sendBtn,
              opacity: loading || !input.trim() ? 0.4 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? <LoadingDots /> : "→"}
          </button>
        </div>

        {/* FOOTER */}
        <div style={styles.footer}>
          <span>Physics-Regularized · Arrhenius + Nurse-Saul</span>
          <span style={{color: "rgba(0,194,203,0.5)"}}>AION CORE v1.0</span>
        </div>

      </div>

      <style>{`
        @keyframes orbPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,194,203,0.4), 0 0 12px rgba(0,194,203,0.6); }
          50%      { box-shadow: 0 0 0 8px rgba(0,194,203,0), 0 0 24px rgba(0,194,203,0.8); }
        }
        @keyframes blink {
          0%,100% { opacity:1 } 50% { opacity:0.3 }
        }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(8px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .aion-msg { animation: fadeUp 0.3s ease both; }
        textarea:focus { outline: none; border-color: rgba(0,194,203,0.5) !important; }
        textarea::placeholder { color: rgba(122,143,168,0.5); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser      = msg.role === "user";
  const isSystem    = msg.role === "system";
  const isError     = msg.role === "error";
  const sc          = STATUS_CONFIG[msg.aion_status] || null;

  if (isSystem) {
    return (
      <div className="aion-msg" style={styles.systemMsg}>
        <span style={{color:"rgba(0,194,203,0.4)", marginRight:8}}>›</span>
        {msg.content}
      </div>
    );
  }

  return (
    <div className="aion-msg" style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10,
      marginBottom: 16,
      alignItems: "flex-start",
    }}>
      {/* Avatar */}
      {!isUser && (
        <div style={styles.aionAvatar}>A</div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: "78%",
        background: isUser
          ? "rgba(201,168,76,0.08)"
          : isError
          ? "rgba(255,75,75,0.06)"
          : "rgba(0,194,203,0.04)",
        border: isUser
          ? "1px solid rgba(201,168,76,0.25)"
          : isError
          ? "1px solid rgba(255,75,75,0.2)"
          : "1px solid rgba(0,194,203,0.15)",
        borderRadius: 4,
        padding: "12px 16px",
      }}>
        {/* Status badge na resposta AION */}
        {!isUser && !isError && sc && msg.aion_status !== "NOMINAL" && (
          <div style={{
            display:"inline-flex", alignItems:"center", gap:6,
            fontSize:"0.6rem", letterSpacing:"0.3em", fontFamily:"'Space Mono',monospace",
            color: sc.color, background: sc.bg,
            border: `1px solid ${sc.color}40`,
            padding:"2px 8px", borderRadius:2, marginBottom:8,
          }}>
            <span style={{width:5,height:5,borderRadius:"50%",background:sc.color,display:"inline-block"}} />
            {sc.label}
          </div>
        )}

        {/* Content com markdown básico */}
        <div style={{
          fontSize: "0.95rem",
          lineHeight: 1.7,
          color: isUser ? "#E8EEF5" : "#C8D8E8",
          fontFamily: "'Rajdhani', sans-serif",
          whiteSpace: "pre-wrap",
        }}>
          <MarkdownText text={msg.content} />
        </div>

        {/* Snapshot ID */}
        {msg.snapshot_id && msg.snapshot_id !== "AION-INIT" && (
          <div style={{
            marginTop:8, fontFamily:"'Space Mono',monospace",
            fontSize:"0.55rem", color:"rgba(122,143,168,0.4)",
            letterSpacing:"0.2em",
          }}>
            {msg.snapshot_id}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MARKDOWN SIMPLES ─────────────────────────────────────────
function MarkdownText({ text }) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{color:"#E8EEF5", fontWeight:700}}>{part.slice(2,-2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} style={{fontFamily:"'Space Mono',monospace", fontSize:"0.85em", color:"#00C2CB", background:"rgba(0,194,203,0.08)", padding:"1px 6px", borderRadius:2}}>{part.slice(1,-1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── TYPING INDICATOR ─────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="aion-msg" style={{display:"flex", gap:10, alignItems:"center", marginBottom:12}}>
      <div style={styles.aionAvatar}>A</div>
      <div style={{
        background:"rgba(0,194,203,0.04)", border:"1px solid rgba(0,194,203,0.15)",
        borderRadius:4, padding:"12px 16px", display:"flex", gap:5, alignItems:"center",
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:6, height:6, borderRadius:"50%", background:"rgba(0,194,203,0.6)",
            animation:`blink 1.2s ease-in-out ${i*0.2}s infinite`,
            display:"inline-block",
          }} />
        ))}
        <span style={{marginLeft:8, fontSize:"0.75rem", color:"rgba(0,194,203,0.5)", fontFamily:"'Space Mono',monospace", letterSpacing:"0.2em"}}>
          PROCESSANDO
        </span>
      </div>
    </div>
  );
}

function LoadingDots() {
  return <span style={{letterSpacing:2}}>···</span>;
}

// ─── STYLES ───────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(3,8,15,0.7)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
    padding: "1rem",
  },
  panel: {
    width: "min(480px, 100%)",
    height: "min(680px, 90vh)",
    background: "#060D18",
    border: "1px solid rgba(201,168,76,0.2)",
    borderRadius: 4,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 0 60px rgba(0,194,203,0.1), 0 0 120px rgba(201,168,76,0.05)",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1rem 1.2rem",
    borderBottom: "1px solid rgba(201,168,76,0.12)",
    background: "rgba(0,0,0,0.3)",
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  aionOrb: {
    width: 36, height: 36, borderRadius: "50%",
    border: "1px solid rgba(0,194,203,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,194,203,0.05)",
    flexShrink: 0,
  },
  orbCore: {
    width: 14, height: 14, borderRadius: "50%",
    background: "radial-gradient(circle, #00C2CB, #007A80)",
  },
  headerTitle: {
    fontFamily: "'Cinzel', serif", fontSize: "1rem", fontWeight: 700,
    color: "#C9A84C", letterSpacing: "0.15em",
  },
  headerSub: {
    fontFamily: "'Space Mono', monospace", fontSize: "0.5rem",
    letterSpacing: "0.3em", color: "rgba(122,143,168,0.6)", textTransform: "uppercase",
  },
  statusBadge: {
    fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
    letterSpacing: "0.3em", padding: "3px 10px", borderRadius: 2,
    textTransform: "uppercase", display: "flex", alignItems: "center",
  },
  closeBtn: {
    background: "transparent", border: "1px solid rgba(122,143,168,0.2)",
    color: "rgba(122,143,168,0.6)", cursor: "pointer", borderRadius: 2,
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.75rem", transition: "all 0.2s",
  },
  plantBar: {
    display: "flex", gap: 16, padding: "8px 1.2rem",
    borderBottom: "1px solid rgba(0,194,203,0.08)",
    background: "rgba(0,194,203,0.02)",
    flexShrink: 0, flexWrap: "wrap",
  },
  plantInfo: {
    fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
    letterSpacing: "0.2em", color: "rgba(0,194,203,0.5)", textTransform: "uppercase",
  },
  messages: {
    flex: 1, overflowY: "auto", padding: "1rem 1.2rem",
  },
  systemMsg: {
    fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
    letterSpacing: "0.3em", color: "rgba(0,194,203,0.35)",
    padding: "4px 0", textTransform: "uppercase",
  },
  aionAvatar: {
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
    background: "rgba(0,194,203,0.1)", border: "1px solid rgba(0,194,203,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Cinzel', serif", fontSize: "0.7rem",
    color: "#00C2CB", fontWeight: 700,
  },
  suggestions: {
    display: "flex", gap: 6, padding: "0 1.2rem 0.8rem", flexWrap: "wrap", flexShrink: 0,
  },
  suggestion: {
    fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
    letterSpacing: "0.15em", color: "rgba(0,194,203,0.6)",
    background: "rgba(0,194,203,0.04)", border: "1px solid rgba(0,194,203,0.2)",
    borderRadius: 2, padding: "5px 10px", cursor: "pointer",
    transition: "all 0.2s", whiteSpace: "nowrap",
  },
  inputArea: {
    display: "flex", gap: 8, padding: "0.8rem 1.2rem",
    borderTop: "1px solid rgba(201,168,76,0.12)",
    background: "rgba(0,0,0,0.2)",
    flexShrink: 0,
  },
  input: {
    flex: 1, background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(201,168,76,0.2)", borderRadius: 2,
    color: "#E8EEF5", padding: "10px 14px",
    fontFamily: "'Rajdhani', sans-serif", fontSize: "0.95rem",
    resize: "none", lineHeight: 1.5,
    transition: "border-color 0.2s",
  },
  sendBtn: {
    width: 44, borderRadius: 2,
    background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(0,194,203,0.15))",
    border: "1px solid rgba(201,168,76,0.3)",
    color: "#C9A84C", cursor: "pointer",
    fontFamily: "'Cinzel', serif", fontSize: "1.1rem",
    transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  footer: {
    display: "flex", justifyContent: "space-between",
    padding: "6px 1.2rem",
    fontFamily: "'Space Mono', monospace", fontSize: "0.5rem",
    letterSpacing: "0.2em", color: "rgba(122,143,168,0.3)",
    borderTop: "1px solid rgba(255,255,255,0.03)",
    flexShrink: 0,
  },
};
