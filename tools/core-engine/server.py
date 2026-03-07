"""
CORE ENGINE NEXUS — Servidor Local v4 (Com Bypass Eletroterm)
Arquitetura: MQTT (paho) + Flask em threads separadas

Instalar dependências:
    pip install flask flask-cors paho-mqtt

Execute: python server.py
Acesse:  http://localhost:5000
"""

import json
import os
import csv
import io
import socket
import threading
import time
from datetime import datetime

import paho.mqtt.client as mqtt
from flask import Flask, jsonify, Response, send_from_directory, request
from flask_cors import CORS

# ════════════════════════════════════════════════
#  CONFIGURAÇÃO CENTRAL
# ════════════════════════════════════════════════
BROKER_HOST  = "broker.hivemq.com"
BROKER_PORT  = 1883
KEEP_ALIVE   = 60          # segundos — crítico para GSM (linha ociosa)
CLIENT_ID    = f"nexus-server-{int(time.time())}"  # ID único por sessão

# TÓPICO ALTERADO PARA ESCUTAR O APARELHO DO PARCEIRO
TOPIC_DADOS  = "eletroterm/data/#" 
TOPIC_CONFIG = "nexus/engine/config"

DATA_FILE    = "dados_sensores.json"
FLASK_PORT   = 5000

# ════════════════════════════════════════════════
#  ESTADO GLOBAL (compartilhado entre threads)
# ════════════════════════════════════════════════
_lock     = threading.Lock()   # mutex para acesso ao JSON
gravando  = False
mqtt_conectado = False
sample_rate_s  = 10            # sample rate atual (segundos)

# ── Utilitários de dados ─────────────────────
def carregar():
    if not os.path.exists(DATA_FILE):
        salvar({"maturidade": [], "calorimetria": [], "reologia": []})
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def salvar(dados):
    with open(DATA_FILE, "w") as f:
        json.dump(dados, f, indent=2)

def ts():
    return datetime.now().isoformat()

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def ip_local():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ════════════════════════════════════════════════
#  MQTT — CALLBACKS
# ════════════════════════════════════════════════
def on_connect(client, userdata, flags, rc):
    global mqtt_conectado
    codigos = {
        0: "Conectado com sucesso",
        1: "Versão de protocolo incorreta",
        2: "Client ID inválido",
        3: "Broker indisponível",
        4: "Usuário/senha incorretos",
        5: "Não autorizado",
    }
    if rc == 0:
        mqtt_conectado = True
        client.subscribe(TOPIC_DADOS, qos=1)
        log(f"✓ MQTT conectado ao broker: {BROKER_HOST}")
        log(f"  Escutando: {TOPIC_DADOS}")
    else:
        mqtt_conectado = False
        log(f"✗ MQTT falha na conexão: {codigos.get(rc, f'rc={rc}')}")


def on_disconnect(client, userdata, rc):
    global mqtt_conectado
    mqtt_conectado = False
    if rc != 0:
        log(f"⚠ MQTT desconectado inesperadamente (rc={rc}) — reconectando...")
    else:
        log("MQTT desconectado normalmente.")


def on_message(client, userdata, msg):
    """Recebe payload do ESP32 Eletroterm, traduz e salva no JSON."""
    global gravando
    if not gravando:
        # Só avisa no log que descartou para não encher a tela
        # log(f"⏸ Mensagem descartada [{msg.topic}] — gravação pausada")
        return

    try:
        # Decodifica o pacote do parceiro
        payload = json.loads(msg.payload.decode("utf-8"))
        
        # Pega a data/hora enviada por ele ou usa a do servidor
        timestamp = payload.get("datetime", ts())

        # Função tradutora: converte 'null' em 0.0
        def get_ch(chave):
            valor = payload.get(chave)
            return float(valor) if valor is not None else 0.0

        with _lock:
            dados = carregar()
            
            # Calcula o tempo decorrido no eixo X baseado na quantidade de pontos lidos
            n_pontos = len(dados["maturidade"])
            tempo_s = n_pontos * sample_rate_s
            tempo_h = round(tempo_s / 3600.0, 4)

            # Traduz os canais para Maturidade (assumindo ch1 a ch4)
            dados["maturidade"].append({
                "timestamp": timestamp,
                "tempo_h":   tempo_h,
                "ch1": get_ch('ch1_c'),
                "ch2": get_ch('ch2_c'),
                "ch3": get_ch('ch3_c'),
                "ch4": get_ch('ch4_c'),
            })

            # Traduz os canais para Calorimetria (assumindo ch5 a ch8)
            dados["calorimetria"].append({
                "timestamp": timestamp,
                "tempo_h":   tempo_h,
                "ch1": get_ch('ch5_c'),
                "ch2": get_ch('ch6_c'),
                "ch3": get_ch('ch7_c'),
                "ch4": get_ch('ch8_c'),
            })

            # Força Reologia para zero (para não quebrar o gráfico)
            dados["reologia"].append({
                "timestamp": timestamp,
                "tempo_s":   tempo_s,
                "amperagem": 0.0,
            })

            salvar(dados)

        bateria = payload.get("bat", "--")
        sinal = payload.get("signal", "--")
        log(f"✓ ELETROTERM salvo | ponto #{n_pontos + 1} | tempo={tempo_h}h | bat={bateria}% sinal={sinal}")

        # Push webhook para CORE MIX PRO (ThermoCore)
        _enviar_webhook("maturidade", {
            "timestamp": timestamp,
            "tempo_h": tempo_h,
            "ch1": get_ch('ch1_c'), "ch2": get_ch('ch2_c'),
            "ch3": get_ch('ch3_c'), "ch4": get_ch('ch4_c'),
        })

    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        log(f"✗ Erro ao processar mensagem MQTT: {e} | payload: {msg.payload[:120]}")


