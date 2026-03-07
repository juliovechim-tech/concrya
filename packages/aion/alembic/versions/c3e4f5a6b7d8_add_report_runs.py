"""add_report_runs

Revision ID: c3e4f5a6b7d8
Revises: b2d5f8c1a3e9
Create Date: 2026-02-26 21:24:38.213313

Cria a tabela report_runs para auditoria de relatórios PDF gerados.
Compatível com SQLite (via batch_alter_table) e PostgreSQL.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c3e4f5a6b7d8'
down_revision: Union[str, None] = 'b2d5f8c1a3e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_runs",
        sa.Column("id",          sa.Integer(),     primary_key=True),
        sa.Column("plant_id",    sa.String(64),    sa.ForeignKey("plants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_type", sa.String(32),    nullable=False, server_default="weekly"),
        sa.Column("week_end",    sa.Date(),        nullable=False),
        sa.Column("file_path",   sa.String(512),   nullable=False),
        sa.Column("created_at",  sa.DateTime(),    nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("meta_json",   sa.Text(),        nullable=True),
    )
    op.create_index("ix_report_runs_plant_week",    "report_runs", ["plant_id", "week_end"])
    op.create_index("ix_report_runs_plant_created", "report_runs", ["plant_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_report_runs_plant_created", table_name="report_runs")
    op.drop_index("ix_report_runs_plant_week",    table_name="report_runs")
    op.drop_table("report_runs")
