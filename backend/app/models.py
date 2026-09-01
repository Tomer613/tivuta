from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text, JSON, UniqueConstraint, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

product_promotions_table = Table(
    "product_promotions",
    Base.metadata,
    Column("id", Integer, primary_key=True),
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
    Column("promotion_id", Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False),
    Column("added_at", DateTime, default=datetime.utcnow),
    UniqueConstraint("product_id", "promotion_id", name="uq_product_promotion"),
)

class Category(Base):
    """
    Represents high-level content groups (e.g., Judaism, Dining, Finance).
    """
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name_he = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)
    name_fr = Column(String(100), nullable=True)
    name_yi = Column(String(100), nullable=True)
    slug = Column(String(100), unique=True, index=True)
    icon_name = Column(String(50), nullable=True) # Lucide icon name
    is_active = Column(Boolean, default=True)

    # Relationships
    sub_categories = relationship("SubCategory", back_populates="category", cascade="all, delete-orphan")

class SubCategory(Base):
    """
    Specific niches within a category (e.g., 'Judaica' under 'Judaism').
    """
    __tablename__ = "sub_categories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    name_he = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)
    name_fr = Column(String(100), nullable=True)
    name_yi = Column(String(100), nullable=True)
    slug = Column(String(100), index=True)
    
    # Relationships
    category = relationship("Category", back_populates="sub_categories")
    items = relationship("Item", back_populates="sub_category")

class Item(Base):
    """
    The actual service/benefit/content item.
    """
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    sub_category_id = Column(Integer, ForeignKey("sub_categories.id"))
    
    # Multilingual Titles
    title_he = Column(String(255), nullable=False)
    title_en = Column(String(255), nullable=True)
    title_fr = Column(String(255), nullable=True)
    title_yi = Column(String(255), nullable=True)

    # Multilingual Descriptions
    description_he = Column(Text, nullable=False)
    description_en = Column(Text, nullable=True)
    description_fr = Column(Text, nullable=True)
    description_yi = Column(Text, nullable=True)

    # Assets & Pricing
    image_url = Column(String(255), nullable=True) 
    price = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    is_monthly = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sub_category = relationship("SubCategory", back_populates="items")

class User(Base):
    """
    User account model.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    gender = Column(String(10), nullable=True)   # "male" | "female"
    city = Column(String(100), nullable=True)
    birth_year = Column(Integer, nullable=True)
    id_number = Column(String(20), nullable=True)
    club_affiliation = Column(String(100), nullable=True)
    membership_tracks = Column(JSON, nullable=True)  # list of selected track keys
    notification_prefs = Column(JSON, nullable=True)  # {"lead_status": true, "appointment_reminder": true, "system": true, "promotions": true}
    preferred_language = Column(String(5), nullable=True)  # "he" | "en" | "fr" | "yi"; NULL = no preference set
    customer_number = Column(String(24), unique=True, index=True, nullable=True)  # loyalty card serial, e.g. "TVT-XXXXXXXXXX"
    points_balance = Column(Integer, default=0, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="member", nullable=False)  # "member" | "admin" | "gabbai"
    # Gabbai (synagogue warden) self-service registration fields — populated once a "member"
    # completes the gabbai registration form in their profile; role becomes "gabbai" at that point.
    gabbai_community_name = Column(String(255), nullable=True)
    gabbai_synagogue_address = Column(String(255), nullable=True)
    gabbai_contact_name = Column(String(150), nullable=True)
    gabbai_contact_phone = Column(String(30), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")

class Order(Base):
    """
    User orders/transactions for dashboard tracking.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title_he = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="completed") # completed, pending, cancelled
    date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")


