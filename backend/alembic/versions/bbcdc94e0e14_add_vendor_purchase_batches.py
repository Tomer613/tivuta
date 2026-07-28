"""add_vendor_purchase_batches

Revision ID: bbcdc94e0e14
Revises: 861a4db9d155
Create Date: 2026-07-28 18:35:59.233055

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbcdc94e0e14'
down_revision: Union[str, Sequence[str], None] = '861a4db9d155'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('vendor_purchase_batches',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('vendor_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('ordered_at', sa.DateTime(), nullable=True),
    sa.Column('received_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendor_purchase_batches_id'), 'vendor_purchase_batches', ['id'], unique=False)
    op.create_index(op.f('ix_vendor_purchase_batches_vendor_id'), 'vendor_purchase_batches', ['vendor_id'], unique=False)

    # batch_alter_table (table-copy dance) required for SQLite, which can't ALTER a foreign key
    # constraint onto an existing table directly — plain add_column + create_foreign_key fails.
    with op.batch_alter_table('leads') as batch_op:
        batch_op.add_column(sa.Column('vendor_batch_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_leads_vendor_batch_id', 'vendor_purchase_batches', ['vendor_batch_id'], ['id'])
        batch_op.create_index(op.f('ix_leads_vendor_batch_id'), ['vendor_batch_id'], unique=False)

    # No backfill: every existing lead gets vendor_batch_id = NULL, correctly meaning
    # "not yet claimed into a procurement batch."


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('leads') as batch_op:
        batch_op.drop_index(op.f('ix_leads_vendor_batch_id'))
        batch_op.drop_constraint('fk_leads_vendor_batch_id', type_='foreignkey')
        batch_op.drop_column('vendor_batch_id')
    op.drop_index(op.f('ix_vendor_purchase_batches_vendor_id'), table_name='vendor_purchase_batches')
    op.drop_index(op.f('ix_vendor_purchase_batches_id'), table_name='vendor_purchase_batches')
    op.drop_table('vendor_purchase_batches')
