"""
app/services/report_service.py
CONCRYA AION — Serviço de Relatório Semanal

Coleta dados da janela de 7 dias e monta o bundle para o gerador de PDF.
Trabalha com os models reais: Batch, StrengthResult, Alert, ParameterSnapshot.

Nota: calibração e snapshots são filtrados por plant_id.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from math import sqrt
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Alert, Batch, ReportRun, StrengthResult
from app.services.prediction_engine import predict
from infrastructure.repositories.parameter_repo import ParameterRepository, ParameterSnapshot
from reports.weekly_report import build_weekly_report_pdf


@dataclass
class ReportWindow:
    start: datetime
    end: datetime


class WeeklyReportService:
    def __init__(self, db: Session):
        self.db = db

    # ── Janela temporal ───────────────────────────────

    def _window(self, week_end: Optional[date]) -> ReportWindow:
        end_date = week_end or date.today()
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59)
        start_dt = end_dt - timedelta(days=6)
        start_dt = start_dt.replace(hour=0, minute=0, second=0)
        return ReportWindow(start=start_dt, end=end_dt)

    # ── Geração ───────────────────────────────────────

    def generate_weekly_pdf(self, plant_id: str, week_end: Optional[date] = None) -> str:
        w = self._window(week_end)
        model = settings.default_model

        # ── Dados da semana ───────────────────────────
        q = self.db.query(Batch).filter(Batch.occurred_at.between(w.start, w.end))
        if plant_id:
            q = q.filter(Batch.plant_id == plant_id)
        batches = q.all()
        batch_ids = [b.id for b in batches]

        results = (
            self.db.query(StrengthResult)
            .filter(StrengthResult.batch_id.in_(batch_ids))
            .all()
        ) if batch_ids else []

        alerts = (
            self.db.query(Alert)
            .filter(Alert.batch_id.in_(batch_ids))
            .order_by(Alert.id)
            .all()
        ) if batch_ids else []

        result_ids = [r.id for r in results]
        snapshots = (
            self.db.query(ParameterSnapshot)
            .filter(
                ParameterSnapshot.triggered_by_result_id.in_(result_ids),
                ParameterSnapshot.plant_id == plant_id,
                ParameterSnapshot.model == model,
            )
            .order_by(ParameterSnapshot.id)
            .all()
        ) if result_ids else []

        latest_snap = (
            self.db.query(ParameterSnapshot)
            .filter(
                ParameterSnapshot.plant_id == plant_id,
                ParameterSnapshot.model == model,
            )
            .order_by(ParameterSnapshot.id.desc())
            .first()
        )

        # ── KPIs ──────────────────────────────────────
        results_7d = [r for r in results if abs(r.age_days - 7.0) < 0.6]
        results_28d = [r for r in results if abs(r.age_days - 28.0) < 1.0]
        nc_alerts = [a for a in alerts if a.alert_type == "NC"]
        drift_alerts = [a for a in alerts if a.alert_type == "DRIFT"]

        param_set = ParameterRepository(self.db).get_current(plant_id=plant_id, model=model)
        batch_map = {b.id: b for b in batches}

        # ── Warm-up vs Steady-state ────────────────────
        # Primeiro snapshot com n_pairs >= MIN_PAIRS (2) define a fronteira
        first_steady_snap = (
            self.db.query(ParameterSnapshot)
            .filter(
                ParameterSnapshot.plant_id == plant_id,
                ParameterSnapshot.model == model,
                ParameterSnapshot.n_pairs >= 2,
            )
            .order_by(ParameterSnapshot.id)
            .first()
        )
        steady_from_result_id = (
            first_steady_snap.triggered_by_result_id
            if first_steady_snap and first_steady_snap.triggered_by_result_id
            else None
        )

        def _phase(r) -> str:
            if steady_from_result_id is None or r.id < steady_from_result_id:
                return "warmup"
            return "steady"

        def _metrics(rs: list, alert_list: list, batch_ids_set: set) -> dict:
            rs28 = [r for r in rs if abs(r.age_days - 28.0) < 1.0]
            signed_res = []
            for r in rs28:
                b = batch_map.get(r.batch_id)
                if b and b.temperature is not None:
                    fc_pred = predict(
                        temp_c=b.temperature, age=r.age_days,
                        fc_inf=param_set.fc_inf, k=param_set.k,
                    )
                    signed_res.append(r.fc_mpa - fc_pred)
            abs_res = [abs(x) for x in signed_res]
            mae28 = round(sum(abs_res) / len(abs_res), 2) if abs_res else None
            rmse28 = round(sqrt(sum(x**2 for x in signed_res) / len(signed_res)), 2) if signed_res else None
            n_alerts = sum(1 for a in alert_list if a.batch_id in batch_ids_set)
            return {"n_28d": len(rs28), "mae_28d": mae28, "rmse_28d": rmse28, "alerts": n_alerts}

        warmup_results = [r for r in results if _phase(r) == "warmup"]
        steady_results = [r for r in results if _phase(r) == "steady"]
        warmup_batch_ids = {r.batch_id for r in warmup_results}
        steady_batch_ids = {r.batch_id for r in steady_results}

        warmup_metrics = _metrics(warmup_results, alerts, warmup_batch_ids)
        steady_metrics = _metrics(steady_results, alerts, steady_batch_ids)

        # MAE/RMSE globais (todos os resultados)
        all_res28 = [r for r in results if abs(r.age_days - 28.0) < 1.0]
        signed_all: list[float] = []
        for r in all_res28:
            b = batch_map.get(r.batch_id)
            if b and b.temperature is not None:
                fc_pred = predict(
                    temp_c=b.temperature, age=r.age_days,
                    fc_inf=param_set.fc_inf, k=param_set.k,
                )
                signed_all.append(r.fc_mpa - fc_pred)
        mae = round(sum(abs(x) for x in signed_all) / len(signed_all), 2) if signed_all else None
        rmse = round(sqrt(sum(x**2 for x in signed_all) / len(signed_all)), 2) if signed_all else None

        # ── has_data e coverage ────────────────────────
        batches_with_results = len({r.batch_id for r in results})
        has_data = len(results) > 0

        kpis: dict = {
            "Lotes na semana": len(batches),
            "Ensaios registrados": len(results),
            "Ensaios 7d": len(results_7d),
            "Ensaios 28d": len(results_28d),
            "Alertas NC": len(nc_alerts),
            "Alertas DRIFT": len(drift_alerts),
            "MAE |resíduo| 28d (MPa)": mae if mae is not None else "N/A",
            "RMSE |resíduo| 28d (MPa)": rmse if rmse is not None else "N/A",
            "Snapshots de calibração": len(snapshots),
            "fc_inf vigente (MPa)": f"{latest_snap.fc_inf:.2f}" if latest_snap else "default",
            "k vigente": f"{latest_snap.k:.4f}" if latest_snap else "default",
            "sigma vigente (MPa)": f"{latest_snap.sigma:.3f}" if latest_snap else "default",
        }

        # ── Séries diárias ─────────────────────────────
        series = self._daily_series(
            w,
            batch_ids,
            results,
            batch_map,
            param_set,
            plant_id=plant_id,
            model=model,
        )

        # ── Eventos de alerta para tabela ─────────────
        drift_events = [
            {
                "date": a.created_at.strftime("%Y-%m-%d"),
                "alert_type": a.alert_type,
                "severity": a.severity,
                "fc_actual": a.fc_actual,
                "fc_predicted": a.fc_predicted,
                "message": a.message,
            }
            for a in alerts
        ]

        # ── Snapshots para tabela ─────────────────────
        param_snapshots = [
            {
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M"),
                "fc_inf": s.fc_inf,
                "k": s.k,
                "sigma": s.sigma,
                "n_pairs": s.n_pairs,
                "triggered_by": s.triggered_by_result_id,
            }
            for s in snapshots
        ]

        # ── Recomendações automáticas ─────────────────
        recommendations = self._build_recommendations(
            drift_count=len(drift_alerts),
            nc_count=len(nc_alerts),
            mae=mae,
            sigma=latest_snap.sigma if latest_snap else None,
        )

        # ── Bundle ────────────────────────────────────
        bundle = {
            "meta": {
                "week_start": w.start.strftime("%Y-%m-%d"),
                "week_end": w.end.strftime("%Y-%m-%d"),
                "plant_id": plant_id,
            },
            "has_data": has_data,
            "coverage": {
                "batches_with_results": batches_with_results,
                "batches_total": len(batches),
            },
            "warmup": warmup_metrics,
            "steady": steady_metrics,
            "kpis": kpis,
            "series": series,
            "drift_events": drift_events,
            "param_snapshots": param_snapshots,
            "recommendations": recommendations,
        }

        # ── Salva PDF (subpasta por planta) ───────────
        out_dir = os.path.join(os.getcwd(), "reports", "out", plant_id)
        os.makedirs(out_dir, exist_ok=True)
        filename = f"aion_weekly_{plant_id}_{w.end.strftime('%Y%m%d')}.pdf"
        pdf_path = os.path.join(out_dir, filename)
        build_weekly_report_pdf(bundle=bundle, out_pdf_path=pdf_path)

        # ── Auditoria: upsert ReportRun ───────────────
        # Evita duplicar linha para a mesma planta/tipo/semana
        week_end_date = w.end.date()
        existing = (
            self.db.query(ReportRun)
            .filter(
                ReportRun.plant_id    == plant_id,
                ReportRun.report_type == "weekly",
                ReportRun.week_end    == week_end_date,
            )
            .first()
        )
        meta = json.dumps({
            "kpis":            {k: v for k, v in kpis.items() if not isinstance(v, float) or True},
            "has_data":        has_data,
            "snapshots_count": len(snapshots),
        }, ensure_ascii=False, default=str)

        if existing:
            existing.file_path   = pdf_path
            existing.created_at  = datetime.utcnow()
            existing.meta_json   = meta
        else:
            self.db.add(ReportRun(
                plant_id=plant_id,
                report_type="weekly",
                week_end=week_end_date,
                file_path=pdf_path,
                meta_json=meta,
            ))
        self.db.commit()

        return pdf_path

    # ── Séries diárias ─────────────────────────────────

    def _daily_series(
        self,
        w: ReportWindow,
        batch_ids: list[int],
        results: list,
        batch_map: dict,
        param_set,
        plant_id: str,
        model: str,
    ) -> dict:
        dates, avg_residual_abs, sigma_vals, alerts_per_day = [], [], [], []

        # Agrupa resultados por dia de produção do lote (occurred_at)
        from collections import defaultdict
        results_by_day: dict = defaultdict(list)
        for r in results:
            b = batch_map.get(r.batch_id)
            if b and b.occurred_at:
                results_by_day[b.occurred_at.date()].append((r, b))

        # Alertas por dia (via batch_id, agrupados por occurred_at do lote)
        alerts_by_day: dict = defaultdict(int)
        if batch_ids:
            all_alerts = self.db.query(Alert).filter(Alert.batch_id.in_(batch_ids)).all()
            for a in all_alerts:
                b = batch_map.get(a.batch_id)
                if b and b.occurred_at:
                    alerts_by_day[b.occurred_at.date()] += 1

        # Sigma global (único valor — piso 2.5 MPa)
        snap = (
            self.db.query(ParameterSnapshot)
            .filter(
                ParameterSnapshot.plant_id == plant_id,
                ParameterSnapshot.model == model,
            )
            .order_by(ParameterSnapshot.id.desc())
            .first()
        )
        sigma_global = round(snap.sigma, 3) if snap else None

        cur = w.start
        while cur.date() <= w.end.date():
            day = cur.date()
            day_results = results_by_day.get(day, [])

            # Resíduo médio do dia usando prediction engine
            res_vals = []
            for r, b in day_results:
                if b.temperature is not None:
                    fc_pred = predict(
                        temp_c=b.temperature,
                        age=r.age_days,
                        fc_inf=param_set.fc_inf,
                        k=param_set.k,
                    )
                    res_vals.append(abs(r.fc_mpa - fc_pred))
            avg_res = round(sum(res_vals) / len(res_vals), 3) if res_vals else None

            dates.append(cur.strftime("%Y-%m-%d"))
            avg_residual_abs.append(avg_res)
            sigma_vals.append(sigma_global)
            alerts_per_day.append(alerts_by_day.get(day, 0))

            cur += timedelta(days=1)

        return {
            "dates": dates,
            "avg_residual_abs": avg_residual_abs,
            "sigma": sigma_vals,
            "alerts_per_day": alerts_per_day,
        }

    # ── Recomendações automáticas ──────────────────────

    def _build_recommendations(
        self,
        drift_count: int,
        nc_count: int,
        mae: Optional[float],
        sigma: Optional[float],
    ) -> list[str]:
        recs = []
        if drift_count > 0:
            recs.append(
                f"{drift_count} evento(s) de DRIFT detectado(s). "
                "Verificar umidade dos agregados, dosagem de aditivo e energia de mistura."
            )
        if nc_count > 0:
            recs.append(
                f"{nc_count} não-conformidade(s) fc_28d < fck. "
                "Auditar traço, fator a/c e condições de cura."
            )
        if mae is not None and mae > 3.0:
            recs.append(
                f"MAE do resíduo elevado ({mae:.2f} MPa). "
                "Aguardar mais pares 7d/28d para nova calibração."
            )
        if sigma is not None and sigma > 4.0:
            recs.append(
                f"Sigma ({sigma:.2f} MPa) acima do esperado para concreto controlado. "
                "Revisar variabilidade de materiais e procedimento de moldagem."
            )
        if not recs:
            recs.append("Operação normal na semana. Continuar monitoramento padrão.")
        return recs
