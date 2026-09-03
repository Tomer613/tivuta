"""add_user_is_gabbai

Revision ID: a8c3f0d5b217
Revises: f3a7c9e1d642
Create Date: 2026-09-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8c3f0d5b217'
down_revision: Union[str, Sequence[str], None] = 'f3a7c9e1d642'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('is_gabbai', sa.Boolean(), nullable=False, server_default=sa.false()))

    # Gabbai status used to be encoded as role="gabbai" — a single exclusive role column can't
    # represent "admin who is also a gabbai", which is exactly the real gap this migration closes.
    # Every pre-existing role="gabbai" account becomes role="member" + is_gabbai=True (they were
    # always plain members before self-registering — only members could reach that role value).
    op.execute("UPDATE users SET is_gabbai = 1, role = 'member' WHERE role = 'gabbai'")


def downgrade() -> None:
    """Downgrade schema. Structural best-effort only (matches this codebase's existing convention
    for reversing a decoupling migration): restores role='gabbai' for every is_gabbai=true row.
    This loses fidelity for any admin+gabbai combination created after this shipped — the old
    model has no slot for that — but is not expected to run against such data in practice."""
    op.execute("UPDATE users SET role = 'gabbai' WHERE is_gabbai = 1")
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_gabbai')
