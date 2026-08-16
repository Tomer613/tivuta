"""add_quantity_discount_bundles

Revision ID: d1def6807a27
Revises: 71938ad2ba93
Create Date: 2026-08-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1def6807a27'
down_revision: Union[str, Sequence[str], None] = '71938ad2ba93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'quantity_discount_bundles',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name_he', sa.String(255), nullable=False),
        sa.Column('name_en', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'quantity_discount_tiers',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('bundle_id', sa.Integer(), sa.ForeignKey('quantity_discount_bundles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('min_quantity', sa.Integer(), nullable=False),
        sa.Column('discount_percent', sa.Float(), nullable=False),
    )
    op.create_index('ix_quantity_discount_tiers_bundle_id', 'quantity_discount_tiers', ['bundle_id'])
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('quantity_discount_bundle_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_products_quantity_discount_bundle_id',
            'quantity_discount_bundles',
            ['quantity_discount_bundle_id'],
            ['id'],
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_constraint('fk_products_quantity_discount_bundle_id', type_='foreignkey')
        batch_op.drop_column('quantity_discount_bundle_id')
    op.drop_index('ix_quantity_discount_tiers_bundle_id', table_name='quantity_discount_tiers')
    op.drop_table('quantity_discount_tiers')
    op.drop_table('quantity_discount_bundles')
