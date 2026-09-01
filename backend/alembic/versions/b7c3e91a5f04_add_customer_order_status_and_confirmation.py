"""add_customer_order_status_and_confirmation

Revision ID: b7c3e91a5f04
Revises: f3a91c8b4d02
Create Date: 2026-09-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c3e91a5f04'
down_revision: Union[str, Sequence[str], None] = 'f3a91c8b4d02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('customer_orders') as batch_op:
        batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=False, server_default='new'))
        batch_op.add_column(sa.Column('confirmation_token', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('confirmation_deadline', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('reminder_sent_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('confirmed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('cancelled_at', sa.DateTime(), nullable=True))
        batch_op.create_unique_constraint('uq_customer_orders_confirmation_token', ['confirmation_token'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('customer_orders') as batch_op:
        batch_op.drop_constraint('uq_customer_orders_confirmation_token', type_='unique')
        batch_op.drop_column('cancelled_at')
        batch_op.drop_column('confirmed_at')
        batch_op.drop_column('reminder_sent_at')
        batch_op.drop_column('confirmation_deadline')
        batch_op.drop_column('confirmation_token')
        batch_op.drop_column('status')
