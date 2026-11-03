"""add salary_period: hourly and yearly pay aren't monthly

Revision ID: e4f5a6b7c8d9
Revises: c3d4e5f6a7b8
Create Date: 2026-11-03 14:00:00.000000

Amounts were all read as monthly, so "od 3 do 4 EUR" (an hourly rate) and
"Annual salary € 30.500 – 35.000" showed as monthly pay. salary_period is
'hour', 'year' or NULL (monthly). Existing rows get the same rules as
shared.salary_parser.parse_salary_period.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('salary_period', sa.String(), nullable=True))

    top = "COALESCE(salary_max, salary_min)"
    low = "COALESCE(salary_min, salary_max)"
    op.execute(f"UPDATE jobs SET salary_period = 'hour' WHERE {top} < 100")
    op.execute(f"UPDATE jobs SET salary_period = 'year' WHERE {low} >= 20000")
    if op.get_bind().dialect.name == 'postgresql':
        op.execute(f"""
            UPDATE jobs SET salary_period = 'year'
            WHERE salary_period IS NULL AND {low} >= 10000
              AND salary_text ~* '(godišnj|godisnj|/\\s*god\\M|per\\s+year|per\\s+annum|annual|yearly)'
        """)


def downgrade() -> None:
    op.drop_column('jobs', 'salary_period')
