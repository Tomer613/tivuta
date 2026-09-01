"""add_vertical_default_sort

Revision ID: e5a19c3f7b2d
Revises: d84a2c7e10f5
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a19c3f7b2d'
down_revision: Union[str, Sequence[str], None] = 'd84a2c7e10f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('verticals') as batch_op:
        batch_op.add_column(sa.Column('default_sort', sa.String(length=20), nullable=False, server_default='popularity'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('verticals') as batch_op:
        batch_op.drop_column('default_sort')
