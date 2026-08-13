"""add_vendor_reset_token

Revision ID: 14eafd54db52
Revises: 4edae04e4800
Create Date: 2026-08-13 15:02:31.391537

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '14eafd54db52'
down_revision: Union[str, Sequence[str], None] = '4edae04e4800'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('vendors', sa.Column('reset_token', sa.String(length=255), nullable=True))
    op.add_column('vendors', sa.Column('reset_token_expires', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('vendors', 'reset_token_expires')
    op.drop_column('vendors', 'reset_token')
