from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import random

from . import models, schemas, database

# Initialize the FastAPI app
app = FastAPI(title="Tivuta - The Working Haredi Ecosystem")

# Dependency to provide a database session for each request
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the Tivuta API", "status": "active"}

@app.get("/categories", response_model=List[schemas.CategorySchema])
def get_categories(db: Session = Depends(get_db)):
    """
    Fetch all categories with their sub-categories from the database.
    """
    try:
        categories = db.query(models.Category).filter(models.Category.is_active == True).all()
        return categories
    except Exception as e:
        print(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/trending", response_model=List[schemas.ItemSchema])
def get_trending_items(db: Session = Depends(get_db)):
    """
    Fetch trending items for the homepage.
    """
    try:
        db_items = db.query(models.Item).filter(models.Item.is_active == True).all()
        return db_items
    except Exception as e:
        print(f"Error fetching items: {e}")
        return []

@app.get("/categories/{slug}", response_model=schemas.CategorySchema)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Fetch a single category by slug, including its sub-categories.
    """
    category = db.query(models.Category).filter(models.Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@app.get("/categories/{slug}/items", response_model=List[schemas.ItemSchema])
def get_category_items(slug: str, db: Session = Depends(get_db)):
    """
    Fetch all items belonging to a specific category (via its sub-categories).
    """
    items = db.query(models.Item).join(models.SubCategory).join(models.Category).filter(models.Category.slug == slug).all()
    return items