from pydantic import BaseModel
from typing import List, Optional

# Schema for Categories
class CategorySchema(BaseModel):
    id: int
    name_he: str
    name_en: str
    name_fr: str
    name_yi: str
    slug: str

    class Config:
        from_attributes = True

# Schema for Items (Benefits/Services)
class ItemSchema(BaseModel):
    id: int
    title_he: str
    title_en: str
    title_fr: str
    title_yi: str
    description_he: Optional[str] = None
    description_en: Optional[str] = None
    description_fr: Optional[str] = None
    description_yi: Optional[str] = None
    price: Optional[float] = None
    cat_id_new: Optional[int] = None
    image_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True