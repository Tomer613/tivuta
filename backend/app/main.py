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

# Hardcoded Categories using EXACT slugs from the user's environment
MOCK_CATEGORIES = [
    {"id": 1, "name_he": "פיננסים וביטוחים", "slug": "finance_insurance"},
    {"id": 2, "name_he": "צרכנות", "slug": "consumerism"},
    {"id": 3, "name_he": "תיירות ונופש", "slug": "tourism_vacation"},
    {"id": 4, "name_he": "רכב ונדל\"ן", "slug": "auto_real_estate"},
    {"id": 5, "name_he": "למידה והעשרה", "slug": "learning_enrichment"},
    {"id": 6, "name_he": "תרבות הפנאי", "slug": "leisure_culture"}
]

# Hardcoded Items using cat_id_new (synced with MOCK_CATEGORIES)
MOCK_ITEMS = [
    {"id": 1, "title": "הלוואה לדיור ברבית מועדפת", "description": "הטבת מימון בלעדית לחברי הקהילה החרדית העובדת בשיתוף בנק מוביל.", "price": 0, "cat_id_new": 1, "is_active": True},
    {"id": 2, "title": "סל קניות משפחתי מוזל", "description": "סבסוד משמעותי על מוצרי יסוד ברשתות השיווק הנבחרות.", "price": 120, "cat_id_new": 2, "is_active": True},
    {"id": 3, "title": "נופש משפחתי בסינון קפדני", "description": "חבילות נופש מותאמות למשפחות חרדיות במלונות הכשרים ביותר.", "price": 2500, "cat_id_new": 3, "is_active": True},
    {"id": 4, "title": "ליסינג תפעולי לרכבי 7 מקומות", "description": "מסלולי מימון נוחים לרכבים משפחתיים מותאמים לקהילה.", "price": 1800, "cat_id_new": 4, "is_active": True},
    {"id": 5, "title": "קורס ניהול פרויקטים מתקדם", "description": "לימודי תעודה מקצועיים בסינון תוכן מותאם וסביבה נפרדת.", "price": 450, "cat_id_new": 5, "is_active": True},
    {"id": 6, "title": "מנוי שנתי לפארקי מים", "description": "הנחה משמעותית לכניסה בימים נפרדים לכל המשפחה.", "price": 85, "cat_id_new": 6, "is_active": True},
    {"id": 7, "title": "ייעוץ פנסיוני אובייקטיבי", "description": "בדיקת תיק פנסיוני ללא עלות על ידי מומחים בלתי תלויים.", "price": 0, "cat_id_new": 1, "is_active": True},
    {"id": 8, "title": "סדנת כלכלת בית נבונה", "description": "הכשרה פרקטית לניהול תקציב המשפחה בדרך התורה.", "price": 50, "cat_id_new": 5, "is_active": True},
]

@app.get("/")
def read_root():
    return {"message": "Welcome to the Tivuta API", "status": "active"}

@app.get("/categories", response_model=List[schemas.CategorySchema])
def get_categories():
    return MOCK_CATEGORIES

@app.get("/trending", response_model=List[schemas.ItemSchema])
def get_trending_items():
    return MOCK_ITEMS