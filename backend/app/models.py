from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Category(Base):
    """
    Represents high-level content groups (e.g., Leisure, Finance, Real Estate).
    """
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name_he = Column(String(100), nullable=False) # Hebrew display name
    slug = Column(String(100), unique=True, index=True) # URL-friendly name
    is_active = Column(Boolean, default=True)

    # Relationships
    sub_categories = relationship("SubCategory", back_populates="category")

class SubCategory(Base):
    """
    Specific niches within a category (e.g., 'Shows' under 'Leisure').
    """
    __tablename__ = "sub_categories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    name_he = Column(String(100), nullable=False)
    
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
    title = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=True)
    image_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sub_category = relationship("SubCategory", back_populates="items")