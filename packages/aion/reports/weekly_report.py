"""
reports/weekly_report.py
CONCRYA AION — Gerador de PDF do Relatório Semanal

Recebe um 'bundle' de dados já processados pelo report_service
e gera o arquivo PDF em out_pdf_path.
"""

from __future__ import annotations

import os

import matplotlib
matplotlib.use("Agg")  # sem janela — modo headless
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# ─────────────────────────────────────────────────────
#  GRÁFICOS
# ─────────────────────────────────────────────────────

def _line_chart(
    dates: list[str], values: list, title: str, y_label: str, path: str,
    ymin: float | None = None,
) -> None:
    ys = [v if v is not None else float("nan") for v in values]
    fig, ax = plt.subplots(figsize=(8, 2.6), dpi=150)
    ax.plot(range(len(dates)), ys, marker="o", markersize=3, linewidth=1.5)
    ax.set_title(title, fontsize=10)
    ax.set_ylabel(y_label, fontsize=8)
    ax.set_xticks(range(len(dates)))
    ax.set_xticklabels(dates, rotation=30, ha="right", fontsize=7)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    if ymin is not None:
        ax.set_ylim(bottom=ymin)
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


# ─────────────────────────────────────────────────────
#  BUILDER PRINCIPAL
# ─────────────────────────────────────────────────────

