"""add salary structured fields, job_sources, scrape_logs

Revision ID: d528095d4422
Revises: 63c671063fe8
Create Date: 2026-06-24 17:02:27.802317

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd528095d4422'
down_revision: Union[str, Sequence[str], None] = '63c671063fe8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('job_sources',
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('display_name', sa.String(), nullable=False),
    sa.Column('base_url', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('name')
    )
    op.create_table('scrape_logs',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('source', sa.String(), nullable=False),
    sa.Column('started_at', sa.DateTime(), nullable=False),
    sa.Column('finished_at', sa.DateTime(), nullable=True),
    sa.Column('jobs_found', sa.Integer(), nullable=False),
    sa.Column('jobs_saved', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('error_message', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('jobs', sa.Column('salary_currency', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('salary_basis', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('salary_type', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('jobs', 'salary_type')
    op.drop_column('jobs', 'salary_basis')
    op.drop_column('jobs', 'salary_currency')
    op.drop_table('scrape_logs')
    op.drop_table('job_sources')
