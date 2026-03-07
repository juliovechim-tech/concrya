"""parameter_snapshots_per_plant

Revision ID: 5d4d3f6d1b2a
Revises: a1f3e9b2c047
Create Date: 2026-02-26 20:10:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "5d4d3f6d1b2a"
down_revision: Union[str, None] = "a1f3e9b2c047"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("parameter_snapshots") as batch_op:
        batch_op.add_column(sa.Column("plant_id", sa.String(length=64), nullable=True))
        batch_op.create_foreign_key(
            "fk_parameter_snapshots_plant_id",
            "plants",
            ["plant_id"],
            ["id"],
        )
        batch_op.create_index("ix_parameter_snapshots_plant_id", ["plant_id"], unique=False)

    # Backfill plant_id from triggering result -> batch relationship.
    op.execute(
        sa.text(
            """
            UPDATE parameter_snapshots
               SET plant_id = (
                   SELECT b.plant_id
                     FROM strength_results sr
                     JOIN batches b ON b.id = sr.batch_id
                    WHERE sr.id = parameter_snapshots.triggered_by_result_id
               )
             WHERE triggered_by_result_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("parameter_snapshots") as batch_op:
        batch_op.drop_index("ix_parameter_snapshots_plant_id")
        batch_op.drop_constraint("fk_parameter_snapshots_plant_id", type_="foreignkey")
        batch_op.drop_column("plant_id")
