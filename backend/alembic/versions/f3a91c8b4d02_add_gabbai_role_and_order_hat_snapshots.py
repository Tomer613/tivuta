"""add_gabbai_role_and_order_hat_snapshots

Revision ID: f3a91c8b4d02
Revises: 713be03ba859
Create Date: 2026-08-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a91c8b4d02'
down_revision: Union[str, Sequence[str], None] = '713be03ba859'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('gabbai_community_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('gabbai_synagogue_address', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('gabbai_contact_name', sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column('gabbai_contact_phone', sa.String(length=30), nullable=True))

    with op.batch_alter_table('customer_orders') as batch_op:
        batch_op.add_column(sa.Column('orderer_role', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('gabbai_community_name_snapshot', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('gabbai_synagogue_address_snapshot', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('gabbai_contact_name_snapshot', sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column('gabbai_contact_phone_snapshot', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('custom_items_note', sa.Text(), nullable=True))

    with op.batch_alter_table('verticals') as batch_op:
        batch_op.add_column(sa.Column('requires_gabbai', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('allows_custom_items_note', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('verticals') as batch_op:
        batch_op.drop_column('allows_custom_items_note')
        batch_op.drop_column('requires_gabbai')

    with op.batch_alter_table('customer_orders') as batch_op:
        batch_op.drop_column('custom_items_note')
        batch_op.drop_column('gabbai_contact_phone_snapshot')
        batch_op.drop_column('gabbai_contact_name_snapshot')
        batch_op.drop_column('gabbai_synagogue_address_snapshot')
        batch_op.drop_column('gabbai_community_name_snapshot')
        batch_op.drop_column('orderer_role')

    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('gabbai_contact_phone')
        batch_op.drop_column('gabbai_contact_name')
        batch_op.drop_column('gabbai_synagogue_address')
        batch_op.drop_column('gabbai_community_name')
