"""add verticals table (admin-managed "worlds") + widen products/vendors.vertical

Revision ID: 7d2a4f6c1e83
Revises: 20b196d5ff3e
Create Date: 2026-07-21

"""
import json

from alembic import op
import sqlalchemy as sa

revision = '7d2a4f6c1e83'
down_revision = '20b196d5ff3e'
branch_labels = None
depends_on = None


_SEED_VERTICALS = [
    {
        "slug": "diamonds",
        "label_he": "עולם היהלומים", "label_en": "Diamonds World",
        "label_fr": "Univers Diamants", "label_yi": "דימענט וועלט",
        "subtitle_he": "תכשיטים ויהלומים נבחרים", "subtitle_en": "Selected jewelry and diamonds",
        "subtitle_fr": "Bijoux et diamants sélectionnés", "subtitle_yi": "אויסגעקליבענע שמוק",
        "icon": "Gem", "supports_appointments": True, "display_order": 0,
        "attribute_fields": [
            {"key": "carat", "label_he": "קרט", "label_en": "Carat", "type": "number", "placeholder": "1.00"},
            {"key": "cut", "label_he": "חיתוך", "label_en": "Cut", "type": "select",
             "options": ["מעולה", "טוב מאוד", "טוב", "סביר", "בינוני"]},
            {"key": "color", "label_he": "צבע", "label_en": "Color", "type": "select",
             "options": ["D", "E", "F", "G", "H", "I", "J", "K"]},
            {"key": "clarity", "label_he": "ניקיון", "label_en": "Clarity", "type": "select",
             "options": ["IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1"]},
            {"key": "shape", "label_he": "צורה", "label_en": "Shape", "type": "select",
             "options": ["עגול", "נסיכה", "אמרלד", "אובל", "ביתניה", "קושן", "מרקיז"]},
        ],
    },
    {
        "slug": "cars",
        "label_he": "עולם הרכב", "label_en": "Cars World",
        "label_fr": "Univers Automobile", "label_yi": "אויטא וועלט",
        "subtitle_he": "דילים ברכבים חדשים ומשומשים", "subtitle_en": "Deals on new and used cars",
        "subtitle_fr": "Offres sur voitures neuves et d'occasion", "subtitle_yi": "דילס אויף אויטאס",
        "icon": "Car", "supports_appointments": False, "display_order": 1,
        "attribute_fields": [
            {"key": "brand", "label_he": "יצרן", "label_en": "Brand", "type": "text", "placeholder": "טויוטה"},
            {"key": "model", "label_he": "דגם", "label_en": "Model", "type": "text", "placeholder": "קאמרי"},
            {"key": "year", "label_he": "שנת ייצור", "label_en": "Year", "type": "number", "placeholder": "2024"},
            {"key": "mileage", "label_he": "ק\"מ", "label_en": "Mileage", "type": "number", "placeholder": "0"},
            {"key": "condition", "label_he": "מצב", "label_en": "Condition", "type": "select",
             "options": ["חדש", "יד שנייה", "לימוזינה"]},
            {"key": "fuel", "label_he": "דלק", "label_en": "Fuel", "type": "select",
             "options": ["בנזין", "דיזל", "היברידי", "חשמלי"]},
            {"key": "transmission", "label_he": "תיבת הילוכים", "label_en": "Transmission", "type": "select",
             "options": ["אוטומטי", "ידני"]},
        ],
    },
    {
        "slug": "insurance",
        "label_he": "עולם הביטוחים", "label_en": "Insurance World",
        "label_fr": "Univers Assurance", "label_yi": "אינשורענס וועלט",
        "subtitle_he": "ביטוחי רכב, בריאות ודירה", "subtitle_en": "Car, health and home insurance",
        "subtitle_fr": "Assurance auto, santé et habitation", "subtitle_yi": "אויטא, געזונטהייט און היים",
        "icon": "ShieldCheck", "supports_appointments": False, "display_order": 2,
        "attribute_fields": [
            {"key": "insurance_type", "label_he": "סוג ביטוח", "label_en": "Type", "type": "select",
             "options": ["רכב", "בריאות", "דירה", "חיים", "עסק"]},
            {"key": "coverage", "label_he": "רמת כיסוי", "label_en": "Coverage", "type": "select",
             "options": ["בסיסי", "מורחב", "מקיף"]},
            {"key": "deductible", "label_he": "השתתפות עצמית (₪)", "label_en": "Deductible", "type": "number",
             "placeholder": "2000"},
            {"key": "monthly_premium", "label_he": "פרמיה חודשית (₪)", "label_en": "Monthly", "type": "number",
             "placeholder": "150"},
        ],
    },
]


