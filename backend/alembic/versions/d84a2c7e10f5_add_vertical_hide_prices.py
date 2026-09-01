"""add_vertical_hide_prices

Revision ID: d84a2c7e10f5
Revises: c2d81f6b93ea
Create Date: 2026-09-01 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd84a2c7e10f5'
down_revision: Union[str, Sequence[str], None] = 'c2d81f6b93ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('verticals') as batch_op:
        batch_op.add_column(sa.Column('hide_prices', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('verticals') as batch_op:
        batch_op.drop_column('hide_prices')
