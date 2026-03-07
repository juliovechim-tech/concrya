"""
jobs/weekly_report_job.py
CONCRYA AION — Job semanal de geração de relatório PDF

Uso direto:
    python -m jobs.weekly_report_job
    python -m jobs.weekly_report_job --week-end 2026-02-23
    python -m jobs.weekly_report_job --week-end 2026-02-23 --plant-id PLANTA-02
    python -m jobs.weekly_report_job --all-plants   # gera para todas as plantas ativas

Agendado via Windows Task Scheduler pelo script:
    jobs/setup_task_scheduler.ps1

Comportamento:
    - Se --plant-id informado → gera para essa planta
    - Se --all-plants → gera para todas as plantas is_active=True no BD
    - Se nenhum dos dois → usa AION_PLANT_ID env ou 'PLANTA-01' (retrocompat)
    - Se --week-end não for informado, usa o último domingo
    - Grava PDF em reports/out/{plant_id}/aion_weekly_{plant_id}_{YYYYMMDD}.pdf
    - Mantém os últimos KEEP_REPORTS=12 PDFs por planta
    - Loga em logs/weekly_report_job.log com rotação
    - Exit 0 = sucesso, Exit 1 = alguma falha
"""

from __future__ import annotations

import argparse
import glob
import logging
import logging.handlers
import os
import sys
from datetime import date, timedelta
from pathlib import Path

# ── raiz do projeto no sys.path ───────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from app.database import SessionLocal
from app.models import Plant
from app.services.report_service import WeeklyReportService

# ─────────────────────────────────────────────────────────────────────────────
KEEP_REPORTS = 12          # número máximo de PDFs retidos por plant_id
LOG_FILE = ROOT / "logs" / "weekly_report_job.log"
LOG_MAX_BYTES = 5 * 1024 * 1024   # 5 MB por arquivo de log
LOG_BACKUP_COUNT = 3               # mantém .log, .log.1, .log.2, .log.3
# ─────────────────────────────────────────────────────────────────────────────


def _setup_logging() -> logging.Logger:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter(
        "%(asctime)s [AION-JOB] %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=LOG_MAX_BYTES, backupCount=LOG_BACKUP_COUNT, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(fmt)

    logger = logging.getLogger("aion.job")
    logger.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)
    return logger


def _last_sunday() -> date:
    """Retorna o domingo mais recente anterior a hoje.

    Se hoje for segunda (weekday=0): domingo = today - 1.
    Se hoje for domingo (weekday=6): retorna o domingo da semana passada
    (o job não deve gerar o relatório da semana corrente, que ainda não acabou).
    """
    today = date.today()
    # weekday(): Mon=0 … Sun=6
    # dias desde o último domingo:
    days_since_sunday = (today.weekday() + 1) % 7
    if days_since_sunday == 0:
        # hoje É domingo → usa o domingo de 7 dias atrás
        days_since_sunday = 7
    return today - timedelta(days=days_since_sunday)


def _prune_old_reports(out_dir: str, plant_id: str, keep: int, log: logging.Logger) -> None:
    """Remove PDFs além dos últimos `keep`, ordenados por nome (data embutida no nome)."""
    pattern = os.path.join(out_dir, f"aion_weekly_{plant_id}_*.pdf")
    files = sorted(glob.glob(pattern), reverse=True)  # desc → mais novo primeiro
    for old in files[keep:]:
        try:
            os.remove(old)
            log.info("Relatório antigo removido: %s", os.path.basename(old))
        except OSError as exc:
            log.warning("Não foi possível remover %s: %s", old, exc)


def run_one(plant_id: str, week_end: date, log: logging.Logger) -> str:
    """Gera o PDF de uma planta e aplica retenção. Retorna o caminho do PDF."""
    log.info("Gerando | plant=%s | semana até %s", plant_id, week_end)
    db = SessionLocal()
    try:
        svc = WeeklyReportService(db)
        pdf_path = svc.generate_weekly_pdf(plant_id=plant_id, week_end=week_end)
        log.info("PDF gerado: %s", pdf_path)
        _prune_old_reports(
            out_dir=os.path.dirname(pdf_path),
            plant_id=plant_id,
            keep=KEEP_REPORTS,
            log=log,
        )
        return pdf_path
    finally:
        db.close()


def _active_plant_ids(log: logging.Logger) -> list[str]:
    """Retorna ids de todas as plantas ativas no banco."""
    db = SessionLocal()
    try:
        plants = db.query(Plant).filter(Plant.is_active.is_(True)).order_by(Plant.id).all()
        ids = [p.id for p in plants]
        log.info("Plantas ativas encontradas: %s", ids or "(nenhuma)")
        return ids
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="CONCRYA AION — Job Semanal de Relatório PDF")
    parser.add_argument(
        "--week-end",
        metavar="YYYY-MM-DD",
        help="Data final da semana a reportar (default: último domingo)",
    )
    parser.add_argument(
        "--plant-id",
        default=None,
        metavar="ID",
        help="Gera apenas para esta planta",
    )
    parser.add_argument(
        "--all-plants",
        action="store_true",
        help="Gera para todas as plantas is_active=True no banco",
    )
    args = parser.parse_args()

    log = _setup_logging()
    week_end_date = (
        date.fromisoformat(args.week_end) if args.week_end else _last_sunday()
    )

    # Resolve lista de plantas
    if args.all_plants:
        plant_ids = _active_plant_ids(log)
        if not plant_ids:
            log.warning("Nenhuma planta ativa encontrada — abortando.")
            sys.exit(0)
    elif args.plant_id:
        plant_ids = [args.plant_id]
    else:
        # Retrocompatibilidade: env ou fallback
        plant_ids = [os.getenv("AION_PLANT_ID", "PLANTA-01")]

    failures = 0
    for pid in plant_ids:
        try:
            pdf_path = run_one(plant_id=pid, week_end=week_end_date, log=log)
            print(f"OK [{pid}]: {pdf_path}")
        except Exception:
            log.exception("Falha ao gerar relatório para planta=%s", pid)
            failures += 1

    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
