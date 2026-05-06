from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
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
    Fetch all categories with their nested sub-categories.
    Primary use: Main navigation and category-based browsing.
    """
    return db.query(models.Category).all()

@app.get("/trending", response_model=List[schemas.ItemSchema])
def get_trending_items(db: Session = Depends(get_db), limit: int = 8):
    """
    Fetch items in a fixed order during development to prevent UI flickering.
    """
    # Changed from random.sample to a fixed order for stability
    items = db.query(models.Item).filter(models.Item.is_active == True).order_by(models.Item.id).limit(limit).all()
    return items