def build_weekly_report_pdf(bundle: dict, out_pdf_path: str) -> None:
    """
    bundle esperado:
      meta          : week_start, week_end, plant_id
      kpis          : dict str→str/number
      series        : dates[], avg_residual_abs[], sigma[], nc_count[], drift_count[]
      drift_events  : list of {date, severity, alert_type, message, fc_actual, fc_predicted}
      param_snapshots: list of {created_at, fc_inf, k, sigma, n_pairs, triggered_by}
      recommendations: list of str
    """
    meta = bundle["meta"]
    kpis = bundle["kpis"]
    series = bundle["series"]
    events = bundle.get("drift_events", [])
    snapshots = bundle.get("param_snapshots", [])
    recs = bundle.get("recommendations", [])
    has_data = bundle.get("has_data", True)
    coverage = bundle.get("coverage", {"batches_with_results": 0, "batches_total": 0})
    warmup = bundle.get("warmup")
    steady = bundle.get("steady")

    out_dir = os.path.dirname(out_pdf_path)
    os.makedirs(out_dir, exist_ok=True)

    # gráficos
    c1 = os.path.join(out_dir, "_chart_residual.png")
    c2 = os.path.join(out_dir, "_chart_sigma.png")
    c3 = os.path.join(out_dir, "_chart_alerts.png")

    _line_chart(series["dates"], series.get("avg_residual_abs", []),
                "Resíduo médio |fc_real - fc_pred| (MPa)", "MPa", c1, ymin=0.0)
    _line_chart(series["dates"], series.get("sigma", []),
                "Sigma do modelo (MPa) — tracking semanal", "MPa", c2)
    _line_chart(series["dates"], series.get("alerts_per_day", []),
                "Alertas por dia (NC + DRIFT)", "n", c3, ymin=0.0)

    # estilos
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("H1r", parent=styles["Heading1"], fontSize=17, leading=21, spaceAfter=8))
    styles.add(ParagraphStyle("H2r", parent=styles["Heading2"], fontSize=11.5, spaceBefore=10, spaceAfter=6))
    styles.add(ParagraphStyle("Br", parent=styles["BodyText"], fontSize=9.5, leading=13))
    styles.add(ParagraphStyle("Sm", parent=styles["BodyText"], fontSize=8, leading=10, textColor=colors.grey))

    week_start = meta["week_start"]
    week_end = meta["week_end"]
    plant_id = meta["plant_id"]

    def _header_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.grey)
        canvas.drawString(doc.leftMargin, A4[1] - 0.9 * cm,
                          "CONCRYA Technologies — AION CORE 1.0")
        canvas.drawRightString(A4[0] - doc.rightMargin, A4[1] - 0.9 * cm,
                               f"Relatório Semanal | Planta: {plant_id} | Semana: {week_start} → {week_end}")
        canvas.drawString(doc.leftMargin, 0.75 * cm, "Confidencial — uso piloto")
        canvas.drawRightString(A4[0] - doc.rightMargin, 0.75 * cm, f"Página {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        out_pdf_path,
        pagesize=A4,
        leftMargin=1.7 * cm, rightMargin=1.7 * cm,
        topMargin=1.6 * cm, bottomMargin=1.4 * cm,
    )

    story: list = []

    # ── Página 1: Executivo ───────────────────────────
    story.append(Paragraph("AION — Relatório Semanal da Planta", styles["H1r"]))
    story.append(Paragraph(
        f"Planta: <b>{plant_id}</b> &nbsp;|&nbsp; "
        f"Período: <b>{week_start}</b> a <b>{week_end}</b>",
        styles["Br"],
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Resumo Executivo", styles["H2r"]))
    story.append(Paragraph(
        "Pipeline AION executado para o período de referência. "
        "Veja KPIs operacionais abaixo e análise técnica na página seguinte.",
        styles["Br"],
    ))
    story.append(Spacer(1, 8))

    # KPI table
    story.append(Paragraph("KPIs Operacionais", styles["H2r"]))
    kpi_rows = [["KPI", "Valor"]] + [[str(k), str(v)] for k, v in kpis.items()]
    t_kpi = Table(kpi_rows, colWidths=[10 * cm, 6 * cm])
    t_kpi.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.2),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 10))

    # Warm-up vs Steady-state
    if warmup is not None and steady is not None:
        story.append(Paragraph("Warm-up vs Steady-state", styles["H2r"]))

        def _fmt(v):
            return str(v) if v is not None else "N/A"

        ws_rows = [
            ["Fase", "n (28d)", "MAE 28d (MPa)", "RMSE 28d (MPa)", "Alertas"],
            ["Warm-up", _fmt(warmup.get("n_28d")), _fmt(warmup.get("mae_28d")),
             _fmt(warmup.get("rmse_28d")), _fmt(warmup.get("alerts"))],
            ["Steady-state", _fmt(steady.get("n_28d")), _fmt(steady.get("mae_28d")),
             _fmt(steady.get("rmse_28d")), _fmt(steady.get("alerts"))],
        ]
        t_ws = Table(ws_rows, colWidths=[3.5*cm, 2.2*cm, 3.2*cm, 3.2*cm, 2.2*cm])
        t_ws.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#fff8e1"), colors.HexColor("#e8f5e9")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t_ws)

        # Statement executivo automático
        wu_mae = warmup.get("mae_28d")
        st_mae = steady.get("mae_28d")
        wu_al = warmup.get("alerts", 0)
        st_al = steady.get("alerts", 0)
        if wu_mae is not None and st_mae is not None:
            story.append(Spacer(1, 5))
            story.append(Paragraph(
                f"Após calibração ativa (steady-state), MAE 28d caiu de "
                f"<b>{wu_mae} MPa</b> para <b>{st_mae} MPa</b> e alertas "
                f"reduziram de <b>{wu_al}</b> para <b>{st_al}</b>.",
                styles["Sm"],
            ))

    story.append(PageBreak())

    # ── Página 2+: Técnico ────────────────────────────
    story.append(Paragraph("Análise Técnica", styles["H1r"]))

    if not has_data:
        cov_txt = f"{coverage.get('batches_with_results', 0)} / {coverage.get('batches_total', 0)}"
        msg = (
            "<b>Sem ensaios na janela do relatório.</b><br/><br/>"
            "Nenhum resultado 7d/28d foi registrado para os lotes deste período. "
            "Gráficos e métricas de erro estão indisponíveis.<br/><br/>"
            f"<b>Cobertura:</b> {cov_txt} lotes com ensaio.<br/><br/>"
            "<b>Checklist:</b><br/>"
            "1. Registre ao menos 1 ensaio via <i>/api/v1/results/strength</i><br/>"
            "2. Confirme que <b>plant_id</b> e <b>week_end</b> estão corretos<br/>"
            "3. Reexecute o relatório"
        )
        box = Table([[Paragraph(msg, styles["Br"])]], colWidths=[16.5 * cm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8f8f8")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.lightgrey),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ]))
        story.append(Spacer(1, 20))
        story.append(box)
        doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
        for p in [c1, c2, c3]:
            if os.path.exists(p):
                os.remove(p)
        return

    story.append(Paragraph("Tendências Semanais", styles["H2r"]))
    for chart_path in [c1, c2, c3]:
        if os.path.exists(chart_path):
            story.append(Image(chart_path, width=16.5 * cm, height=4.2 * cm))
            story.append(Spacer(1, 3))

    # Snapshots de parâmetros
    story.append(Paragraph("Snapshots de Calibração (semana)", styles["H2r"]))
    if snapshots:
        snap_rows = [["Data", "fc_inf (MPa)", "k", "sigma (MPa)", "Pares 7/28", "Disparado por result"]]
        for s in snapshots[:20]:
            snap_rows.append([
                s.get("created_at", ""),
                f"{s.get('fc_inf', ''):.2f}" if isinstance(s.get("fc_inf"), float) else "",
                f"{s.get('k', ''):.4f}" if isinstance(s.get("k"), float) else "",
                f"{s.get('sigma', ''):.3f}" if isinstance(s.get("sigma"), float) else "",
                str(s.get("n_pairs", "")),
                str(s.get("triggered_by", "")),
            ])
        t_snap = Table(snap_rows, colWidths=[3.0*cm, 2.8*cm, 2.0*cm, 2.8*cm, 2.3*cm, 3.4*cm])
        t_snap.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(t_snap)
    else:
        story.append(Paragraph("Nenhum snapshot de calibração no período.", styles["Br"]))

    story.append(Spacer(1, 8))

    # Eventos de alerta
    story.append(Paragraph("Eventos de Alerta (NC + DRIFT)", styles["H2r"]))
    if events:
        ev_rows = [["Data", "Tipo", "Severidade", "fc_real (MPa)", "fc_prev (MPa)", "Mensagem"]]
        for e in events[:40]:
            ev_rows.append([
                e.get("date", ""),
                e.get("alert_type", ""),
                e.get("severity", ""),
                f"{e.get('fc_actual', ''):.1f}" if isinstance(e.get("fc_actual"), float) else "",
                f"{e.get('fc_predicted', ''):.1f}" if isinstance(e.get("fc_predicted"), float) else "",
                (e.get("message", "")[:120] + "…") if len(e.get("message", "")) > 120 else e.get("message", ""),
            ])
        t_ev = Table(ev_rows, colWidths=[2.3*cm, 1.6*cm, 2.2*cm, 2.5*cm, 2.5*cm, 5.3*cm])
        t_ev.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.2),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(t_ev)
    else:
        story.append(Paragraph("Nenhum alerta registrado no período.", styles["Br"]))

    story.append(Spacer(1, 8))

    # Recomendações
    if recs:
        story.append(Paragraph("Ações Recomendadas", styles["H2r"]))
        story.append(Paragraph(
            "<ol>" + "".join(f"<li>{r}</li>" for r in recs) + "</ol>",
            styles["Br"],
        ))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)

    # limpa charts temporários
    for p in [c1, c2, c3]:
        if os.path.exists(p):
            os.remove(p)
