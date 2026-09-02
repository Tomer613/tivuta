"""add_shopping_lists_multi

Revision ID: f3a7c9e1d642
Revises: c8f3a9e21b47
Create Date: 2026-09-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a7c9e1d642'
down_revision: Union[str, Sequence[str], None] = 'c8f3a9e21b47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'shopping_lists',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vertical', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_shopping_lists_vertical'), 'shopping_lists', ['vertical'], unique=False)

    with op.batch_alter_table('shopping_list_items') as batch_op:
        batch_op.add_column(sa.Column('shopping_list_id', sa.Integer(), nullable=True))

    _backfill_shopping_lists()

    with op.batch_alter_table('shopping_list_items') as batch_op:
        batch_op.alter_column('shopping_list_id', nullable=False)
        batch_op.create_foreign_key('fk_shopping_list_items_shopping_list_id', 'shopping_lists', ['shopping_list_id'], ['id'], ondelete='CASCADE')
        batch_op.drop_constraint('uq_user_product_shopping_list_item', type_='unique')
        batch_op.create_unique_constraint('uq_shopping_list_product', ['shopping_list_id', 'product_id'])
        batch_op.drop_column('user_id')

    op.drop_table('shopping_list_names')


def _backfill_shopping_lists() -> None:
    """
    Every pre-existing (user_id, vertical) pair that has shopping_list_items and/or a
    shopping_list_names row becomes exactly one ShoppingList — carrying over the existing custom
    name if one was set (else falling back to the vertical's own label_he), with all of that
    pair's existing items re-pointed at the new list. This is what makes today's "one list per
    world" data land as each user's first (and, until they create more, only) named list rather
    than being lost in the restructure.
    """
    bind = op.get_bind()
    metadata = sa.MetaData()
    shopping_lists = sa.Table(
        'shopping_lists', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer),
        sa.Column('vertical', sa.String),
        sa.Column('name', sa.String),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    items = sa.Table(
        'shopping_list_items', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer),
        sa.Column('product_id', sa.Integer),
        sa.Column('shopping_list_id', sa.Integer),
        sa.Column('created_at', sa.DateTime),
    )
    products = sa.Table(
        'products', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('vertical', sa.String),
    )
    names = sa.Table(
        'shopping_list_names', metadata,
        sa.Column('user_id', sa.Integer),
        sa.Column('vertical', sa.String),
        sa.Column('name', sa.String),
    )
    verticals = sa.Table(
        'verticals', metadata,
        sa.Column('slug', sa.String),
        sa.Column('label_he', sa.String),
    )

    product_vertical = {pid: v for pid, v in bind.execute(sa.select(products.c.id, products.c.vertical)).fetchall()}
    vertical_label = {slug: label for slug, label in bind.execute(sa.select(verticals.c.slug, verticals.c.label_he)).fetchall()}
    custom_names = {
        (user_id, vertical): name
        for user_id, vertical, name in bind.execute(sa.select(names.c.user_id, names.c.vertical, names.c.name)).fetchall()
    }

    item_rows = bind.execute(sa.select(items.c.id, items.c.user_id, items.c.product_id, items.c.created_at)).fetchall()
    items_by_pair: dict[tuple, list] = {}
    earliest_created_at: dict[tuple, object] = {}
    for item_id, user_id, product_id, created_at in item_rows:
        vertical = product_vertical.get(product_id)
        if user_id is None or vertical is None:
            continue
        key = (user_id, vertical)
        items_by_pair.setdefault(key, []).append(item_id)
        if key not in earliest_created_at or (created_at is not None and created_at < earliest_created_at[key]):
            earliest_created_at[key] = created_at

    all_pairs = set(items_by_pair.keys()) | set(custom_names.keys())
    for user_id, vertical in all_pairs:
        name = custom_names.get((user_id, vertical)) or vertical_label.get(vertical) or vertical
        created_at = earliest_created_at.get((user_id, vertical))
        result = bind.execute(
            shopping_lists.insert().values(
                user_id=user_id, vertical=vertical, name=name, created_at=created_at, updated_at=created_at
            )
        )
        list_id = result.inserted_primary_key[0]
        item_ids = items_by_pair.get((user_id, vertical))
        if item_ids:
            bind.execute(items.update().where(items.c.id.in_(item_ids)).values(shopping_list_id=list_id))


def downgrade() -> None:
    """Downgrade schema. Structural reversal only — matches this codebase's existing convention
    (see e.g. 861a4db9d155's downgrade) of not attempting to perfectly reconstruct the pre-upgrade
    data shape. The old model allowed at most one list per (user, vertical) and one row per (user,
    product) globally — real multi-list data (two lists in the same vertical, or the same product
    on two different lists) has no lossless equivalent there, so this keeps one arbitrary
    surviving list's name per (user, vertical) and drops duplicate/conflicting item rows rather
    than erroring. Not expected to run against real multi-list production data in practice."""
    op.create_table(
        'shopping_list_names',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vertical', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('user_id', 'vertical', name='uq_user_vertical_shopping_list_name'),
    )

    with op.batch_alter_table('shopping_list_items') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))

    bind = op.get_bind()
    metadata = sa.MetaData()
    shopping_lists = sa.Table(
        'shopping_lists', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer),
        sa.Column('vertical', sa.String),
        sa.Column('name', sa.String),
    )
    items = sa.Table(
        'shopping_list_items', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('shopping_list_id', sa.Integer),
        sa.Column('product_id', sa.Integer),
        sa.Column('user_id', sa.Integer),
    )
    names = sa.Table(
        'shopping_list_names', metadata,
        sa.Column('user_id', sa.Integer),
        sa.Column('vertical', sa.String),
        sa.Column('name', sa.String),
    )

    list_rows = bind.execute(
        sa.select(shopping_lists.c.id, shopping_lists.c.user_id, shopping_lists.c.vertical, shopping_lists.c.name)
    ).fetchall()
    name_by_pair: dict[tuple, str] = {}
    for list_id, user_id, vertical, name in list_rows:
        bind.execute(items.update().where(items.c.shopping_list_id == list_id).values(user_id=user_id))
        name_by_pair[(user_id, vertical)] = name  # last list wins if several share a (user, vertical)
    for (user_id, vertical), name in name_by_pair.items():
        bind.execute(names.insert().values(user_id=user_id, vertical=vertical, name=name))

    # Two different lists could each hold the same product for the same user — the old model has
    # room for only one such row, so keep the lowest item id per (user_id, product_id) and drop
    # the rest before the unique constraint below would otherwise reject them.
    seen: set = set()
    dup_ids: list = []
    for item_id, user_id, product_id in bind.execute(
        sa.select(items.c.id, items.c.user_id, items.c.product_id).order_by(items.c.id.asc())
    ).fetchall():
        key = (user_id, product_id)
        if key in seen:
            dup_ids.append(item_id)
        else:
            seen.add(key)
    if dup_ids:
        bind.execute(items.delete().where(items.c.id.in_(dup_ids)))

    with op.batch_alter_table('shopping_list_items') as batch_op:
        batch_op.alter_column('user_id', nullable=False)
        batch_op.create_foreign_key('fk_shopping_list_items_user_id', 'users', ['user_id'], ['id'], ondelete='CASCADE')
        batch_op.drop_constraint('uq_shopping_list_product', type_='unique')
        batch_op.create_unique_constraint('uq_user_product_shopping_list_item', ['user_id', 'product_id'])
        batch_op.drop_constraint('fk_shopping_list_items_shopping_list_id', type_='foreignkey')
        batch_op.drop_column('shopping_list_id')

    op.drop_index(op.f('ix_shopping_lists_vertical'), table_name='shopping_lists')
    op.drop_table('shopping_lists')
