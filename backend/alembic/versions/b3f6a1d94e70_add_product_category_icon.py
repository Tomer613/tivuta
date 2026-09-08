"""add_product_category_icon

Revision ID: b3f6a1d94e70
Revises: a8c3f0d5b217
Create Date: 2026-09-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f6a1d94e70'
down_revision: Union[str, Sequence[str], None] = 'a8c3f0d5b217'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('product_categories', sa.Column('icon', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('product_categories', 'icon')
