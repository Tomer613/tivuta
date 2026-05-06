from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

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
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sub_category = relationship("SubCategory", back_populates="items")