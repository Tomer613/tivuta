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

class ProductUpdate(BaseModel):
    vertical: Optional[str] = None
    title_he: Optional[str] = None
    title_en: Optional[str] = None
    title_fr: Optional[str] = None
    title_yi: Optional[str] = None
    description_he: Optional[str] = None
    description_en: Optional[str] = None
    description_fr: Optional[str] = None
    description_yi: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    attributes: Optional[dict] = None
    is_active: Optional[bool] = None

class PromotionBrief(BaseModel):
    id: int
    name_he: str
    name_en: Optional[str] = None
    type: str
    channel: str
    config: dict = {}
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductRead(ProductBase):
    id: int
    promotions: List[PromotionBrief] = []

    class Config:
        from_attributes = True


# Promotion Schemas
class PromotionBase(BaseModel):
    name_he: str
    name_en: Optional[str] = None
    type: str
    channel: str = "both"
    config: dict = {}
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class PromotionCreate(PromotionBase):
    pass

class PromotionUpdate(BaseModel):
    name_he: Optional[str] = None
    name_en: Optional[str] = None
    type: Optional[str] = None
    channel: Optional[str] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class PromotionRead(PromotionBase):
    id: int
    created_at: datetime
    entry_count: int = 0

    class Config:
        from_attributes = True

class ProductAssignRequest(BaseModel):
    product_ids: List[int]

# Promotion Entry Schemas
class PromotionEntryRead(BaseModel):
    id: int
    promotion_id: int
    product_id: int
    entered_at: datetime
    is_winner: bool

    class Config:
        from_attributes = True

class PromotionStatusRead(BaseModel):
    promotion_id: int
    type: str
    name_he: str
    participants_count: int
    limit: Optional[int] = None
    remaining: Optional[int] = None
    is_full: bool = False
    is_closed: bool = False
    end_date: Optional[datetime] = None
    winner_name: Optional[str] = None
    has_entered: bool = False
    is_current_user_winner: bool = False

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
    product_title_he: Optional[str] = None
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
    survey_title: Optional[str] = None
    product_title: Optional[str] = None
    title_he: Optional[str] = None
    message_he: Optional[str] = None
    channels: List[str]
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None
    sent_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0

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