class Vertical(Base):
    """
    An admin-managed "world" (e.g. diamonds/cars/insurance) — the single source of truth for
    every vertical slug referenced by Product.vertical / Vendor.vertical. Admins can add new
    worlds without touching code; a new one only appears on the (statically-exported) frontend
    after the next build+deploy, which admin_create_vertical/admin_update_vertical trigger
    automatically via services/deploy_trigger.py.
    """
    __tablename__ = "verticals"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, index=True, nullable=False)

    label_he = Column(String(100), nullable=False)
    label_en = Column(String(100), nullable=True)
    label_fr = Column(String(100), nullable=True)
    label_yi = Column(String(100), nullable=True)

    subtitle_he = Column(String(255), nullable=True)
    subtitle_en = Column(String(255), nullable=True)
    subtitle_fr = Column(String(255), nullable=True)
    subtitle_yi = Column(String(255), nullable=True)

    icon = Column(String(50), nullable=False, default="Store")  # key into the frontend's fixed icon map
    supports_appointments = Column(Boolean, default=False, nullable=False)
    # If true, checking out from this vertical requires the buyer to be a registered gabbai
    # (User.role == "gabbai") and the resulting CustomerOrder is snapshotted as a gabbai order.
    requires_gabbai = Column(Boolean, default=False, nullable=False)
    # If true, the cart page shows a free-text "additional items/requests" box when the cart
    # contains an item from this vertical; the text is stored on CustomerOrder.custom_items_note.
    allows_custom_items_note = Column(Boolean, default=False, nullable=False)
    # If true, real prices are never shown to customers anywhere in this vertical's tiles/cart
    # lines (rendered the same way an on-request/null-price product already is) — except the
    # order-confirmation page (order_confirm.py) and every admin view, which always show real
    # prices regardless of this flag.
    hide_prices = Column(Boolean, default=False, nullable=False)
    # Which sort order GET /products defaults to for this vertical when the frontend hasn't
    # applied an explicit user choice yet — one of "popularity"|"newest"|"price_asc"|"price_desc"
    # (see schemas.VALID_SORT_OPTIONS). "popularity" matches the site-wide default this replaces.
    default_sort = Column(String(20), default="popularity", nullable=False)
    # [{"key": "carat", "label_he": "קרט", "label_en": "Carat", "type": "number"|"text"|"select", "options": [...]}]
    attribute_fields = Column(JSON, nullable=False, default=list)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


