"""rename_notification_title_message_add_locale

Revision ID: 713be03ba859
Revises: b2cc8a3bc582
Create Date: 2026-08-30 12:24:44.079338

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '713be03ba859'
down_revision: Union[str, Sequence[str], None] = 'b2cc8a3bc582'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('notifications') as batch_op:
        batch_op.alter_column('title_he', new_column_name='title', existing_type=sa.String(length=255), existing_nullable=False)
        batch_op.alter_column('message_he', new_column_name='message', existing_type=sa.Text(), existing_nullable=True)
        batch_op.add_column(sa.Column('locale', sa.String(length=5), nullable=False, server_default='he'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('notifications') as batch_op:
        batch_op.drop_column('locale')
        batch_op.alter_column('message', new_column_name='message_he', existing_type=sa.Text(), existing_nullable=True)
        batch_op.alter_column('title', new_column_name='title_he', existing_type=sa.String(length=255), existing_nullable=False)