def upgrade():
    op.create_table(
        'verticals',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('slug', sa.String(50), nullable=False),
        sa.Column('label_he', sa.String(100), nullable=False),
        sa.Column('label_en', sa.String(100), nullable=True),
        sa.Column('label_fr', sa.String(100), nullable=True),
        sa.Column('label_yi', sa.String(100), nullable=True),
        sa.Column('subtitle_he', sa.String(255), nullable=True),
        sa.Column('subtitle_en', sa.String(255), nullable=True),
        sa.Column('subtitle_fr', sa.String(255), nullable=True),
        sa.Column('subtitle_yi', sa.String(255), nullable=True),
        sa.Column('icon', sa.String(50), nullable=False, server_default='Store'),
        sa.Column('supports_appointments', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('attribute_fields', sa.JSON(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_verticals_slug', 'verticals', ['slug'], unique=True)

    with op.batch_alter_table('products') as batch_op:
        batch_op.alter_column('vertical', type_=sa.String(50), existing_type=sa.String(20), existing_nullable=False)
    with op.batch_alter_table('vendors') as batch_op:
        batch_op.alter_column('vertical', type_=sa.String(50), existing_type=sa.String(20), existing_nullable=False)

    bind = op.get_bind()
    verticals_table = sa.table(
        'verticals',
        sa.column('slug', sa.String), sa.column('label_he', sa.String), sa.column('label_en', sa.String),
        sa.column('label_fr', sa.String), sa.column('label_yi', sa.String),
        sa.column('subtitle_he', sa.String), sa.column('subtitle_en', sa.String),
        sa.column('subtitle_fr', sa.String), sa.column('subtitle_yi', sa.String),
        sa.column('icon', sa.String), sa.column('supports_appointments', sa.Boolean),
        sa.column('attribute_fields', sa.JSON), sa.column('display_order', sa.Integer),
        sa.column('is_active', sa.Boolean), sa.column('created_at', sa.DateTime),
    )
    now = sa.func.now()
    for seed in _SEED_VERTICALS:
        bind.execute(
            verticals_table.insert().values(
                slug=seed["slug"],
                label_he=seed["label_he"], label_en=seed["label_en"],
                label_fr=seed["label_fr"], label_yi=seed["label_yi"],
                subtitle_he=seed["subtitle_he"], subtitle_en=seed["subtitle_en"],
                subtitle_fr=seed["subtitle_fr"], subtitle_yi=seed["subtitle_yi"],
                icon=seed["icon"], supports_appointments=seed["supports_appointments"],
                attribute_fields=seed["attribute_fields"], display_order=seed["display_order"],
                is_active=True, created_at=now,
            )
        )


def downgrade():
    with op.batch_alter_table('vendors') as batch_op:
        batch_op.alter_column('vertical', type_=sa.String(20), existing_type=sa.String(50), existing_nullable=False)
    with op.batch_alter_table('products') as batch_op:
        batch_op.alter_column('vertical', type_=sa.String(20), existing_type=sa.String(50), existing_nullable=False)

    op.drop_index('ix_verticals_slug', table_name='verticals')
    op.drop_table('verticals')
