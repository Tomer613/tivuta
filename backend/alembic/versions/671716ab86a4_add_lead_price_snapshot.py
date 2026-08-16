"""add_lead_price_snapshot

Revision ID: 671716ab86a4
Revises: d1def6807a27
Create Date: 2026-08-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '671716ab86a4'
down_revision: Union[str, Sequence[str], None] = 'd1def6807a27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('leads', sa.Column('unit_price_snapshot', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('list_price_snapshot', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('quantity_discount_percent_snapshot', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('leads', 'quantity_discount_percent_snapshot')
    op.drop_column('leads', 'list_price_snapshot')
    op.drop_column('leads', 'unit_price_snapshot')
