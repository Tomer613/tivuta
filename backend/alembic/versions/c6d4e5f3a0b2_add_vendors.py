"""add vendors table and products.vendor_id

Revision ID: c6d4e5f3a0b2
Revises: b5c3d4e2f9a1
Create Date: 2026-07-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'c6d4e5f3a0b2'
down_revision = 'b5c3d4e2f9a1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'vendors',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('vertical', sa.String(20), nullable=False),
        sa.Column('name_he', sa.String(255), nullable=False),
        sa.Column('name_en', sa.String(255), nullable=True),
        sa.Column('name_fr', sa.String(255), nullable=True),
        sa.Column('name_yi', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('availability', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_vendors_vertical', 'vendors', ['vertical'])
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('vendor_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_products_vendor_id', 'vendors', ['vendor_id'], ['id'])


def downgrade():
    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_constraint('fk_products_vendor_id', type_='foreignkey')
        batch_op.drop_column('vendor_id')
    op.drop_index('ix_vendors_vertical', table_name='vendors')
    op.drop_table('vendors')