def on_publish(client, userdata, mid):
    log(f"  → Comando publicado (mid={mid})")


# ════════════════════════════════════════════════
#  MQTT — THREAD
# ════════════════════════════════════════════════
def mqtt_thread():
    """Roda o loop MQTT em thread separada com reconexão automática."""
    while True:
        client = mqtt.Client(client_id=CLIENT_ID, clean_session=True)
        client.on_connect    = on_connect
        client.on_disconnect = on_disconnect
        client.on_message    = on_message
        client.on_publish    = on_publish

        # Keep-alive agressivo para GSM (evita timeout do operador)
        client.keepalive = KEEP_ALIVE

        try:
            log(f"Conectando ao broker MQTT: {BROKER_HOST}:{BROKER_PORT}...")
            client.connect(BROKER_HOST, BROKER_PORT, keepalive=KEEP_ALIVE)
            # Armazena referência global para o Flask publicar comandos
            global _mqtt_client
            _mqtt_client = client
            client.loop_forever()   # bloqueia — reconecta automaticamente
        except Exception as e:
            log(f"✗ Falha MQTT: {e} — aguardando 10s para reconectar...")
            time.sleep(10)

_mqtt_client = None   # preenchido pela thread MQTT


# ════════════════════════════════════════════════
#  FLASK — APP
# ════════════════════════════════════════════════
app = Flask(__name__, static_folder=".")
CORS(app)


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


# ── GET dados + estado ────────────────────────
@app.route("/api/dados", methods=["GET"])
def obter_dados():
    with _lock:
        d = carregar()
    d["_gravando"]      = gravando
    d["_mqtt_conectado"] = mqtt_conectado
    d["_sample_rate"]   = sample_rate_s
    return jsonify(d)


# ── Toggle / set gravação + publica config ─────
@app.route("/api/gravacao", methods=["POST", "GET"])
def api_gravacao():
    global gravando
    if request.method == "POST":
        body = request.get_json(silent=True) or {}
        gravando = bool(body["gravando"]) if "gravando" in body else not gravando
        _publicar_config()
        log(f"Estado: {'▶ GRAVANDO' if gravando else '⏸ PAUSADO'}")
    return jsonify({"gravando": gravando})


# ── Atualiza sample rate + publica config ──────
@app.route("/api/samplerate", methods=["POST"])
def api_samplerate():
    global sample_rate_s
    body = request.get_json(silent=True) or {}
    sr = body.get("sample_rate_s")
    if sr and isinstance(sr, (int, float)) and 1 <= sr <= 3600:
        sample_rate_s = int(sr)
        _publicar_config()
        log(f"Sample rate: {sample_rate_s}s")
        return jsonify({"sample_rate_s": sample_rate_s})
    return jsonify({"erro": "sample_rate_s deve ser inteiro entre 1 e 3600"}), 400


def _publicar_config():
    """Publica comando de config para o ESP32 via MQTT (downlink)."""
    if _mqtt_client and mqtt_conectado:
        payload = json.dumps({
            "gravando":      gravando,
            "sample_rate_s": sample_rate_s
        })
        _mqtt_client.publish(TOPIC_CONFIG, payload, qos=1, retain=True)
        log(f"→ Config publicada: gravando={gravando} sample_rate={sample_rate_s}s")
    else:
        log("⚠ Config não publicada — MQTT offline")


# ── Exportar CSV ──────────────────────────────
@app.route("/api/exportar", methods=["GET"])
def exportar_csv():
    with _lock:
        dados = carregar()

    mat = dados.get("maturidade",   [])
    cal = dados.get("calorimetria", [])
    reo = dados.get("reologia",     [])
    max_len = max(len(mat), len(cal), len(reo), 1)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "Tempo_h",
        "Mat_CH1", "Mat_CH2", "Mat_CH3", "Mat_CH4",
        "Cal_CH1", "Cal_CH2", "Cal_CH3", "Cal_CH4",
        "Reo_Tempo_s", "Reo_Amp"
    ])

    for i in range(max_len):
        m = mat[i] if i < len(mat) else {}
        c = cal[i] if i < len(cal) else {}
        r = reo[i] if i < len(reo) else {}
        writer.writerow([
            m.get("timestamp") or c.get("timestamp") or r.get("timestamp") or "",
            m.get("tempo_h") or c.get("tempo_h") or "",
            m.get("ch1",""), m.get("ch2",""), m.get("ch3",""), m.get("ch4",""),
            c.get("ch1",""), c.get("ch2",""), c.get("ch3",""), c.get("ch4",""),
            r.get("tempo_s",""), r.get("amperagem",""),
        ])

    csv_bytes = output.getvalue().encode("utf-8-sig")
    nome = f"ensaio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    log(f"📥 CSV exportado: {nome} ({max_len} linhas)")
    return Response(csv_bytes, mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={nome}"})


# ── Webhook push para Next.js CORE MIX PRO ────
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "http://localhost:3000/api/nexus")
WEBHOOK_ENABLED = os.environ.get("WEBHOOK_ENABLED", "false").lower() == "true"

