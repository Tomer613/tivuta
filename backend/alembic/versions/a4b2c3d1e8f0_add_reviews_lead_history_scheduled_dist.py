"""add reviews, lead history, scheduled_at dist

Revision ID: a4b2c3d1e8f0
Revises: a3f1c2d8e9b0
Create Date: 2026-07-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'a4b2c3d1e8f0'
down_revision = 'a3f1c2d8e9b0'
branch_labels = None
depends_on = None


def upgrade():
    # Add history JSON column to leads
    op.add_column('leads', sa.Column('history', sa.JSON(), nullable=True))

    # Add scheduled_at to distributions
    op.add_column('distributions', sa.Column('scheduled_at', sa.DateTime(), nullable=True))

    # Create reviews table
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lead_id', sa.Integer(), sa.ForeignKey('leads.id', ondelete='SET NULL'), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'product_id', name='uq_user_product_review'),
    )
    op.create_index('ix_reviews_id', 'reviews', ['id'], unique=False)


def downgrade():
    op.drop_index('ix_reviews_id', table_name='reviews')
    op.drop_table('reviews')
    op.drop_column('distributions', 'scheduled_at')
    op.drop_column('leads', 'history')
