"""add_inventory_stock_tracking

Revision ID: c2d81f6b93ea
Revises: b7c3e91a5f04
Create Date: 2026-09-01 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d81f6b93ea'
down_revision: Union[str, Sequence[str], None] = 'b7c3e91a5f04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('stock_quantity', sa.Integer(), nullable=True))

    op.create_table(
        'inventory_ledger_entries',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id'), nullable=False, index=True),
        sa.Column('delta', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=30), nullable=False),
        sa.Column('reference_order_id', sa.Integer(), sa.ForeignKey('customer_orders.id'), nullable=True),
        sa.Column('balance_after', sa.Integer(), nullable=False),
        sa.Column('actor', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('inventory_ledger_entries')
    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_column('stock_quantity')
