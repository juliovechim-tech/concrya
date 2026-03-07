"""initial_schema

Revision ID: dd1c8b871977
Revises:
Create Date: 2026-02-26 17:11:42.988613

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'dd1c8b871977'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── batches ───────────────────────────────────────────────────────────────
    op.create_table(
        'batches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(64), nullable=False),
        sa.Column('occurred_at', sa.DateTime(), nullable=False),
        sa.Column('target_fck', sa.Float(), nullable=False),
        sa.Column('temperature', sa.Float(), nullable=False),
        sa.Column('added_water', sa.Float(), nullable=True),
        sa.Column('aggregate_moisture', sa.Float(), nullable=True),
        sa.Column('target_slump', sa.Float(), nullable=True),
        sa.Column('slump_measured', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_batches_external_id', 'batches', ['external_id'], unique=True)

    # ── strength_results ──────────────────────────────────────────────────────
    op.create_table(
        'strength_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),
        sa.Column('age_days', sa.Float(), nullable=False),
        sa.Column('fc_mpa', sa.Float(), nullable=False),
        sa.Column('specimen_count', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('test_standard', sa.String(64), nullable=False, server_default='ABNT NBR 5739'),
        sa.Column('lab', sa.String(128), nullable=False, server_default=''),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── alerts ────────────────────────────────────────────────────────────────
    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),
        sa.Column('alert_type', sa.String(32), nullable=False),
        sa.Column('severity', sa.String(16), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('fc_actual', sa.Float(), nullable=True),
        sa.Column('fc_predicted', sa.Float(), nullable=True),
        sa.Column('fc_threshold', sa.Float(), nullable=True),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── predictions ───────────────────────────────────────────────────────────
    op.create_table(
        'predictions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),
        sa.Column('age_days', sa.Float(), nullable=False),
        sa.Column('fc_predicted', sa.Float(), nullable=False),
        sa.Column('model', sa.String(32), nullable=False, server_default='arrhenius'),
        sa.Column('fc_inf', sa.Float(), nullable=False),
        sa.Column('k', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['batches.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── parameter_updates ─────────────────────────────────────────────────────
    op.create_table(
        'parameter_updates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model', sa.String(32), nullable=False),
        sa.Column('fc_inf_before', sa.Float(), nullable=False),
        sa.Column('k_before', sa.Float(), nullable=False),
        sa.Column('fc_inf_after', sa.Float(), nullable=False),
        sa.Column('k_after', sa.Float(), nullable=False),
        sa.Column('n_samples', sa.Integer(), nullable=False),
        sa.Column('triggered_by_result_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['triggered_by_result_id'], ['strength_results.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── parameter_snapshots ───────────────────────────────────────────────────
    op.create_table(
        'parameter_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model', sa.String(32), nullable=False),
        sa.Column('fc_inf', sa.Float(), nullable=False),
        sa.Column('k', sa.Float(), nullable=False),
        sa.Column('sigma', sa.Float(), nullable=False),
        sa.Column('sigma_n', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('mean_residual', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('n_pairs', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('n_age28', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('mean_ratio', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('triggered_by_result_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['triggered_by_result_id'], ['strength_results.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_parameter_snapshots_model', 'parameter_snapshots', ['model'])


def downgrade() -> None:
    op.drop_index('ix_parameter_snapshots_model', table_name='parameter_snapshots')
    op.drop_table('parameter_snapshots')
    op.drop_table('parameter_updates')
    op.drop_table('predictions')
    op.drop_table('alerts')
    op.drop_table('strength_results')
    op.drop_index('ix_batches_external_id', table_name='batches')
    op.drop_table('batches')
