"""add cart quantity and cart_group_id to leads

Revision ID: c7794c6bcb54
Revises: 20b196d5ff3e
Create Date: 2026-07-21 20:40:36.911318

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7794c6bcb54'
down_revision: Union[str, Sequence[str], None] = '20b196d5ff3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('leads', sa.Column('quantity', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('cart_group_id', sa.String(length=40), nullable=True))
    op.create_index(op.f('ix_leads_cart_group_id'), 'leads', ['cart_group_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_leads_cart_group_id'), table_name='leads')
    op.drop_column('leads', 'cart_group_id')
    op.drop_column('leads', 'quantity')
