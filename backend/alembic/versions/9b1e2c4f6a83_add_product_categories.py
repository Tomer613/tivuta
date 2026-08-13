"""add_product_categories

Revision ID: 9b1e2c4f6a83
Revises: 14eafd54db52
Create Date: 2026-08-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b1e2c4f6a83'
down_revision: Union[str, Sequence[str], None] = '14eafd54db52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'product_categories',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('vertical', sa.String(50), nullable=False),
        sa.Column('label_he', sa.String(100), nullable=False),
        sa.Column('label_en', sa.String(100), nullable=True),
        sa.Column('label_fr', sa.String(100), nullable=True),
        sa.Column('label_yi', sa.String(100), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_product_categories_vertical', 'product_categories', ['vertical'])
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('category_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_products_category_id', 'product_categories', ['category_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_constraint('fk_products_category_id', type_='foreignkey')
        batch_op.drop_column('category_id')
    op.drop_index('ix_product_categories_vertical', table_name='product_categories')
    op.drop_table('product_categories')
