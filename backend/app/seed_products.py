# backend/app/seed_products.py
"""Seeds demo Product rows for the new multi-vertical site (diamonds / cars / insurance)."""
from .database import SessionLocal
from . import models

PRODUCTS = [
    # Diamonds
    {
        "vertical": "diamonds", "title_he": "יהלום עגול 1.20 קראט - VS1",
        "description_he": "יהלום מלוטש בחיתוך עגול קלאסי, ניקיון VS1, צבע F, עם תעודת GIA.",
        "image_url": "diamond_round_1.webp", "price": 38000,
        "attributes": {"carat": 1.2, "clarity": "VS1", "color": "F", "cut": "Round"},
    },
    {
        "vertical": "diamonds", "title_he": "יהלום נסיכה 0.90 קראט - VVS2",
        "description_he": "חיתוך נסיכה מודרני, ניקיון VVS2, ברק יוצא דופן.",
        "image_url": "diamond_princess.webp", "price": 27500,
        "attributes": {"carat": 0.9, "clarity": "VVS2", "color": "E", "cut": "Princess"},
    },
    {
        "vertical": "diamonds", "title_he": "סט טבעת אירוסין משובצת יהלום 0.50 קראט",
        "description_he": "טבעת זהב לבן 18 קראט משובצת יהלום מרכזי, עיצוב קלאסי.",
        "image_url": "diamond_ring.webp", "price": 14500,
        "attributes": {"carat": 0.5, "clarity": "SI1", "color": "G", "cut": "Round"},
    },

    # Cars
    {
        "vertical": "cars", "title_he": "טויוטה קורולה 2026 - הייבריד",
        "description_he": "דגם חדש מהיצרן, מנוע הייבריד חסכוני, אחריות יבואן מלאה.",
        "image_url": "car_corolla.webp", "price": 145000,
        "attributes": {"make": "Toyota", "model": "Corolla", "year": 2026, "fuel": "Hybrid"},
    },
    {
        "vertical": "cars", "title_he": "טויוטה סיאנה 2026 - 8 מקומות",
        "description_he": "הרכב המשפחתי האידיאלי, 8 מקומות ותנאי מימון נוחים.",
        "image_url": "auto_deal.webp", "price": 240000,
        "attributes": {"make": "Toyota", "model": "Sienna", "year": 2026, "fuel": "Hybrid"},
    },
    {
        "vertical": "cars", "title_he": "יונדאי טוסון 2025 - 4X4",
        "description_he": "רכב שטח משפחתי, חישוקי סגסוגת, מערכות בטיחות מתקדמות.",
        "image_url": "car_tucson.webp", "price": 175000,
        "attributes": {"make": "Hyundai", "model": "Tucson", "year": 2025, "fuel": "Petrol"},
    },

    # Insurance
    {
        "vertical": "insurance", "title_he": "ביטוח רכב מקיף - חברה מובילה",
        "description_he": "כיסוי מקיף לרכב כולל צד ג', גניבה ושבר שמשות, בהנחת מועדון.",
        "image_url": "insurance_car.webp", "price": None,
        "attributes": {"type": "car", "coverage": "comprehensive"},
    },
    {
        "vertical": "insurance", "title_he": "ביטוח חיים ובריאות משפחתי",
        "description_he": "כיסוי ביטוחי משפחתי הכולל מחלות קשות וניתוחים בחו\"ל.",
        "image_url": "insurance_health.webp", "price": None,
        "attributes": {"type": "health", "coverage": "family"},
    },
    {
        "vertical": "insurance", "title_he": "ביטוח דירה ותכולה",
        "description_he": "הגנה מקיפה על המבנה והתכולה, כולל נזקי טבע ופריצה.",
        "image_url": "insurance_home.webp", "price": None,
        "attributes": {"type": "home", "coverage": "structure_and_contents"},
    },
]


def seed_products():
    db = SessionLocal()
    try:
        if db.query(models.Product).count() > 0:
            print("Products already seeded, skipping.")
            return
        for p in PRODUCTS:
            db.add(models.Product(**p))
        db.commit()
        print(f"Seeded {len(PRODUCTS)} products across diamonds/cars/insurance.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_products()
