import re

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Dict, List, Literal, Optional
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
    commission_rate_percent: float = Field(0.0, ge=0, le=100)
    points_rate_percent: Optional[float] = Field(None, ge=0, le=100)

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
    commission_rate_percent: Optional[float] = Field(None, ge=0, le=100)
    points_rate_percent: Optional[float] = Field(None, ge=0, le=100)

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
    popularity_score: int = 0
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


# Vertical ("world") Schemas
# Must match frontend/src/lib/verticalIcons.tsx's VERTICAL_ICON_MAP keys exactly — lucide-react
# icons are statically imported there, so an icon value outside this list would render nothing.
VALID_VERTICAL_ICONS = ("Gem", "Car", "ShieldCheck", "Home", "Watch", "Briefcase", "Store", "Sparkles", "Heart", "Building2")


class VerticalAttributeField(BaseModel):
    key: str
    label_he: str
    label_en: Optional[str] = None
    label_fr: Optional[str] = None
    label_yi: Optional[str] = None
    type: Literal["text", "number", "select"] = "text"
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None


def _validate_unique_attribute_keys(fields: List["VerticalAttributeField"]) -> List["VerticalAttributeField"]:
    seen = set()
    for f in fields:
        if f.key in seen:
            raise ValueError(f"duplicate attribute_fields key: {f.key}")
        seen.add(f.key)
    return fields


class VerticalBase(BaseModel):
    label_he: str
    label_en: Optional[str] = None
    label_fr: Optional[str] = None
    label_yi: Optional[str] = None
    subtitle_he: Optional[str] = None
    subtitle_en: Optional[str] = None
    subtitle_fr: Optional[str] = None
    subtitle_yi: Optional[str] = None
    icon: str = "Store"
    supports_appointments: bool = False
    attribute_fields: List[VerticalAttributeField] = []
    display_order: int = 0
    is_active: bool = True

    @field_validator("attribute_fields")
    @classmethod
    def _validate_attribute_fields(cls, v: List[VerticalAttributeField]) -> List[VerticalAttributeField]:
        return _validate_unique_attribute_keys(v)


class VerticalCreate(VerticalBase):
    slug: str = Field(min_length=2, max_length=50)

    @field_validator("slug")
    @classmethod
    def _validate_slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9-]{2,50}$", v):
            raise ValueError("slug must be 2-50 lowercase letters, digits, or hyphens")
        return v

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, v: str) -> str:
        if v not in VALID_VERTICAL_ICONS:
            raise ValueError(f"icon must be one of {VALID_VERTICAL_ICONS}")
        return v


class VerticalUpdate(BaseModel):
    label_he: Optional[str] = None
    label_en: Optional[str] = None
    label_fr: Optional[str] = None
    label_yi: Optional[str] = None
    subtitle_he: Optional[str] = None
    subtitle_en: Optional[str] = None
    subtitle_fr: Optional[str] = None
    subtitle_yi: Optional[str] = None
    icon: Optional[str] = None
    supports_appointments: Optional[bool] = None
    attribute_fields: Optional[List[VerticalAttributeField]] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_VERTICAL_ICONS:
            raise ValueError(f"icon must be one of {VALID_VERTICAL_ICONS}")
        return v

    @field_validator("attribute_fields")
    @classmethod
    def _validate_attribute_fields(cls, v: Optional[List[VerticalAttributeField]]) -> Optional[List[VerticalAttributeField]]:
        if v is None:
            return v
        return _validate_unique_attribute_keys(v)


class VerticalRead(VerticalBase):
    id: int
    slug: str
    created_at: datetime

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

