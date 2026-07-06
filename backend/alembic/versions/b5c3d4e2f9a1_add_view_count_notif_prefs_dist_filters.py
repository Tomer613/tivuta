"""add view_count, notification_prefs, distribution filters

Revision ID: b5c3d4e2f9a1
Revises: a4b2c3d1e8f0
Create Date: 2026-07-06

"""
from alembic import op
import sqlalchemy as sa

revision = 'b5c3d4e2f9a1'
down_revision = 'a4b2c3d1e8f0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('notification_prefs', sa.JSON(), nullable=True))
    op.add_column('distributions', sa.Column('filter_membership_track', sa.String(100), nullable=True))
    op.add_column('distributions', sa.Column('filter_city', sa.String(100), nullable=True))


def downgrade():
    op.drop_column('distributions', 'filter_city')
    op.drop_column('distributions', 'filter_membership_track')
    op.drop_column('users', 'notification_prefs')
    op.drop_column('products', 'view_count')