@app.route("/api/webhook", methods=["POST", "GET"])
def api_webhook():
    """Configura ou consulta o webhook push para CORE MIX PRO."""
    global WEBHOOK_ENABLED, WEBHOOK_URL
    if request.method == "POST":
        body = request.get_json(silent=True) or {}
        if "enabled" in body:
            WEBHOOK_ENABLED = bool(body["enabled"])
        if "url" in body:
            WEBHOOK_URL = body["url"]
        log(f"Webhook: {'ATIVO' if WEBHOOK_ENABLED else 'INATIVO'} → {WEBHOOK_URL}")
    return jsonify({
        "enabled": WEBHOOK_ENABLED,
        "url": WEBHOOK_URL
    })


def _enviar_webhook(tipo, dados):
    """Envia leitura para CORE MIX PRO via webhook (fire-and-forget)."""
    if not WEBHOOK_ENABLED:
        return
    try:
        import urllib.request
        payload = json.dumps({"tipo": tipo, **dados}).encode("utf-8")
        req = urllib.request.Request(
            WEBHOOK_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req, timeout=2)
    except Exception as e:
        log(f"⚠ Webhook falhou: {e}")


# ── Limpar dados ──────────────────────────────
@app.route("/api/limpar", methods=["POST"])
def limpar():
    with _lock:
        salvar({"maturidade": [], "calorimetria": [], "reologia": []})
    log("⚠ Dados limpos — novo ensaio")
    return jsonify({"status": "limpo"}), 200


# ── Simulador (testes sem ESP32) ──────────────
@app.route("/api/simular", methods=["POST"])
def simular():
    import random, math
    with _lock:
        dados = carregar()
        n   = len(dados["maturidade"])
        t_h = round(n * 0.25, 3)
        t_s = round(n * 900, 1)

        def r(base, amp=0.5):
            return round(base + random.uniform(-amp, amp), 2)

        base_mat = 20 + 18 * math.exp(-((t_h - 8)**2) / 30)
        dados["maturidade"].append({
            "timestamp": ts(), "tempo_h": t_h,
            "ch1": r(base_mat),     "ch2": r(base_mat - 1.2),
            "ch3": r(base_mat+0.8), "ch4": r(base_mat - 0.5),
        })
        base_cal = 20 + 10 * math.exp(-((t_h - 6)**2) / 20)
        dados["calorimetria"].append({
            "timestamp": ts(), "tempo_h": t_h,
            "ch1": r(base_cal,0.3),     "ch2": r(base_cal-0.5,0.3),
            "ch3": r(base_cal+0.3,0.3), "ch4": r(base_cal-0.2,0.3),
        })
        amp_base = 2.0 + 3.0 * (1 - math.exp(-t_h / 10))
        dados["reologia"].append({
            "timestamp": ts(), "tempo_s": t_s,
            "amperagem": r(amp_base, 0.15),
        })
        salvar(dados)
    log(f"⚡ Simulado ponto #{n+1} (t={t_h}h)")
    return jsonify({"status": "simulado", "ponto": n + 1}), 200


# ════════════════════════════════════════════════
#  MAIN — inicia as duas threads
# ════════════════════════════════════════════════
if __name__ == "__main__":
    ip = ip_local()

    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║        CORE ENGINE NEXUS — Servidor v4               ║")
    print("║    Flask + MQTT · 4×TipoK · 4×DS18B20 · Ampere       ║")
    print("╠══════════════════════════════════════════════════════╣")
    print(f"║  Dashboard :  http://localhost:{FLASK_PORT}                  ║")
    print(f"║  IP na rede:  http://{ip:<32}║")
    print(f"║  Broker MQTT: {BROKER_HOST}:{BROKER_PORT}           ║")
    print(f"║  Tópico ↑   : {TOPIC_DADOS:<38}║")
    print(f"║  Tópico ↓   : {TOPIC_CONFIG:<38}║")
    print("╠══════════════════════════════════════════════════════╣")
    print("║  Gravação inicia PAUSADA — pressione ▶ no painel     ║")
    print("║  Ctrl+C para encerrar                                ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()

    # Thread MQTT (daemon = encerra junto com o processo principal)
    t = threading.Thread(target=mqtt_thread, daemon=True)
    t.start()

    # Flask na thread principal (use_reloader=False é obrigatório com threads)
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False, use_reloader=False)