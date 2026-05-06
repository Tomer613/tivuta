from pydantic import BaseModel
from typing import List, Optional

# Base schema for Sub-Category
class SubCategoryBase(BaseModel):
    id: int
    name_he: str

    class Config:
        from_attributes = True

# Schema for Category including its sub-categories
class CategorySchema(BaseModel):
    id: int
    name_he: str
    slug: str
    sub_categories: List[SubCategoryBase] = []

    class Config:
        from_attributes = True

# Schema for Items (Benefits/Services)
class ItemSchema(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    price: Optional[float] = None
    is_active: bool

    class Config:
        from_attributes = True