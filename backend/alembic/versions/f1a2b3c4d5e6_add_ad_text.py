"""add ad_text: the ad's full text, for CV matching

Revision ID: f1a2b3c4d5e6
Revises: e4f5a6b7c8d9
Create Date: 2026-11-08 10:00:00.000000

Posao.hr and MojPosao ads were saved without their body, so the CV matching
couldn't see requirements such as languages or years of experience.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('ad_text', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'ad_text')
