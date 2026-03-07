"""add_plant_id_to_results_and_alerts

Revision ID: b2d5f8c1a3e9
Revises: 5d4d3f6d1b2a
Create Date: 2026-02-26 20:00:00.000000

Adiciona plant_id (nullable) em strength_results e alerts.
parameter_snapshots já foi tratado em 5d4d3f6d1b2a.
Backfill via subquery correlated (compatível Postgres e SQLite).

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b2d5f8c1a3e9'
down_revision: Union[str, None] = '5d4d3f6d1b2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── strength_results.plant_id ─────────────────────────────────────────────
    with op.batch_alter_table('strength_results') as b:
        b.add_column(sa.Column('plant_id', sa.String(64), nullable=True))
        b.create_index('ix_strength_results_plant_id', ['plant_id'])
        b.create_foreign_key('fk_strength_results_plant_id', 'plants', ['plant_id'], ['id'])

    op.execute("""
        UPDATE strength_results
        SET plant_id = (
            SELECT plant_id FROM batches
            WHERE batches.id = strength_results.batch_id
        )
        WHERE plant_id IS NULL
    """)

    # ── alerts.plant_id ───────────────────────────────────────────────────────
    with op.batch_alter_table('alerts') as b:
        b.add_column(sa.Column('plant_id', sa.String(64), nullable=True))
        b.create_index('ix_alerts_plant_id', ['plant_id'])
        b.create_foreign_key('fk_alerts_plant_id', 'plants', ['plant_id'], ['id'])

    op.execute("""
        UPDATE alerts
        SET plant_id = (
            SELECT plant_id FROM batches
            WHERE batches.id = alerts.batch_id
        )
        WHERE plant_id IS NULL
    """)


def downgrade() -> None:
    with op.batch_alter_table('alerts') as b:
        b.drop_constraint('fk_alerts_plant_id', type_='foreignkey')
        b.drop_index('ix_alerts_plant_id')
        b.drop_column('plant_id')

    with op.batch_alter_table('strength_results') as b:
        b.drop_constraint('fk_strength_results_plant_id', type_='foreignkey')
        b.drop_index('ix_strength_results_plant_id')
        b.drop_column('plant_id')