class ShippingAddress(BaseModel):
    full_name: str = Field(..., max_length=150)
    street: str = Field(..., max_length=255)
    city: str = Field(..., max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    phone: str = Field(..., max_length=20)

class CardOrderCreate(BaseModel):
    shipping_address: ShippingAddress
    locale: Optional[str] = None

class CartCheckoutItem(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1, le=99)

class CartCheckoutCreate(BaseModel):
    items: List[CartCheckoutItem] = Field(..., min_length=1, max_length=50)
    locale: Optional[str] = None

class LeadRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    product_id: Optional[int] = None
    lead_type: str
    scheduled_at: Optional[datetime] = None
    status: str
    channel: str
    shipping_address: Optional[dict] = None
    quantity: Optional[int] = None
    cart_group_id: Optional[str] = None
    customer_order_id: Optional[int] = None
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
    shipping_address: Optional[dict] = None
    quantity: Optional[int] = None
    cart_group_id: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerOrderLineRead(BaseModel):
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
    product_id: Optional[int] = None
    product_title_he: Optional[str] = None
    product_vertical: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name_he: Optional[str] = None
    shipping_address: Optional[dict] = None
    quantity: Optional[int] = None
    vendor_batch_id: Optional[int] = None

    class Config:
        from_attributes = True


class CustomerOrderRead(BaseModel):
    id: int
    order_number: str
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    items: List[CustomerOrderLineRead]

    class Config:
        from_attributes = True


class OrderNotesUpdate(BaseModel):
    notes: str


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
    max_choices: int = 1
    options: List[SurveyOptionCreate]

class SurveyUpdate(BaseModel):
    is_active: Optional[bool] = None
    max_choices: Optional[int] = None


# Loyalty program: system settings, sale transactions
class SystemSettingRead(BaseModel):
    key: str
    value: str

class SystemSettingsUpdate(BaseModel):
    settings: Dict[str, str]

class SaleCreateBase(BaseModel):
    customer_number: str = Field(..., max_length=24)
    amount_ils: float = Field(..., gt=0)
    product_id: Optional[int] = None
    idempotency_key: str = Field(..., min_length=1, max_length=64)

    @field_validator("customer_number")
    @classmethod
    def _normalize_customer_number(cls, v):
        return v.strip().upper()

class AdminSaleCreate(SaleCreateBase):
    vendor_id: int

class VendorSaleCreate(SaleCreateBase):
    """Same shape as AdminSaleCreate but with no vendor_id — the vendor's identity comes from
    their auth token (get_current_vendor), never from the request body."""
    pass

class SaleReviewAction(BaseModel):
    action: str  # 'confirm' | 'reverse'
    note: Optional[str] = None

class VendorAtRiskRead(BaseModel):
    vendor_id: int
    name_he: str
    commission_owed_total: float
    oldest_unsettled_days: Optional[int] = None
    over_threshold: bool

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

class PointsLedgerEntryRead(BaseModel):
    id: int
    delta_points: int
    reason: str
    balance_after: int
    vendor_name_he: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Loyalty program: vendor self-service portal
class VendorPortalAccessUpdate(BaseModel):
    login_email: str
    password: str = Field(..., min_length=8)

class VendorMeRead(BaseModel):
    id: int
    vertical: str
    name_he: str
    commission_rate_percent: float
    points_rate_percent: Optional[float] = None
    commission_owed_total: float

    class Config:
        from_attributes = True

class CommissionSettlementPeriodCreate(BaseModel):
    period_start: datetime
    period_end: datetime

    @model_validator(mode="after")
    def _validate_range(self):
        if self.period_start >= self.period_end:
            raise ValueError("period_start must be before period_end")
        return self

class CommissionSettlementPeriodSettle(BaseModel):
    note: Optional[str] = None

class CommissionSettlementPeriodRead(BaseModel):
    id: int
    vendor_id: int
    period_start: datetime
    period_end: datetime
    total_amount_ils: float
    status: str
    settled_at: Optional[datetime] = None
    note: Optional[str] = None

    class Config:
        from_attributes = True

class VendorPurchaseBatchCreate(BaseModel):
    lead_ids: List[int] = Field(..., min_length=1)


class VendorPurchaseBatchStatusUpdate(BaseModel):
    status: str


class VendorPurchaseBatchLineRead(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_title_he: Optional[str] = None
    quantity: Optional[int] = None
    status: str
    customer_order_id: Optional[int] = None
    order_number: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None

    class Config:
        from_attributes = True


class VendorPurchaseBatchRead(BaseModel):
    id: int
    batch_number: str
    vendor_id: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    ordered_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    items: List[VendorPurchaseBatchLineRead]

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
    max_choices: int = 1
    has_voted: bool = False
    my_option_ids: List[int] = []
    options: List[SurveyOptionRead] = []

    class Config:
        from_attributes = True

class SurveyVoteCreate(BaseModel):
    survey_option_ids: List[int]

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