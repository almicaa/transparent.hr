"""add market_stats table

Revision ID: 63c671063fe8
Revises: 7349fc09f115
Create Date: 2026-06-24 16:18:50.594805

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63c671063fe8'
down_revision: Union[str, Sequence[str], None] = '7349fc09f115'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('market_stats',
    sa.Column('source', sa.String(), nullable=False),
    sa.Column('total_pages', sa.Integer(), nullable=False),
    sa.Column('salary_pages', sa.Integer(), nullable=False),
    sa.Column('estimated_pct', sa.Float(), nullable=False),
    sa.Column('computed_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('source')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('market_stats')
