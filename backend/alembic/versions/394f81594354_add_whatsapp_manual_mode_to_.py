"""add whatsapp manual mode to distributions

Revision ID: 394f81594354
Revises: d9d35ce50308
Create Date: 2026-08-19 10:28:53.421343

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '394f81594354'
down_revision: Union[str, Sequence[str], None] = 'd9d35ce50308'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Autogenerate also picked up the same unrelated pre-existing drift trimmed out of
    # d9d35ce50308 (ix_favorites_id/ix_notifications_id, reviews.is_approved nullability) - left
    # out here too to keep this migration scoped to what it's actually named for.
    op.add_column('distributions', sa.Column('whatsapp_manual_mode', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('distributions', 'whatsapp_manual_mode')
