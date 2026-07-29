"""add_vendor_specialty_contact_fields

Revision ID: 50da6b936e9b
Revises: bbcdc94e0e14
Create Date: 2026-07-29 11:32:18.045531

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '50da6b936e9b'
down_revision: Union[str, Sequence[str], None] = 'bbcdc94e0e14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('vendors', sa.Column('specialty', sa.String(length=255), nullable=True))
    op.add_column('vendors', sa.Column('contact_phone', sa.String(length=30), nullable=True))
    op.add_column('vendors', sa.Column('contact_email', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('vendors', 'contact_email')
    op.drop_column('vendors', 'contact_phone')
    op.drop_column('vendors', 'specialty')
