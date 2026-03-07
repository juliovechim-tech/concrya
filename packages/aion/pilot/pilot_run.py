"""
pilot/pilot_run.py
CONCRYA AION — Script de Piloto (30 lotes)

Importa lotes via CSV e posta resultados de ensaio pela API real.
Ao final imprime KPIs básicos: MAE, RMSE, contagem de alertas.

Uso:
    python -m pilot.pilot_run

Variáveis de ambiente:
    AION_API          URL base da API   (default: http://127.0.0.1:8000)
    AION_BATCHES_CSV  caminho do CSV    (default: pilot/data/batches.csv)
    AION_RESULTS_CSV  caminho do CSV    (default: pilot/data/results_strength.csv)
"""

from __future__ import annotations

import csv
import json
import os
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from math import sqrt


API = os.getenv("AION_API", "http://127.0.0.1:8000")
BATCHES_CSV = os.getenv("AION_BATCHES_CSV", "pilot/data/batches.csv")
RESULTS_CSV = os.getenv("AION_RESULTS_CSV", "pilot/data/results_strength.csv")


# ── HTTP helpers (stdlib — sem requests) ─────────────────────────

def _request(method: str, path: str, payload: dict | None = None) -> dict:
    url = API + path
    data = json.dumps(payload).encode() if payload else None
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="ignore")
        if e.code == 409:
            return {"_skipped": True}
        print(f"  HTTP {e.code} {method} {path}: {body[:200]}", file=sys.stderr)
        raise


def _post(path: str, payload: dict) -> dict:
    return _request("POST", path, payload)


def _get(path: str) -> dict:
    return _request("GET", path)


# ── CSV helpers ───────────────────────────────────────────────────

def _f(val) -> float | None:
    try:
        return float(val) if val not in (None, "", "null") else None
    except (ValueError, TypeError):
        return None


def _load_csv(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


# ── Etapas ───────────────────────────────────────────────────────

def step_import_batches() -> int:
    print("\n[1/3] Importando lotes...")
    rows = _load_csv(BATCHES_CSV)
    created = skipped = 0
    for row in rows:
        payload = {
            "external_id": row["external_id"].strip(),
            "occurred_at": row.get("occurred_at") or None,
            "target_fck": _f(row.get("target_fck")),
            "temperature": _f(row.get("temperature")),
            "added_water": _f(row.get("added_water")),
            "aggregate_moisture": _f(row.get("aggregate_moisture")),
            "target_slump": _f(row.get("target_slump")),
            "slump_measured": _f(row.get("slump_measured")),
            "notes": row.get("notes") or None,
        }
        result = _post("/api/v1/batches", payload)
        if result.get("_skipped"):
            skipped += 1
        else:
            created += 1
    print(f"  Criados: {created} | Já existiam: {skipped}")
    return created + skipped


def step_post_results() -> list[dict]:
    print("\n[2/3] Postando resultados de ensaio...")
    rows = _load_csv(RESULTS_CSV)

    # ordena por lote e idade para ensaios 7d antes de 28d
    by_ext: dict[str, list] = defaultdict(list)
    for row in rows:
        by_ext[row["external_id"].strip()].append(row)

    outcomes = []
    for ext, entries in sorted(by_ext.items()):
        for row in sorted(entries, key=lambda r: float(r.get("age_days", 0))):
            payload = {
                "external_id": ext,
                "age_days": _f(row["age_days"]),
                "fc_mpa": _f(row["fc_mpa"]),
                "specimen_count": int(row["specimen_count"]) if row.get("specimen_count") else 3,
                "test_standard": row.get("test_standard") or "ABNT NBR 5739",
                "lab": row.get("lab") or "",
                "notes": row.get("notes") or None,
                "model": row.get("model") or "arrhenius",
            }
            out = _post("/api/v1/results/strength", payload)
            outcomes.append({
                "external_id": ext,
                "age_days": payload["age_days"],
                "fc_mpa": payload["fc_mpa"],
                "fc_predicted": out.get("fc_predicted"),
                "residual": out.get("residual"),
                "sigma": out.get("calibration", {}).get("sigma"),
                "alerts": len(out.get("alerts", [])),
            })
            print(
                f"  {ext} d{payload['age_days']:4.0f} "
                f"fc={payload['fc_mpa']:.1f} "
                f"pred={out.get('fc_predicted', '?'):.2f} "
                f"res={out.get('residual', '?'):+.2f} "
                f"alerts={len(out.get('alerts', []))}"
            )
    return outcomes


def step_print_kpis(outcomes: list[dict]) -> None:
    print("\n[3/3] KPIs do piloto")

    res_28 = [o for o in outcomes if abs(o["age_days"] - 28.0) < 1.0 and o["residual"] is not None]
    if res_28:
        mae = sum(abs(o["residual"]) for o in res_28) / len(res_28)
        rmse = sqrt(sum(o["residual"] ** 2 for o in res_28) / len(res_28))
        print(f"  MAE  (28d): {mae:.3f} MPa")
        print(f"  RMSE (28d): {rmse:.3f} MPa")
    else:
        print("  Sem resultados 28d para calcular MAE/RMSE")

    total_alerts = sum(o["alerts"] for o in outcomes)
    print(f"  Total de alertas gerados: {total_alerts}")

    sigmas = [o["sigma"] for o in outcomes if o.get("sigma")]
    if sigmas:
        print(f"  Sigma final: {sigmas[-1]:.3f} MPa (n={len(sigmas)} atualizacoes)")

    print("\n  Saude da API:")
    health = _get("/health")
    print(f"  {health}")


# ── Main ─────────────────────────────────────────────────────────

def main() -> None:
    print("=== AION CORE 1.0 — Piloto 30 lotes ===")
    step_import_batches()
    outcomes = step_post_results()
    step_print_kpis(outcomes)
    print("\nConcluido.")


if __name__ == "__main__":
    main()
