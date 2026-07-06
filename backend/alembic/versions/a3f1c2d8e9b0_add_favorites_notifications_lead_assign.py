"""add favorites, notifications, lead assigned_to

Revision ID: a3f1c2d8e9b0
Revises: 99977981cac4
Create Date: 2026-07-06

"""
from alembic import op
import sqlalchemy as sa

revision = 'a3f1c2d8e9b0'
down_revision = '99977981cac4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add assigned_to to leads
    op.add_column('leads', sa.Column('assigned_to', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))

    # favorites table
    op.create_table(
        'favorites',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('user_id', 'product_id', name='uq_user_product_favorite'),
    )

    # notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title_he', sa.String(255), nullable=False),
        sa.Column('message_he', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True, default=False),
        sa.Column('link', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('favorites')
    op.drop_column('leads', 'assigned_to')
