"""add_shopping_list_names

Revision ID: c8f3a9e21b47
Revises: a4d8f6c2e910
Create Date: 2026-09-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f3a9e21b47'
down_revision: Union[str, Sequence[str], None] = 'a4d8f6c2e910'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'shopping_list_names',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vertical', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('user_id', 'vertical', name='uq_user_vertical_shopping_list_name'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('shopping_list_names')
