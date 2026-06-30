"""add salary_stats table for daily transparency tracking

Revision ID: a1b2c3d4e5f6
Revises: 63c671063fe8
Create Date: 2026-06-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7797940d61ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'salary_stats',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('source', sa.String(50), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('total_jobs', sa.Integer, nullable=False),
        sa.Column('jobs_with_salary', sa.Integer, nullable=False),
        sa.Column('pct', sa.Float, nullable=False),
        sa.UniqueConstraint('source', 'date', name='uq_salary_stats_source_date'),
    )


def downgrade() -> None:
    op.drop_table('salary_stats')
