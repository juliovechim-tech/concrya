"""add_plants_and_plant_id

Revision ID: a1f3e9b2c047
Revises: dd1c8b871977
Create Date: 2026-02-26 19:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a1f3e9b2c047'
down_revision: Union[str, None] = 'dd1c8b871977'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── plants ────────────────────────────────────────────────────────────────
    op.create_table(
        'plants',
        sa.Column('id', sa.String(64), nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── batches.plant_id ──────────────────────────────────────────────────────
    with op.batch_alter_table('batches') as batch_op:
        batch_op.add_column(
            sa.Column('plant_id', sa.String(64), nullable=True)
        )
        batch_op.create_foreign_key(
            'fk_batches_plant_id', 'plants', ['plant_id'], ['id']
        )
        batch_op.create_index('ix_batches_plant_id', ['plant_id'])


def downgrade() -> None:
    with op.batch_alter_table('batches') as batch_op:
        batch_op.drop_index('ix_batches_plant_id')
        batch_op.drop_constraint('fk_batches_plant_id', type_='foreignkey')
        batch_op.drop_column('plant_id')

    op.drop_table('plants')
