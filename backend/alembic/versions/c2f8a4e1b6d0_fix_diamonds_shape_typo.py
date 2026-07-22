"""fix diamonds vertical shape option typo (ביתניה -> טיפה, pear shape)

The diamonds vertical's "shape" attribute_fields option was seeded with a typo
("ביתניה") instead of the correct Hebrew term for a pear-cut diamond ("טיפה").
Surgically fixes just that one option in place rather than overwriting the
whole attribute_fields row, so any admin customization made since seeding is
preserved.

Revision ID: c2f8a4e1b6d0
Revises: 91c9b7fe9361
Create Date: 2026-07-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c2f8a4e1b6d0'
down_revision: Union[str, Sequence[str], None] = '91c9b7fe9361'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_OLD_OPTION = "ביתניה"
_NEW_OPTION = "טיפה"


def _fix_options(bind, verticals_table, old_value: str, new_value: str) -> None:
    row = bind.execute(
        sa.select(verticals_table.c.id, verticals_table.c.attribute_fields)
        .where(verticals_table.c.slug == 'diamonds')
    ).first()
    if row is None:
        return

    fields = row.attribute_fields or []
    changed = False
    for field in fields:
        if field.get('key') == 'shape' and isinstance(field.get('options'), list):
            options = field['options']
            for i, opt in enumerate(options):
                if opt == old_value:
                    options[i] = new_value
                    changed = True

    if changed:
        bind.execute(
            verticals_table.update()
            .where(verticals_table.c.id == row.id)
            .values(attribute_fields=fields)
        )


def upgrade() -> None:
    bind = op.get_bind()
    verticals_table = sa.table(
        'verticals',
        sa.column('id', sa.Integer),
        sa.column('slug', sa.String),
        sa.column('attribute_fields', sa.JSON),
    )
    _fix_options(bind, verticals_table, _OLD_OPTION, _NEW_OPTION)


def downgrade() -> None:
    bind = op.get_bind()
    verticals_table = sa.table(
        'verticals',
        sa.column('id', sa.Integer),
        sa.column('slug', sa.String),
        sa.column('attribute_fields', sa.JSON),
    )
    _fix_options(bind, verticals_table, _NEW_OPTION, _OLD_OPTION)
