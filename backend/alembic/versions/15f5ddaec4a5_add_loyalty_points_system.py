"""add loyalty points/commission system (sale_transactions, points_ledger_entries,
commission_settlement_periods, system_settings, vendor portal + user loyalty columns)

Revision ID: 15f5ddaec4a5
Revises: c6d4e5f3a0b2
Create Date: 2026-07-18

"""
import secrets

from alembic import op
import sqlalchemy as sa

revision = '15f5ddaec4a5'
down_revision = 'c6d4e5f3a0b2'
branch_labels = None
depends_on = None

_CUSTOMER_NUMBER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def _generate_customer_number(existing: set) -> str:
    while True:
        candidate = "TVT-" + "".join(secrets.choice(_CUSTOMER_NUMBER_ALPHABET) for _ in range(10))
        if candidate not in existing:
            existing.add(candidate)
            return candidate


def upgrade():
    # users: loyalty columns
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('customer_number', sa.String(24), nullable=True))
        batch_op.add_column(sa.Column('points_balance', sa.Integer(), nullable=False, server_default='0'))
    op.create_index('ix_users_customer_number', 'users', ['customer_number'], unique=True)

    # vendors: portal login + commission/points config
    with op.batch_alter_table('vendors') as batch_op:
        batch_op.add_column(sa.Column('login_email', sa.String(150), nullable=True))
        batch_op.add_column(sa.Column('hashed_password', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('commission_rate_percent', sa.Float(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('points_rate_percent', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('commission_owed_total', sa.Float(), nullable=False, server_default='0'))
    op.create_index('ix_vendors_login_email', 'vendors', ['login_email'], unique=True)

    op.create_table(
        'system_settings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.String(255), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_system_settings_key', 'system_settings', ['key'], unique=True)

    op.create_table(
        'commission_settlement_periods',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('vendor_id', sa.Integer(), sa.ForeignKey('vendors.id'), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('total_amount_ils', sa.Float(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('settled_at', sa.DateTime(), nullable=True),
        sa.Column('settled_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
    )

    op.create_table(
        'sale_transactions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('vendor_id', sa.Integer(), sa.ForeignKey('vendors.id'), nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id'), nullable=True),
        sa.Column('amount_ils', sa.Float(), nullable=False),
        sa.Column('idempotency_key', sa.String(64), nullable=False),
        sa.Column('points_awarded', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('commission_rate_percent_snapshot', sa.Float(), nullable=False),
        sa.Column('commission_owed_ils', sa.Float(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='reported'),
        sa.Column('settlement_period_id', sa.Integer(), sa.ForeignKey('commission_settlement_periods.id'), nullable=True),
        sa.Column('history', sa.JSON(), nullable=True),
        sa.Column('reported_at', sa.DateTime(), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_sale_transactions_idempotency_key', 'sale_transactions', ['idempotency_key'], unique=True)

    op.create_table(
        'points_ledger_entries',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sale_transaction_id', sa.Integer(), sa.ForeignKey('sale_transactions.id'), nullable=True),
        sa.Column('delta_points', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(30), nullable=False),
        sa.Column('balance_after', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    # Backfill customer_number for existing users so they can participate immediately
    # (new signups get one at registration time going forward — see routers/auth.py).
    bind = op.get_bind()
    existing_numbers = {
        row[0] for row in bind.execute(sa.text("SELECT customer_number FROM users WHERE customer_number IS NOT NULL"))
    }
    user_ids = [row[0] for row in bind.execute(sa.text("SELECT id FROM users WHERE customer_number IS NULL"))]
    for user_id in user_ids:
        number = _generate_customer_number(existing_numbers)
        bind.execute(
            sa.text("UPDATE users SET customer_number = :number WHERE id = :id"),
            {"number": number, "id": user_id},
        )


def downgrade():
    op.drop_table('points_ledger_entries')
    op.drop_index('ix_sale_transactions_idempotency_key', table_name='sale_transactions')
    op.drop_table('sale_transactions')
    op.drop_table('commission_settlement_periods')
    op.drop_index('ix_system_settings_key', table_name='system_settings')
    op.drop_table('system_settings')

    op.drop_index('ix_vendors_login_email', table_name='vendors')
    with op.batch_alter_table('vendors') as batch_op:
        batch_op.drop_column('commission_owed_total')
        batch_op.drop_column('points_rate_percent')
        batch_op.drop_column('commission_rate_percent')
        batch_op.drop_column('hashed_password')
        batch_op.drop_column('login_email')

    op.drop_index('ix_users_customer_number', table_name='users')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('points_balance')
        batch_op.drop_column('customer_number')
