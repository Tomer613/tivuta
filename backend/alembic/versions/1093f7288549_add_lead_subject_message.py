"""add_lead_subject_message

Revision ID: 1093f7288549
Revises: 1d4d53ad9e19
Create Date: 2026-08-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1093f7288549'
down_revision: Union[str, Sequence[str], None] = '1d4d53ad9e19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('leads', sa.Column('subject', sa.String(length=200), nullable=True))
    op.add_column('leads', sa.Column('message', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('leads', 'message')
    op.drop_column('leads', 'subject')
