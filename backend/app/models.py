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
    customer_number = Column(String(24), unique=True, index=True, nullable=True)  # loyalty card serial, e.g. "TVT-XXXXXXXXXX"
    points_balance = Column(Integer, default=0, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="member", nullable=False)  # "member" | "admin"
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
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


class Vendor(Base):
    """
    A store/supplier for a single vertical (diamonds / cars / insurance).
    Defines the weekly appointment availability that products of that vendor inherit.
    """
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vertical = Column(String(20), nullable=False, index=True)  # 'diamonds' | 'cars' | 'insurance'

    name_he = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=True)
    name_fr = Column(String(255), nullable=True)
    name_yi = Column(String(255), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    # {"weekly": {"0": {"enabled": true, "start": "10:00", "end": "14:00"}, ... "6": {...}}, "slot_minutes": 30}
    # weekly keys "0".."6" = Sunday..Saturday (JS Date.getDay() convention)
    availability = Column(JSON, nullable=True, default=dict)

    # Loyalty program: vendor portal login (separate principal from `users`/role, a vendor is a store, not a person)
    login_email = Column(String(150), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    commission_rate_percent = Column(Float, default=0.0, nullable=False)  # % of each sale owed to Tivuta
    points_rate_percent = Column(Float, nullable=True)  # per-vendor override; falls back to SystemSetting default if null
    commission_owed_total = Column(Float, default=0.0, nullable=False)  # running balance owed, decremented on settlement

    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="vendor")


class Product(Base):
    """
    A catalog item for the new multi-vertical site (diamonds / cars / insurance).
    Deliberately separate from Item, which backs the relocated /benefits club catalog.
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    vertical = Column(String(20), nullable=False, index=True)  # 'diamonds' | 'cars' | 'insurance'

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
    attributes = Column(JSON, nullable=True)  # vertical-specific facets, e.g. {"carat": 1.2, "clarity": "VS1"}
    is_active = Column(Boolean, default=True)
    view_count = Column(Integer, default=0, nullable=False)
    popularity_score = Column(Integer, default=0, nullable=False)  # count of confirmed SaleTransaction rows
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    promotions = relationship("Promotion", secondary=product_promotions_table, back_populates="products")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    vendor = relationship("Vendor", back_populates="products")


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


class Lead(Base):
    """
    Unifies appointment requests, contact requests and club signups into one table.
    """
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    lead_type = Column(String(30), nullable=False)  # 'appointment' | 'contact_request' | 'club_signup'
    scheduled_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="new")  # new | confirmed | contacted | closed | cancelled
    channel = Column(String(20), default="web")
    notes = Column(Text, nullable=True)
    locale = Column(String(5), nullable=True)
    history = Column(JSON, nullable=True, default=list)  # audit trail [{ts, actor, action, from, to}]
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    product = relationship("Product")


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
    title_he = Column(String(255), nullable=False)
    message_he = Column(Text, nullable=True)
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
    created_at = Column(DateTime, default=datetime.utcnow)

    options = relationship("SurveyOption", back_populates="survey", cascade="all, delete-orphan")


class SurveyOption(Base):
    __tablename__ = "survey_options"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    label_override_he = Column(String(255), nullable=True)

    survey = relationship("Survey", back_populates="options")
    product = relationship("Product")
    votes = relationship("SurveyVote", back_populates="option", cascade="all, delete-orphan")


class SurveyVote(Base):
    __tablename__ = "survey_votes"
    __table_args__ = (UniqueConstraint("survey_id", "user_id", name="uq_one_vote_per_survey"),)

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
    status = Column(String(20), default="draft")  # draft | sending | sent | failed
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_at = Column(DateTime, nullable=True)  # if set, send at this time
    sent_at = Column(DateTime, nullable=True)
    filter_membership_track = Column(String(100), nullable=True)  # if set, send only to users with this track
    filter_city = Column(String(100), nullable=True)  # if set, send only to users in this city

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


class SystemSetting(Base):
    """Flat key/value config, e.g. point_value_ils — values that must be tunable without a code change."""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)


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