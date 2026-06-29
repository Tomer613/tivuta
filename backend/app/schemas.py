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
    role: str = "member"

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str  # "member" | "admin"

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str
    locale: Optional[str] = "he"

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Product Schemas (new multi-vertical site)
class ProductBase(BaseModel):
    vertical: str
    title_he: str
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    title_yi: Optional[str] = None
    description_he: str
    description_en: Optional[str] = None
    description_fr: Optional[str] = None
    description_yi: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    attributes: Optional[dict] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductRead(ProductBase):
    id: int

    class Config:
        from_attributes = True

# Lead Schemas
class LeadCreate(BaseModel):
    product_id: int
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    locale: Optional[str] = None

class LeadRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    product_id: Optional[int] = None
    lead_type: str
    scheduled_at: Optional[datetime] = None
    status: str
    channel: str
    created_at: datetime

    class Config:
        from_attributes = True

# Survey Schemas
class SurveyOptionCreate(BaseModel):
    product_id: int
    label_override_he: Optional[str] = None

class SurveyCreate(BaseModel):
    question_he: str
    question_en: Optional[str] = None
    question_fr: Optional[str] = None
    question_yi: Optional[str] = None
    options: List[SurveyOptionCreate]

class SurveyOptionRead(BaseModel):
    id: int
    product_id: int
    label_override_he: Optional[str] = None
    vote_count: int = 0

    class Config:
        from_attributes = True

class SurveyRead(BaseModel):
    id: int
    question_he: str
    question_en: Optional[str] = None
    question_fr: Optional[str] = None
    question_yi: Optional[str] = None
    is_active: bool
    options: List[SurveyOptionRead] = []

    class Config:
        from_attributes = True

class SurveyVoteCreate(BaseModel):
    survey_option_id: int

# Distribution Schemas
class DistributionCreate(BaseModel):
    distribution_type: str  # 'survey' | 'daily_deal'
    survey_id: Optional[int] = None
    product_id: Optional[int] = None
    title_he: Optional[str] = None
    message_he: Optional[str] = None
    channels: List[str]

class DistributionRead(BaseModel):
    id: int
    distribution_type: str
    survey_id: Optional[int] = None
    product_id: Optional[int] = None
    title_he: Optional[str] = None
    message_he: Optional[str] = None
    channels: List[str]
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

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