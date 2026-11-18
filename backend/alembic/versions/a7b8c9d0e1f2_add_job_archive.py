"""add job_archive: keep ads after purge_old_jobs deletes them

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-11-18 10:00:00.000000

`jobs` only holds the last ~2 months; the scraper deletes ads ~30 days after
they expire. job_archive keeps every ad's fields (no long texts) so salary
history survives. Every ad currently in `jobs` is copied in right away.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Same list as scraper/base_scraper.py ARCHIVE_COLUMNS.
COLUMNS = (
    "external_id", "source", "title", "company", "location", "address_region",
    "category", "category_raw", "job_type", "contract_type", "education",
    "experience", "openings", "salary_shown", "salary_min", "salary_max",
    "salary_text", "salary_currency", "salary_basis", "salary_type",
    "salary_period", "url", "posted_at", "scraped_at", "expires_at",
)


def upgrade() -> None:
    op.create_table(
        'job_archive',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('external_id', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('company', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('address_region', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('category_raw', sa.String(), nullable=True),
        sa.Column('job_type', sa.String(), nullable=True),
        sa.Column('contract_type', sa.String(), nullable=True),
        sa.Column('education', sa.String(), nullable=True),
        sa.Column('experience', sa.String(), nullable=True),
        sa.Column('openings', sa.Integer(), nullable=True),
        sa.Column('salary_shown', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('salary_min', sa.Float(), nullable=True),
        sa.Column('salary_max', sa.Float(), nullable=True),
        sa.Column('salary_text', sa.String(), nullable=True),
        sa.Column('salary_currency', sa.String(), nullable=True),
        sa.Column('salary_basis', sa.String(), nullable=True),
        sa.Column('salary_type', sa.String(), nullable=True),
        sa.Column('salary_period', sa.String(), nullable=True),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('posted_at', sa.String(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id', name='uq_job_archive_external_id'),
    )
    op.create_index('ix_job_archive_source', 'job_archive', ['source'])
    op.create_index('ix_job_archive_category', 'job_archive', ['category'])
    op.create_index('ix_job_archive_scraped_at', 'job_archive', ['scraped_at'])

    cols = ", ".join(COLUMNS)
    op.execute(f"""
        INSERT INTO job_archive ({cols})
        SELECT {cols} FROM jobs WHERE external_id IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_table('job_archive')
