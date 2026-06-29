from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_db

router = APIRouter(tags=["catalog"])


@router.get("/categories", response_model=List[schemas.CategorySchema])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).filter(models.Category.is_active == True).all()


@router.get("/trending", response_model=List[schemas.ItemSchema])
def get_trending_items(db: Session = Depends(get_db)):
    """
    Returns featured items. Falls back to top 8 active if none are featured.
    """
    featured = db.query(models.Item).filter(models.Item.is_featured == True, models.Item.is_active == True).all()
    if not featured:
        return db.query(models.Item).filter(models.Item.is_active == True).limit(8).all()
    return featured


@router.get("/items", response_model=List[schemas.ItemSchema])
def get_all_items(db: Session = Depends(get_db)):
    return db.query(models.Item).filter(models.Item.is_active == True).all()


@router.get("/categories/{slug}", response_model=schemas.CategorySchema)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("/categories/{slug}/items", response_model=List[schemas.ItemSchema])
def get_category_items(slug: str, db: Session = Depends(get_db)):
    return db.query(models.Item).join(models.SubCategory).join(models.Category).filter(models.Category.slug == slug).all()
