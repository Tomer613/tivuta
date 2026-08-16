"""add_product_sale_price

Revision ID: 71938ad2ba93
Revises: 9b1e2c4f6a83
Create Date: 2026-08-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71938ad2ba93'
down_revision: Union[str, Sequence[str], None] = '9b1e2c4f6a83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('sale_price', sa.Float(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_column('sale_price')
