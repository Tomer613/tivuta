"""add whatsapp confirmation and manual share to distributions

Revision ID: d9d35ce50308
Revises: a2f4c8e19d3b
Create Date: 2026-08-19 08:53:16.419037

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9d35ce50308'
down_revision: Union[str, Sequence[str], None] = 'a2f4c8e19d3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Autogenerate also picked up unrelated pre-existing drift (ix_favorites_id/ix_notifications_id
    # indexes, reviews.is_approved nullability) between the dev DB and the model definitions -
    # trimmed out here to keep this migration scoped to what it's actually named for.
    op.add_column('distributions', sa.Column('whatsapp_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('distributions', sa.Column('is_manual_share', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('distributions', 'is_manual_share')
    op.drop_column('distributions', 'whatsapp_confirmed_at')
