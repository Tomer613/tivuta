import re

from pydantic import BaseModel, field_validator, model_validator
from typing import Dict, List, Optional
from datetime import datetime

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

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
    gender: Optional[str] = None
    city: Optional[str] = None
    birth_year: Optional[int] = None
    id_number: Optional[str] = None
    club_affiliation: Optional[str] = None
    membership_tracks: Optional[List[str]] = None
    notification_prefs: Optional[dict] = None
    customer_number: Optional[str] = None
    points_balance: int = 0

    class Config:
        from_attributes = True


class NotificationPrefsUpdate(BaseModel):
    lead_status: Optional[bool] = None
    appointment_reminder: Optional[bool] = None
    system: Optional[bool] = None
    promotions: Optional[bool] = None


class OrderRead(BaseModel):
    id: int
    title_he: str
    amount: float
    status: str
    date: datetime

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    phone: Optional[str] = None
    gender: Optional[str] = None   # "male" | "female"
    city: Optional[str] = None
    birth_year: Optional[int] = None
    id_number: Optional[str] = None
    club_affiliation: Optional[str] = None
    membership_tracks: Optional[List[str]] = None

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
class VendorDayAvailability(BaseModel):
    enabled: bool = False
    start: Optional[str] = None
    end: Optional[str] = None

    @field_validator("start", "end")
    @classmethod
    def _validate_time_format(cls, v):
        if v is not None and not _TIME_RE.match(v):
            raise ValueError("time must be in HH:MM 24h format")
        return v

    @model_validator(mode="after")
    def _validate_enabled_window(self):
        if self.enabled:
            if not self.start or not self.end:
                raise ValueError("start and end are required when enabled is true")
            if self.start >= self.end:
                raise ValueError("start must be before end")
        return self

class VendorAvailability(BaseModel):
    weekly: Dict[str, VendorDayAvailability] = {}
    slot_minutes: int = 30

class VendorBase(BaseModel):
    vertical: str
    name_he: str
    name_en: Optional[str] = None
    name_fr: Optional[str] = None
    name_yi: Optional[str] = None
    is_active: bool = True
    availability: Optional[VendorAvailability] = None
    commission_rate_percent: float = 0.0
    points_rate_percent: Optional[float] = None

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    vertical: Optional[str] = None
    name_he: Optional[str] = None
    name_en: Optional[str] = None
    name_fr: Optional[str] = None
    name_yi: Optional[str] = None
    is_active: Optional[bool] = None
    availability: Optional[VendorAvailability] = None
    commission_rate_percent: Optional[float] = None
    points_rate_percent: Optional[float] = None

class VendorRead(VendorBase):
    id: int
    commission_owed_total: float = 0.0

    class Config:
        from_attributes = True

class VendorBrief(BaseModel):
    id: int
    name_he: str
    name_en: Optional[str] = None
    is_active: bool = True
    availability: Optional[VendorAvailability] = None

    class Config:
        from_attributes = True


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
    vendor_id: Optional[int] = None

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
    vendor_id: Optional[int] = None

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
    view_count: int = 0
    avg_rating: Optional[float] = None
    review_count: int = 0
    promotions: List[PromotionBrief] = []
    vendor: Optional[VendorBrief] = None

    class Config:
        from_attributes = True


class ProductAnalyticsRead(BaseModel):
    id: int
    vertical: str
    title_he: str
    view_count: int
    favorite_count: int
    review_count: int
    avg_rating: Optional[float]
    lead_count: int

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
    product_count: int = 0

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

class LeadHistoryEntry(BaseModel):
    ts: str
    actor: Optional[str] = None
    action: str
    from_val: Optional[str] = None
    to_val: Optional[str] = None


class AdminLeadRead(BaseModel):
    id: int
    lead_type: str
    scheduled_at: Optional[datetime] = None
    status: str
    channel: str
    notes: Optional[str] = None
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    history: Optional[List[dict]] = []
    created_at: datetime
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    product_id: Optional[int] = None
    product_title_he: Optional[str] = None
    product_vertical: Optional[str] = None

    class Config:
        from_attributes = True


class LeadNotesUpdate(BaseModel):
    notes: str


class LeadAssignUpdate(BaseModel):
    assigned_to: Optional[int] = None


class LeadBulkAction(BaseModel):
    lead_ids: List[int]
    action: str          # 'set_status' | 'assign' | 'delete'
    value: Optional[str] = None   # status string or user_id string


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# Favorite Schemas
class FavoriteRead(BaseModel):
    id: int
    product_id: int
    created_at: datetime
    product: Optional["ProductRead"] = None

    class Config:
        from_attributes = True


# Notification Schemas
class NotificationRead(BaseModel):
    id: int
    type: str
    title_he: str
    message_he: Optional[str] = None
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Conversion Stats
class ConversionStats(BaseModel):
    vertical: str
    total: int
    confirmed: int
    contacted: int
    closed: int
    conversion_rate: float

class LeadHistoryRead(BaseModel):
    id: int
    lead_type: str
    scheduled_at: Optional[datetime] = None
    status: str
    created_at: datetime
    product_id: Optional[int] = None
    product_title_he: Optional[str] = None
    product_vertical: Optional[str] = None
    product_image_url: Optional[str] = None
    product_price: Optional[float] = None

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


# Loyalty program: system settings, sale transactions
class SystemSettingRead(BaseModel):
    key: str
    value: str

class SystemSettingsUpdate(BaseModel):
    settings: Dict[str, str]

class AdminSaleCreate(BaseModel):
    vendor_id: int
    customer_number: str
    amount_ils: float
    product_id: Optional[int] = None
    idempotency_key: str

class SaleTransactionRead(BaseModel):
    id: int
    vendor_id: int
    vendor_name_he: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    product_id: Optional[int] = None
    product_title_he: Optional[str] = None
    amount_ils: float
    points_awarded: int
    commission_rate_percent_snapshot: float
    commission_owed_ils: float
    status: str
    reported_at: datetime
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

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
    scheduled_at: Optional[datetime] = None
    filter_membership_track: Optional[str] = None
    filter_city: Optional[str] = None

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
    scheduled_at: Optional[datetime] = None
    filter_membership_track: Optional[str] = None
    filter_city: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    sent_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0

    class Config:
        from_attributes = True


# Review Schemas
class ReviewCreate(BaseModel):
    rating: int           # 1–5
    comment: Optional[str] = None

class ReviewRead(BaseModel):
    id: int
    user_id: int
    product_id: int
    lead_id: Optional[int] = None
    rating: int
    comment: Optional[str] = None
    is_approved: bool
    created_at: datetime
    user_name: Optional[str] = None

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