"""add_shopping_list

Revision ID: a4d8f6c2e910
Revises: e5a19c3f7b2d
Create Date: 2026-09-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4d8f6c2e910'
down_revision: Union[str, Sequence[str], None] = 'e5a19c3f7b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('verticals') as batch_op:
        batch_op.add_column(sa.Column('enables_shopping_list', sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        'shopping_list_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('user_id', 'product_id', name='uq_user_product_shopping_list_item'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('shopping_list_items')
    with op.batch_alter_table('verticals') as batch_op:
        batch_op.drop_column('enables_shopping_list')
