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

# Hardcoded Categories with Multi-language support
MOCK_CATEGORIES = [
    {
        "id": 1, 
        "name_he": "פיננסים וביטוחים", "name_en": "Finance & Insurance", "name_fr": "Finance et Assurance", "name_yi": "פינאנצן און אינשורענס",
        "slug": "finance_insurance"
    },
    {
        "id": 2, 
        "name_he": "צרכנות", "name_en": "Consumerism", "name_fr": "Consommation", "name_yi": "קנסומעריזם",
        "slug": "consumerism"
    },
    {
        "id": 3, 
        "name_he": "תיירות ונופש", "name_en": "Tourism & Vacation", "name_fr": "Tourisme et Vacances", "name_yi": "טוריזם און וואקאציע",
        "slug": "tourism_vacation"
    },
    {
        "id": 4, 
        "name_he": "רכב ונדל\"ן", "name_en": "Auto & Real Estate", "name_fr": "Auto et Immobilier", "name_yi": "אויטאס און ריעל עסטעיט",
        "slug": "auto_real_estate"
    },
    {
        "id": 5, 
        "name_he": "למידה והעשרה", "name_en": "Learning & Enrichment", "name_fr": "Apprentissage", "name_yi": "לערנען און העכערונג",
        "slug": "learning_enrichment"
    },
    {
        "id": 6, 
        "name_he": "תרבות הפנאי", "name_en": "Leisure & Culture", "name_fr": "Loisirs et Culture", "name_yi": "לייזשער און קולטור",
        "slug": "leisure_culture"
    }
]

# Hardcoded Items with Multi-language support
MOCK_ITEMS = [
    {
        "id": 1, 
        "title_he": "הלוואה לדיור ברבית מועדפת", "title_en": "Preferred Rate Housing Loan", "title_fr": "Prêt Logement à Taux Préférentiel", "title_yi": "הויז הלוואה מיט בעסערע פראצענט",
        "description_he": "הטבת מימון בלעדית לחברי הקהילה החרדית העובדת בשיתוף בנק מוביל.",
        "description_en": "Exclusive financing benefit for the working Haredi community in collaboration with a leading bank.",
        "description_fr": "Avantage de financement exclusif pour la communauté Harédi en collaboration avec une grande banque.",
        "description_yi": "עקסקלוסיוו פינאנציעלע הילף פארן ארבעטער ציבור.",
        "price": 0, "cat_id_new": 1, "is_active": True
    },
    {
        "id": 2, 
        "title_he": "סל קניות משפחתי מוזל", "title_en": "Discounted Family Food Basket", "title_fr": "Panier Alimentaire Familial à Prix Réduit", "title_yi": "ביליגערע עסן פאר די משפחה",
        "description_he": "סבסוד משמעותי על מוצרי יסוד ברשתות השיווק הנבחרות.",
        "description_en": "Significant subsidy on basic products in selected retail chains.",
        "description_fr": "Subvention importante sur les produits de base dans les chaînes de distribution sélectionnées.",
        "description_yi": "ביליגערע פרייזן אויף וויכטיגע פראדוקטן.",
        "price": 120, "cat_id_new": 2, "is_active": True
    },
    {
        "id": 3, 
        "title_he": "נופש משפחתי בסינון קפדני", "title_en": "Strictly Filtered Family Vacation", "title_fr": "Vacances Familiales avec Filtrage Strict", "title_yi": "וואקאציע פאר די משפחה מיט פילטער",
        "description_he": "חבילות נופש מותאמות למשפחות חרדיות במלונות הכשרים ביותר.",
        "description_en": "Vacation packages tailored for Haredi families in the most strictly kosher hotels.",
        "description_fr": "Forfaits vacances adaptés aux familles Harédi dans les hôtels les plus casher.",
        "description_yi": "וואקאציע פעקעדזשעס פארן היימישן ציבור.",
        "price": 2500, "cat_id_new": 3, "is_active": True
    },
    {
        "id": 5, 
        "title_he": "קורס ניהול פרויקטים מתקדם", "title_en": "Advanced Project Management Course", "title_fr": "Cours de Gestion de Projet Avancé", "title_yi": "פראזשעקט מענעדזשמענט קורס",
        "description_he": "לימודי תעודה מקצועיים בסינון תוכן מותאם וסביבה נפרדת.",
        "description_en": "Professional certification studies with filtered content in a separate environment.",
        "description_fr": "Études de certification professionnelle avec contenu filtré dans un environnement séparé.",
        "description_yi": "פראפעסיאנעלע שטודיעס פארן היימישן ציבור.",
        "price": 450, "cat_id_new": 5, "is_active": True
    }
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