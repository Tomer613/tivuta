"""survey max choices multiselect

Revision ID: 91c9b7fe9361
Revises: dcf603bb12f3
Create Date: 2026-07-22 10:02:26.177766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91c9b7fe9361'
down_revision: Union[str, Sequence[str], None] = 'dcf603bb12f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('surveys') as batch_op:
        batch_op.add_column(sa.Column('max_choices', sa.Integer(), nullable=False, server_default='1'))

    with op.batch_alter_table('survey_votes') as batch_op:
        batch_op.drop_constraint('uq_one_vote_per_survey', type_='unique')
        batch_op.create_unique_constraint('uq_one_vote_per_survey_option', ['survey_id', 'user_id', 'survey_option_id'])


def downgrade() -> None:
    with op.batch_alter_table('survey_votes') as batch_op:
        batch_op.drop_constraint('uq_one_vote_per_survey_option', type_='unique')
        batch_op.create_unique_constraint('uq_one_vote_per_survey', ['survey_id', 'user_id'])

    with op.batch_alter_table('surveys') as batch_op:
        batch_op.drop_column('max_choices')
