"""add products.popularity_score (confirmed-sale counter driving popularity sort)

Revision ID: 655114dc8ce0
Revises: 15f5ddaec4a5
Create Date: 2026-07-18

"""
from alembic import op
import sqlalchemy as sa

revision = '655114dc8ce0'
down_revision = '15f5ddaec4a5'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('products') as batch_op:
        batch_op.add_column(sa.Column('popularity_score', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('products') as batch_op:
        batch_op.drop_column('popularity_score')