class Vendor(Base):
    """
    A store/supplier for a single vertical (diamonds / cars / insurance).
    Defines the weekly appointment availability that products of that vendor inherit.
    """
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vertical = Column(String(50), nullable=False, index=True)  # matches Vertical.slug

    name_he = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=True)
    name_fr = Column(String(255), nullable=True)
    name_yi = Column(String(255), nullable=True)

    specialty = Column(String(255), nullable=True)  # what this vendor actually supplies, e.g. "קוגלים"
    contact_phone = Column(String(30), nullable=True)  # who to call to place an order — distinct from login_email
    contact_email = Column(String(255), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    # {"weekly": {"0": {"enabled": true, "start": "10:00", "end": "14:00"}, ... "6": {...}}, "slot_minutes": 30}
    # weekly keys "0".."6" = Sunday..Saturday (JS Date.getDay() convention)
    availability = Column(JSON, nullable=True, default=dict)

    # Loyalty program: vendor portal login (separate principal from `users`/role, a vendor is a store, not a person)
    login_email = Column(String(150), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    commission_rate_percent = Column(Float, default=0.0, nullable=False)  # % of each sale owed to Tivuta
    points_rate_percent = Column(Float, nullable=True)  # per-vendor override; falls back to SystemSetting default if null
    commission_owed_total = Column(Float, default=0.0, nullable=False)  # running balance owed, decremented on settlement

    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="vendor")

    @property
    def vendor_code(self) -> str:
        return f"{self.id:03d}"


class ProductCategory(Base):
    """
    An admin-managed sub-category scoped to a single Vertical (e.g. "Rings"/"Necklaces" under
    diamonds). Deliberately separate from the legacy `Category`/`SubCategory` models above, which
    back the unrelated /benefits catalog — table/route names were chosen to avoid colliding with
    those (see routers/product_categories.py).
    """
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    vertical = Column(String(50), nullable=False, index=True)  # matches Vertical.slug

    label_he = Column(String(100), nullable=False)
    label_en = Column(String(100), nullable=True)
    label_fr = Column(String(100), nullable=True)
    label_yi = Column(String(100), nullable=True)

    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")


class QuantityDiscountBundle(Base):
    """
    An admin-defined "deal basket" ("סל מבצע") grouping any set of products. If the combined
    quantity of a customer's cart items drawn from this bundle's products crosses a tier
    threshold, every item in the bundle gets that tier's percentage off. A product belongs to at
    most one bundle at a time (nullable FK on Product, same shape as Vendor/ProductCategory) so
    "which bundle applies" is never ambiguous.
    """
    __tablename__ = "quantity_discount_bundles"

    id = Column(Integer, primary_key=True, index=True)
    name_he = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tiers = relationship(
        "QuantityDiscountTier",
        back_populates="bundle",
        cascade="all, delete-orphan",
        order_by="QuantityDiscountTier.min_quantity",
    )
    products = relationship("Product", back_populates="quantity_discount_bundle")

    @property
    def bundle_code(self) -> str:
        return f"QD-{self.id:06d}"


class QuantityDiscountTier(Base):
    """One quantity break within a QuantityDiscountBundle, e.g. '5+ units -> 15% off'."""
    __tablename__ = "quantity_discount_tiers"

    id = Column(Integer, primary_key=True, index=True)
    bundle_id = Column(Integer, ForeignKey("quantity_discount_bundles.id", ondelete="CASCADE"), nullable=False, index=True)
    min_quantity = Column(Integer, nullable=False)
    discount_percent = Column(Float, nullable=False)

    bundle = relationship("QuantityDiscountBundle", back_populates="tiers")


class Product(Base):
    """
    A catalog item for the new multi-vertical site (diamonds / cars / insurance).
    Deliberately separate from Item, which backs the relocated /benefits club catalog.
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    vertical = Column(String(50), nullable=False, index=True)  # matches Vertical.slug

    title_he = Column(String(255), nullable=False)
    title_en = Column(String(255), nullable=True)
    title_fr = Column(String(255), nullable=True)
    title_yi = Column(String(255), nullable=True)

    description_he = Column(Text, nullable=False)
    description_en = Column(Text, nullable=True)
    description_fr = Column(Text, nullable=True)
    description_yi = Column(Text, nullable=True)

    image_url = Column(String(255), nullable=True)
    price = Column(Float, nullable=True)
    sale_price = Column(Float, nullable=False, default=0.0)  # 0 = no sale; the one stored source of
    # truth for "מחיר מבצע" — a discount percent is always derived from (price, sale_price) at
    # display/edit time, never stored, so there is nothing that can drift out of sync.
    attributes = Column(JSON, nullable=True)  # vertical-specific facets, e.g. {"carat": 1.2, "clarity": "VS1"}
    is_active = Column(Boolean, default=True)
    view_count = Column(Integer, default=0, nullable=False)
    popularity_score = Column(Integer, default=0, nullable=False)  # count of confirmed SaleTransaction rows
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    quantity_discount_bundle_id = Column(Integer, ForeignKey("quantity_discount_bundles.id"), nullable=True)
    # NULL = stock not tracked for this product (unlimited, no low-stock badge, no reservation on
    # confirm) — the default, appropriate for non-physical-inventory verticals. A real integer
    # opts the product into tracking; see services/inventory.py for the only place this is ever
    # mutated (always alongside an InventoryLedgerEntry row, never a bare assignment).
    stock_quantity = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    promotions = relationship("Promotion", secondary=product_promotions_table, back_populates="products")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    vendor = relationship("Vendor", back_populates="products")
    category = relationship("ProductCategory", back_populates="products")
    quantity_discount_bundle = relationship("QuantityDiscountBundle", back_populates="products")


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    name_he = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=True)
    # first_n | raffle | percentage_discount | fixed_discount | flash_sale
    type = Column(String(50), nullable=False)
    # online | physical | both
    channel = Column(String(20), nullable=False, default="both")
    config = Column(JSON, nullable=False, default=dict)
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", secondary=product_promotions_table, back_populates="promotions")


class PromotionEntry(Base):
    __tablename__ = "promotion_entries"
    __table_args__ = (UniqueConstraint("user_id", "promotion_id", name="uq_user_promotion_entry"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    promotion_id = Column(Integer, ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    entered_at = Column(DateTime, default=datetime.utcnow)
    is_winner = Column(Boolean, default=False)

    user = relationship("User")
    promotion = relationship("Promotion")
    product = relationship("Product")


class CustomerOrder(Base):
    """
    Wraps one or more Leads created together (a cart checkout, or a single appointment/
    contact-request/card-order) under one customer-facing order number.
    """
    __tablename__ = "customer_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    history = Column(JSON, nullable=True, default=list)  # audit trail [{ts, action, from_val, to_val}]
    # Order-level status — separate from each line item's own Lead.status (deliberately different
    # words to avoid confusion: "confirmed" already means something at the line-item level).
    # "new" (admin still reviewing) -> "awaiting_customer" (admin clicked "finalize", one
    # consolidated email + confirmation link sent, confirmation_deadline ticking) ->
    # "customer_confirmed" (customer clicked the link in time) | "cancelled" (admin manually, or
    # auto-cancelled once confirmation_deadline passes with no response).
    status = Column(String(20), nullable=False, default="new")
    confirmation_token = Column(String(64), unique=True, nullable=True, index=True)
    confirmation_deadline = Column(DateTime, nullable=True)
    reminder_sent_at = Column(DateTime, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    # "Hat" snapshot, computed once at order-creation time (never re-derived from the live User
    # row afterward) — see User.gabbai_* fields. NULL/"member" for an ordinary order; "gabbai" plus
    # the 4 snapshot fields below when the order was placed from a vertical with
    # Vertical.requires_gabbai=True.
    orderer_role = Column(String(20), nullable=True)  # "member" | "gabbai"
    gabbai_community_name_snapshot = Column(String(255), nullable=True)
    gabbai_synagogue_address_snapshot = Column(String(255), nullable=True)
    gabbai_contact_name_snapshot = Column(String(150), nullable=True)
    gabbai_contact_phone_snapshot = Column(String(30), nullable=True)
    # Customer-submitted free text ("additional items not yet on the site") entered on the cart
    # page — deliberately separate from `notes` above, which is admin-authored (see PATCH
    # /admin/orders/{id}/notes). Only ever populated when the checkout included an item from a
    # vertical with Vertical.allows_custom_items_note=True.
    custom_items_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    leads = relationship("Lead", back_populates="customer_order", order_by="Lead.id")

    @property
    def order_number(self) -> str:
        return f"ORD-{self.id:06d}"


class Lead(Base):
    """
    Unifies appointment requests, contact requests and club signups into one table.
    """
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_order_id = Column(Integer, ForeignKey("customer_orders.id"), nullable=True, index=True)
    vendor_batch_id = Column(Integer, ForeignKey("vendor_purchase_batches.id"), nullable=True, index=True)
    lead_type = Column(String(30), nullable=False)  # 'appointment' | 'contact_request' | 'club_signup' | 'card_order' | 'general_inquiry'
    scheduled_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="new")  # new | confirmed | contacted | closed | cancelled
    channel = Column(String(20), default="web")
    notes = Column(Text, nullable=True)
    subject = Column(String(200), nullable=True)  # 'general_inquiry' leads only — customer-submitted, distinct from admin-editable `notes`
    message = Column(Text, nullable=True)  # 'general_inquiry' leads only — customer-submitted, distinct from admin-editable `notes`
    locale = Column(String(5), nullable=True)
    history = Column(JSON, nullable=True, default=list)  # audit trail [{ts, actor, action, from, to}]
    shipping_address = Column(JSON, nullable=True)  # {full_name, street, city, zip_code, phone} — 'card_order' leads only
    quantity = Column(Integer, nullable=True, default=1)
    cart_group_id = Column(String(40), nullable=True, index=True)  # shared across leads created from one cart checkout
    # Price snapshot, 'contact_request' leads only — computed once at checkout time by
    # services/pricing.py and never re-derived from the live Product row afterward, so a later
    # price/sale/bundle change never rewrites what an already-placed order shows. NULL for every
    # other lead_type and for "on request" products (Product.price is None).
    unit_price_snapshot = Column(Float, nullable=True)  # actual per-unit price charged
    list_price_snapshot = Column(Float, nullable=True)  # plain regular price at that moment
    quantity_discount_percent_snapshot = Column(Float, nullable=True)  # tier percent applied (0 if none)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    product = relationship("Product")
    customer_order = relationship("CustomerOrder", back_populates="leads")
    vendor_batch = relationship("VendorPurchaseBatch", back_populates="leads")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_user_product_favorite"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    product = relationship("Product")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # lead_status | appointment_reminder | system | followup
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    locale = Column(String(5), nullable=False, default="he")  # language the title/message text is actually written in
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    question_he = Column(String(500), nullable=False)
    question_en = Column(String(500), nullable=True)
    question_fr = Column(String(500), nullable=True)
    question_yi = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    max_choices = Column(Integer, nullable=False, default=1)
    # "product" (compare products, the original poll shape) | "text" (plain multiple-choice
    # answers, no product involved). Immutable after creation - see schemas.SurveyUpdate.
    poll_type = Column(String(20), nullable=False, default="product", server_default="product")
    # Admin-set poll image (filename or full Supabase URL, same convention as
    # Product.image_url). Falls back to an option's product photo when unset - see
    # services/surveys.py's resolve_survey_image_url().
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    options = relationship("SurveyOption", back_populates="survey", cascade="all, delete-orphan")


class SurveyOption(Base):
    __tablename__ = "survey_options"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    # Nullable since a "text" poll (see Survey.poll_type) has no product per option.
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    label_override_he = Column(String(255), nullable=True)

    survey = relationship("Survey", back_populates="options")
    product = relationship("Product")
    votes = relationship("SurveyVote", back_populates="option", cascade="all, delete-orphan")


class SurveyVote(Base):
    __tablename__ = "survey_votes"
    __table_args__ = (UniqueConstraint("survey_id", "user_id", "survey_option_id", name="uq_one_vote_per_survey_option"),)

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    survey_option_id = Column(Integer, ForeignKey("survey_options.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    option = relationship("SurveyOption", back_populates="votes")


class Distribution(Base):
    """A broadcast campaign: either a survey push or a daily-deal product push."""
    __tablename__ = "distributions"

    id = Column(Integer, primary_key=True, index=True)
    distribution_type = Column(String(20), nullable=False)  # 'survey' | 'daily_deal'
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    title_he = Column(String(255), nullable=True)
    message_he = Column(Text, nullable=True)
    channels = Column(JSON, nullable=False)  # e.g. ["email", "whatsapp"]
    # draft | sending | awaiting_whatsapp_confirmation | sent | failed. WhatsApp has no automated
    # delivery confirmation (it's a client-side deep link, not an API) - a whatsapp-only
    # distribution lands in awaiting_whatsapp_confirmation until the admin explicitly confirms via
    # whatsapp_confirmed_at below, rather than being marked "sent" on nothing but an empty email loop.
    status = Column(String(20), default="draft")
    # Stamped the instant status flips to "sending" (both the real send and the scheduled-cron
    # pre-mark) - lets a periodic cron sweep (see /api/distributions/timeout-stuck-sends) tell a
    # genuinely stuck row apart from one that started seconds ago. NULL for any row that reached
    # "sending" before this column existed - those have no recorded start instant to time out
    # from and are deliberately left alone by the sweep (still need a manual delete).
    sending_started_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(DateTime, nullable=True)  # if set, send at this time
    sent_at = Column(DateTime, nullable=True)
    filter_membership_track = Column(String(100), nullable=True)  # if set, send only to users with this track
    filter_city = Column(String(100), nullable=True)  # if set, send only to users in this city
    # Set only when an admin explicitly confirms they completed the WhatsApp send - never inferred.
    whatsapp_confirmed_at = Column(DateTime, nullable=True)
    # True only for rows created via the one-click "manual WhatsApp share" quick-log endpoint
    # (e.g. the poll page's share button) - distinguishes a one-off share from a real
    # audience-targeted campaign created through the full "הפצה חדשה" form.
    is_manual_share = Column(Boolean, nullable=False, default=False, server_default="false")
    # Set at creation, read at send time - chooses which WhatsApp send mechanism the frontend uses:
    # False (default) opens the plain click-to-chat deep link (pre-filled text, no attachment);
    # True instead copies the caption to the clipboard and downloads the image, for an admin who
    # wants to attach a real photo manually. Persisted (not just transient form state) because
    # creation and sending can happen in separate sessions/times.
    whatsapp_manual_mode = Column(Boolean, nullable=False, default=False, server_default="false")

    survey = relationship("Survey")
    product = relationship("Product")
    send_logs = relationship("DistributionSendLog", back_populates="distribution", cascade="all, delete-orphan")


class Review(Base):
    """User rating + comment submitted after a lead is closed."""
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_user_product_review"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1–5
    comment = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    product = relationship("Product", back_populates="reviews")


class DistributionSendLog(Base):
    __tablename__ = "distribution_send_logs"

    id = Column(Integer, primary_key=True, index=True)
    distribution_id = Column(Integer, ForeignKey("distributions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel = Column(String(20), nullable=False)  # email | whatsapp
    status = Column(String(20), default="pending")  # pending | sent | failed
    provider_message_id = Column(String(255), nullable=True)
    error = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    distribution = relationship("Distribution", back_populates="send_logs")
    user = relationship("User")


class SystemSetting(Base):
    """Flat key/value config, e.g. point_value_ils — values that must be tunable without a code change."""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)


class PageView(Base):
    """First-party, anonymous pageview log — see CLAUDE.md's 'Self-Hosted Analytics' session.
    No IP address, no PII, no cross-site cookie; visitor_id is a client-generated random UUID
    stored in localStorage, purely for approximate unique-visitor counts."""
    __tablename__ = "page_views"

    id = Column(Integer, primary_key=True, index=True)
    path = Column(String(255), nullable=False, index=True)
    locale = Column(String(5), nullable=True)
    visitor_id = Column(String(40), nullable=True, index=True)
    referrer = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class SaleTransaction(Base):
    """
    Source of truth for an in-store sale reported by a vendor on behalf of a Tivuta member.
    Drives both the customer's points ledger and the vendor's commission-owed ledger.
    """
    __tablename__ = "sale_transactions"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)

    amount_ils = Column(Float, nullable=False)
    idempotency_key = Column(String(64), unique=True, index=True, nullable=False)

    points_awarded = Column(Integer, nullable=False, default=0)
    commission_rate_percent_snapshot = Column(Float, nullable=False)  # vendor's rate AT TIME OF SALE
    commission_owed_ils = Column(Float, nullable=False)

    status = Column(String(20), nullable=False, default="reported")  # reported | confirmed | flagged | reversed
    settlement_period_id = Column(Integer, ForeignKey("commission_settlement_periods.id"), nullable=True)
    history = Column(JSON, nullable=True, default=list)  # audit trail [{ts, actor, action, note}]

    reported_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

    vendor = relationship("Vendor")
    customer = relationship("User", foreign_keys=[customer_id])
    product = relationship("Product")
    settlement_period = relationship("CommissionSettlementPeriod", back_populates="transactions")


class PointsLedgerEntry(Base):
    """Append-only per-user points history — accruals, redemptions, admin adjustments, clawbacks."""
    __tablename__ = "points_ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sale_transaction_id = Column(Integer, ForeignKey("sale_transactions.id"), nullable=True)
    delta_points = Column(Integer, nullable=False)  # positive = accrual, negative = redemption/clawback
    reason = Column(String(30), nullable=False)  # sale | redemption | admin_adjustment | clawback
    balance_after = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    sale_transaction = relationship("SaleTransaction")


class InventoryLedgerEntry(Base):
    """Append-only per-product stock history — every mutation of Product.stock_quantity is
    written here alongside the atomic counter update (see services/inventory.py's adjust_stock,
    the only place either is ever touched), same "counter + audit trail" shape as
    PointsLedgerEntry above."""
    __tablename__ = "inventory_ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    delta = Column(Integer, nullable=False)  # positive = restock/adjustment up, negative = reserved/adjustment down
    reason = Column(String(30), nullable=False)  # admin_adjustment | order_reserved | order_restocked | initial_stock
    reference_order_id = Column(Integer, ForeignKey("customer_orders.id"), nullable=True)
    balance_after = Column(Integer, nullable=False)
    actor = Column(String(100), nullable=True)  # admin's name/email, or "system" for a cron-driven restock
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
    reference_order = relationship("CustomerOrder")


class CommissionSettlementPeriod(Base):
    """A period of confirmed vendor transactions manually reconciled/paid out-of-band (v1: no payment gateway)."""
    __tablename__ = "commission_settlement_periods"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    total_amount_ils = Column(Float, nullable=False, default=0.0)
    status = Column(String(20), nullable=False, default="open")  # open | settled
    settled_at = Column(DateTime, nullable=True)
    settled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    note = Column(Text, nullable=True)

    vendor = relationship("Vendor")
    transactions = relationship("SaleTransaction", back_populates="settlement_period")


class VendorPurchaseBatch(Base):
    """
    Groups Lead line items from many different CustomerOrders that share a vendor into one
    consolidated procurement action — e.g. 50 customers' kugel orders combined into one purchase
    from the vendor. Separate from Lead.status (customer-contact progress): this tracks
    procurement progress (open -> ordered -> received).
    """
    __tablename__ = "vendor_purchase_batches"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    status = Column(String(20), default="open")  # open | ordered | received
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    ordered_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)

    vendor = relationship("Vendor")
    leads = relationship("Lead", back_populates="vendor_batch", order_by="Lead.id")

    @property
    def batch_number(self) -> str:
        return f"PB-{self.vendor_id:03d}-{self.id:06d}"