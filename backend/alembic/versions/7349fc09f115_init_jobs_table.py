"""init jobs table

Revision ID: 7349fc09f115
Revises:
Create Date: 2026-06-24 15:29:39.115242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7349fc09f115'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'jobs',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('company', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('job_type', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('salary_min', sa.Float(), nullable=True),
        sa.Column('salary_max', sa.Float(), nullable=True),
        sa.Column('salary_text', sa.String(), nullable=True),
        sa.Column('salary_shown', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('posted_at', sa.String(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('jobs')
