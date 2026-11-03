"""add job detail fields; store HZZ and posao.hr deadlines in UTC

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-11-02 12:00:00.000000

New columns hold what HZZ detail pages state and the JobPosting markup uses
(region, contract type, education, experience, openings).

Deadlines: HZZ and posao.hr give a date, which the scrapers turn into 23:59
Croatian time (+01:00). The column has no time zone, so Postgres dropped the
offset and kept 23:59, while everything reading it treats the value as UTC:
ads stayed listed an hour too long and the site showed the next day as the
deadline. The scrapers now convert to UTC before saving; this shifts the rows
saved before that. Only 23:59 values are touched, so running it twice is safe.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_COLUMNS = [
    sa.Column('address_region', sa.String(), nullable=True),
    sa.Column('contract_type', sa.String(), nullable=True),
    sa.Column('education', sa.String(), nullable=True),
    sa.Column('experience', sa.String(), nullable=True),
    sa.Column('openings', sa.Integer(), nullable=True),
]


def upgrade() -> None:
    """Upgrade schema."""
    for column in NEW_COLUMNS:
        op.add_column('jobs', column)

    # SQLite is local dev only and keeps these as offset-carrying strings.
    if op.get_bind().dialect.name == 'postgresql':
        op.execute("""
            UPDATE jobs SET expires_at = expires_at - interval '1 hour'
            WHERE source IN ('hzz', 'posao') AND expires_at::time >= '23:59:00'
        """)


def downgrade() -> None:
    """Downgrade schema."""
    if op.get_bind().dialect.name == 'postgresql':
        op.execute("""
            UPDATE jobs SET expires_at = expires_at + interval '1 hour'
            WHERE source IN ('hzz', 'posao') AND expires_at::time >= '22:59:00' AND expires_at::time < '23:00:00'
        """)
    for column in reversed(NEW_COLUMNS):
        op.drop_column('jobs', column.name)
