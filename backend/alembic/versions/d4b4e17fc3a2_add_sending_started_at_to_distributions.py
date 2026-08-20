"""add sending_started_at to distributions

Revision ID: d4b4e17fc3a2
Revises: 394f81594354
Create Date: 2026-08-20 13:35:19.346102

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4b4e17fc3a2'
down_revision: Union[str, Sequence[str], None] = '394f81594354'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('distributions', sa.Column('sending_started_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('distributions', 'sending_started_at')
