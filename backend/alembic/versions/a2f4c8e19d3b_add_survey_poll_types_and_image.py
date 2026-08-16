"""add surveys.poll_type/image_url and make survey_options.product_id nullable (text polls)

Revision ID: a2f4c8e19d3b
Revises: 671716ab86a4
Create Date: 2026-08-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'a2f4c8e19d3b'
down_revision = '671716ab86a4'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('surveys') as batch_op:
        batch_op.add_column(sa.Column('poll_type', sa.String(20), nullable=False, server_default='product'))
        batch_op.add_column(sa.Column('image_url', sa.String(500), nullable=True))

    with op.batch_alter_table('survey_options') as batch_op:
        batch_op.alter_column('product_id', existing_type=sa.Integer(), nullable=True)


def downgrade():
    with op.batch_alter_table('survey_options') as batch_op:
        batch_op.alter_column('product_id', existing_type=sa.Integer(), nullable=False)

    with op.batch_alter_table('surveys') as batch_op:
        batch_op.drop_column('image_url')
        batch_op.drop_column('poll_type')
