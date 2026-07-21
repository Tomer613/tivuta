"""merge cart and verticals branches

Revision ID: dcf603bb12f3
Revises: 7d2a4f6c1e83, c7794c6bcb54
Create Date: 2026-07-21 21:09:44.004852

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dcf603bb12f3'
down_revision: Union[str, Sequence[str], None] = ('7d2a4f6c1e83', 'c7794c6bcb54')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
