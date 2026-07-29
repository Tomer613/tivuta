"""add_customer_orders

Revision ID: 861a4db9d155
Revises: c2f8a4e1b6d0
Create Date: 2026-07-28 17:54:52.990091

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '861a4db9d155'
down_revision: Union[str, Sequence[str], None] = 'c2f8a4e1b6d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('customer_orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('history', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customer_orders_id'), 'customer_orders', ['id'], unique=False)
    op.create_index(op.f('ix_customer_orders_user_id'), 'customer_orders', ['user_id'], unique=False)
    with op.batch_alter_table('leads') as batch_op:
        batch_op.add_column(sa.Column('customer_order_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_leads_customer_order_id', 'customer_orders', ['customer_order_id'], ['id'])
        batch_op.create_index(op.f('ix_leads_customer_order_id'), ['customer_order_id'], unique=False)

    _backfill_customer_orders()


def _backfill_customer_orders() -> None:
    """
    Every pre-existing lead (any lead_type) gets wrapped in its own CustomerOrder, so order
    history isn't lost. Leads sharing a cart_group_id (created together via one cart checkout)
    are grouped into a single order, matching what cart_checkout will do going forward. Leads
    with no cart_group_id (appointments, card_order, and old single-item contact_request leads)
    each get their own one-line order, since there's no natural grouping key for those types.
    """
    bind = op.get_bind()
    metadata = sa.MetaData()
    customer_orders = sa.Table(
        'customer_orders', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer),
        sa.Column('notes', sa.Text),
        sa.Column('history', sa.JSON),
        sa.Column('created_at', sa.DateTime),
    )
    leads = sa.Table(
        'leads', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer),
        sa.Column('cart_group_id', sa.String),
        sa.Column('customer_order_id', sa.Integer),
        sa.Column('created_at', sa.DateTime),
    )

    # One order per distinct (user_id, cart_group_id) pair, oldest lead's created_at as the order's.
    cart_groups = bind.execute(
        sa.select(leads.c.user_id, leads.c.cart_group_id, sa.func.min(leads.c.created_at).label('created_at'))
        .where(leads.c.cart_group_id.isnot(None))
        .group_by(leads.c.user_id, leads.c.cart_group_id)
    ).fetchall()
    for user_id, cart_group_id, created_at in cart_groups:
        if user_id is None:
            continue
        result = bind.execute(
            customer_orders.insert().values(user_id=user_id, notes=None, history=[], created_at=created_at)
        )
        order_id = result.inserted_primary_key[0]
        bind.execute(
            leads.update()
            .where(leads.c.cart_group_id == cart_group_id, leads.c.user_id == user_id)
            .values(customer_order_id=order_id)
        )

    # Every remaining un-wrapped lead (no cart_group_id) gets its own one-line order.
    remaining = bind.execute(
        sa.select(leads.c.id, leads.c.user_id, leads.c.created_at)
        .where(leads.c.customer_order_id.is_(None))
    ).fetchall()
    for lead_id, user_id, created_at in remaining:
        if user_id is None:
            continue
        result = bind.execute(
            customer_orders.insert().values(user_id=user_id, notes=None, history=[], created_at=created_at)
        )
        order_id = result.inserted_primary_key[0]
        bind.execute(
            leads.update().where(leads.c.id == lead_id).values(customer_order_id=order_id)
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('leads') as batch_op:
        batch_op.drop_index(op.f('ix_leads_customer_order_id'))
        batch_op.drop_constraint('fk_leads_customer_order_id', type_='foreignkey')
        batch_op.drop_column('customer_order_id')
    op.drop_index(op.f('ix_customer_orders_user_id'), table_name='customer_orders')
    op.drop_index(op.f('ix_customer_orders_id'), table_name='customer_orders')
    op.drop_table('customer_orders')
