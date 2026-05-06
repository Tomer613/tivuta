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

# Fully Expanded Hardcoded Items to match seed_items.py
MOCK_ITEMS = [
    {
        "id": 1, 
        "title_he": "הלוואה לדיור ברבית מועדפת", "title_en": "Preferred Rate Housing Loan", "title_fr": "Prêt Logement à Taux Préférentiel", "title_yi": "הויז הלוואה מיט בעסערע פראצענט",
        "description_he": "הטבת מימון בלעדית לחברי הקהילה החרדית העובדת בשיתוף בנק מוביל.",
        "description_en": "Exclusive financing benefit for the working Haredi community in collaboration with a leading bank.",
        "description_fr": "Avantage de financement exclusif.",
        "description_yi": "עקסקלוסיוו פינאנציעלע הילף פארן ארבעטער ציבור.",
        "price": 0, "cat_id_new": 1, "is_active": True, "image_url": "finance_hero.jpg"
    },
    {
        "id": 2, 
        "title_he": "סל קניות משפחתי מוזל", "title_en": "Discounted Family Food Basket", "title_fr": "Panier Alimentaire Familial à Prix Réduit", "title_yi": "ביליגערע עסן פאר די משפחה",
        "description_he": "סבסוד משמעותי על מוצרי יסוד ברשתות השיווק הנבחרות.",
        "description_en": "Significant subsidy on basic products in selected retail chains.",
        "description_fr": "Subvention importante sur les produits de base.",
        "description_yi": "ביליגערע פרייזן אויף וויכטיגע פראדוקטן.",
        "price": 120, "cat_id_new": 2, "is_active": True, "image_url": "consumer_vouchers.jpg"
    },
    {
        "id": 3, 
        "title_he": "נופש משפחתי בסינון קפדני", "title_en": "Strictly Filtered Family Vacation", "title_fr": "Vacances Familiales avec Filtrage Strict", "title_yi": "וואקאציע פאר די משפחה מיט פילטער",
        "description_he": "חבילות נופש מותאמות למשפחות חרדיות במלונות הכשרים ביותר.",
        "description_en": "Vacation packages tailored for Haredi families in the most strictly kosher hotels.",
        "description_fr": "Forfaits vacances adaptés aux familles Harédi.",
        "description_yi": "וואקאציע פעקעדזשעס פארן היימישן ציבור.",
        "price": 2500, "cat_id_new": 3, "is_active": True, "image_url": "culture_tours.jpg"
    },
    {
        "id": 5, 
        "title_he": "קורס ניהול פרויקטים מתקדם", "title_en": "Advanced Project Management Course", "title_fr": "Cours de Gestion de Projet Avancé", "title_yi": "פראזשעקט מענעדזשמענט קורס",
        "description_he": "לימודי תעודה מקצועיים בסינון תוכן מותאם וסביבה נפרדת.",
        "description_en": "Professional certification studies with filtered content in a separate environment.",
        "description_fr": "Études de certification professionnelle.",
        "description_yi": "פראפעסיאנעלע שטודיעס פארן היימישן ציבור.",
        "price": 450, "cat_id_new": 5, "is_active": True, "image_url": "placeholder.jpg"
    },
    {
        "id": 6, 
        "title_he": "ליסינג משפחתי משתלם", "title_en": "Affordable Family Leasing", "title_fr": "Leasing Familial Abordable", "title_yi": "משפחה ליסינג דיל",
        "description_he": "עסקאות ליסינג ייחודיות לרכבי 7 מקומות למשפחות ברוכות ילדים.",
        "description_en": "Unique leasing deals for 7-seater vehicles for large families.",
        "description_fr": "Offres de leasing uniques.",
        "description_yi": "ספעציעלע ליסינג דילס פאר גרויסע משפחות.",
        "price": 1800, "cat_id_new": 4, "is_active": True, "image_url": "auto_deal.jpg"
    },
    {
        "id": 7,
        "title_he": "סיור חומות ירושלים", "title_en": "Jerusalem Walls Tour", "title_fr": "Tour des Murs de Jérusalem", "title_yi": "ירושלים ווענט טור",
        "description_he": "סיור מקצועי ומודרך על חומות העיר העתיקה.",
        "description_en": "Professional guided tour of the Old City walls.",
        "description_fr": "Visite guidée professionnelle.",
        "description_yi": "א פראפעסיאנעלע טור אויף די ווענט פון ירושלים.",
        "price": 45, "cat_id_new": 6, "is_active": True, "image_url": "culture_tours.jpg"
    },
    {
        "id": 8,
        "title_he": "מחזמר משפחתי: המורשת האבודה", "title_en": "Family Musical: The Lost Heritage", "title_fr": "Comédie Musicale: L'Héritage Perdu", "title_yi": "פאמיליע מוזיקל",
        "description_he": "מופע איכותי לכל המשפחה באישור גדולי ישראל.",
        "description_en": "High-quality musical for the whole family, fully kosher-certified.",
        "description_fr": "Spectacle musical de haute qualité.",
        "description_yi": "א מוזיקל פאר די גאנצע משפחה.",
        "price": 85, "cat_id_new": 6, "is_active": True, "image_url": "culture_tours.jpg"
    },
    {
        "id": 9,
        "title_he": "ייעוץ פנסיוני לעובד החרדי", "title_en": "Haredi Worker Pension Consultation", "title_fr": "Consultation Retraite Harédi", "title_yi": "פנסיה ייעוץ",
        "description_he": "פגישה אישית לאופטימיזציה של הפנסיה והחסכונות שלך.",
        "description_en": "One-on-one session to optimize your pension and savings.",
        "description_fr": "Session individuelle.",
        "description_yi": "ייעוץ פאר דיין פנסיה.",
        "price": 0, "cat_id_new": 1, "is_active": True, "image_url": "finance_hero.jpg"
    },
    {
        "id": 10,
        "title_he": "שובר קנייה לרשת שיווק - 500 ש\"ח", "title_en": "Supermarket Voucher - 500 NIS", "title_fr": "Bon d'achat Supermarché - 500 NIS", "title_yi": "סופערמארקעט וואוטשער",
        "description_he": "שובר מוזל לכל רשתות השיווק הכשרות.",
        "description_en": "Discounted voucher for all major kosher chains.",
        "description_fr": "Bon d'achat pour les chaînes casher.",
        "description_yi": "ביליגערע וואוטשער פארן היימישן ציבור.",
        "price": 450, "cat_id_new": 2, "is_active": True, "image_url": "consumer_vouchers.jpg"
    },
    {
        "id": 11,
        "title_he": "סדנאות עיצוב גרפי (נפרד)", "title_en": "Graphic Design Workshop", "title_fr": "Atelier de Design Graphique", "title_yi": "גראפיק דעזיין סדנא",
        "description_he": "שליטה בכלי אדובי לעבודה יצירתית מקצועית.",
        "description_en": "Mastering Adobe tools for professional creative work.",
        "description_fr": "Maîtrise des outils Adobe.",
        "description_yi": "לערנען גראפיק דעזיין.",
        "price": 450, "cat_id_new": 5, "is_active": True, "image_url": "placeholder.jpg"
    },
    {
        "id": 12,
        "title_he": "סדנת אופטימיזציית משכנתא", "title_en": "Mortgage Optimization Workshop", "title_fr": "Atelier Optimisation Hypothécaire", "title_yi": "משכנתא סדנא",
        "description_he": "למד איך לחסוך אלפי שקלים בריביות על המשכנתא.",
        "description_en": "Learn how to save thousands on your home loan interest.",
        "description_fr": "Apprenez à économiser sur votre hypothèque.",
        "description_yi": "שפארן געלט אויף די משכנתא.",
        "price": 0, "cat_id_new": 4, "is_active": True, "image_url": "finance_hero.jpg"
    }
]

@app.get("/")
def read_root():
    return {"message": "Welcome to the Tivuta API", "status": "active"}

@app.get("/categories", response_model=List[schemas.CategorySchema])
def get_categories():
    return MOCK_CATEGORIES

@app.get("/trending", response_model=List[schemas.ItemSchema])
def get_trending_items(db: Session = Depends(get_db)):
    try:
        # Fetch all items from the database
        db_items = db.query(models.Item).all()
        if db_items:
            return db_items
    except Exception as e:
        print(f"Database error: {e}. Falling back to mock data.")
    
    return MOCK_ITEMS