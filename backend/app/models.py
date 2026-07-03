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
    created_at = Column(DateTime, default=datetime.utcnow)

    promotions = relationship("Promotion", secondary=product_promotions_table, back_populates="products")


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


class Lead(Base):
    """
    Unifies appointment requests, contact requests and club signups into one table.
    """
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    lead_type = Column(String(30), nullable=False)  # 'appointment' | 'contact_request' | 'club_signup'
    scheduled_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="new")  # new | confirmed | contacted | closed | cancelled
    channel = Column(String(20), default="web")
    notes = Column(Text, nullable=True)
    locale = Column(String(5), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    product = relationship("Product")


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
    sent_at = Column(DateTime, nullable=True)

    survey = relationship("Survey")
    product = relationship("Product")
    send_logs = relationship("DistributionSendLog", back_populates="distribution", cascade="all, delete-orphan")


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