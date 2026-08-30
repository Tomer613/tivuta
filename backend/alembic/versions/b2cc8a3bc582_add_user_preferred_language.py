"""add_user_preferred_language

Revision ID: b2cc8a3bc582
Revises: d4b4e17fc3a2
Create Date: 2026-08-30 12:24:19.178129

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2cc8a3bc582'
down_revision: Union[str, Sequence[str], None] = 'd4b4e17fc3a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('preferred_language', sa.String(length=5), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'preferred_language')
