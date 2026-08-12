"""add_page_views

Revision ID: 4edae04e4800
Revises: 1093f7288549
Create Date: 2026-08-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4edae04e4800'
down_revision: Union[str, Sequence[str], None] = '1093f7288549'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('page_views',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('path', sa.String(length=255), nullable=False),
    sa.Column('locale', sa.String(length=5), nullable=True),
    sa.Column('visitor_id', sa.String(length=40), nullable=True),
    sa.Column('referrer', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_page_views_id'), 'page_views', ['id'], unique=False)
    op.create_index(op.f('ix_page_views_path'), 'page_views', ['path'], unique=False)
    op.create_index(op.f('ix_page_views_visitor_id'), 'page_views', ['visitor_id'], unique=False)
    op.create_index(op.f('ix_page_views_created_at'), 'page_views', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_page_views_created_at'), table_name='page_views')
    op.drop_index(op.f('ix_page_views_visitor_id'), table_name='page_views')
    op.drop_index(op.f('ix_page_views_path'), table_name='page_views')
    op.drop_index(op.f('ix_page_views_id'), table_name='page_views')
    op.drop_table('page_views')
