from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Schema for SubCategories
class SubCategorySchema(BaseModel):
    id: int
    name_he: str
    name_en: Optional[str] = None
    name_fr: Optional[str] = None
    name_yi: Optional[str] = None
    slug: str

    class Config:
        from_attributes = True

# Schema for Categories
class CategorySchema(BaseModel):
    id: int
    name_he: str
    name_en: Optional[str] = None
    name_fr: Optional[str] = None
    name_yi: Optional[str] = None
    slug: str
    icon_name: Optional[str] = None
    sub_categories: List[SubCategorySchema] = []

    class Config:
        from_attributes = True

# Schema for Items (Benefits/Services)
class ItemSchema(BaseModel):
    id: int
    sub_category_id: Optional[int] = None
    title_he: str
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    title_yi: Optional[str] = None
    description_he: str
    description_en: Optional[str] = None
    description_fr: Optional[str] = None
    description_yi: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    is_active: bool
    is_monthly: bool
    is_featured: bool

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Dashboard Schemas
class OrderRead(BaseModel):
    id: int
    title_he: str
    amount: float
    status: str
    date: datetime

    class Config:
        from_attributes = True

class DashboardData(BaseModel):
    distribution: List[dict] # [{"label": "Fashion", "value": 20}, ...]
    total_savings: float
    monthly_expenses: float
    recent_orders: List[OrderRead]