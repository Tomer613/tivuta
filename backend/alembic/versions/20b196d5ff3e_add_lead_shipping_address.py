"""add leads.shipping_address (for card_order lead_type — physical loyalty card requests)

Revision ID: 20b196d5ff3e
Revises: 655114dc8ce0
Create Date: 2026-07-19

"""
from alembic import op
import sqlalchemy as sa

revision = '20b196d5ff3e'
down_revision = '655114dc8ce0'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('leads') as batch_op:
        batch_op.add_column(sa.Column('shipping_address', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('leads') as batch_op:
        batch_op.drop_column('shipping_address')
