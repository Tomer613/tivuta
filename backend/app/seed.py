# backend/app/seed.py
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import Category, SubCategory

def init_db():
    """
    Creates the database tables if they do not exist.
    """
    Base.metadata.create_all(bind=engine)

def seed_data(db: Session):
    """
    Populates the database with the initial category structure.
    """
    # Check if data already exists
    if db.query(Category).first():
        print("Database already seeded. Skipping.")
        return

    # Define main categories and their sub-categories
    categories_data = {
        "leisure_culture": {
            "name_he": "תרבות הפנאי",
            "subs": ["סיורים", "מופעים והצגות", "אתרים ופארקים"]
        },
        "learning_enrichment": {
            "name_he": "למידה והעשרה",
            "subs": ["קורסים", "סדנאות"]
        },
        "consumerism": {
            "name_he": "צרכנות",
            "subs": ["שוברים", "קניות", "הטבות"]
        },
        "tourism_vacation": {
            "name_he": "תיירות ונופש",
            "subs": ["מלונות בארץ", "חופשות בחו\"ל", "אטרקציות"]
        },
        "auto_real_estate": {
            "name_he": "רכב ונדל\"ן",
            "subs": ["ליסינג וקנייה", "ייעוץ משכנתאות", "תיווך וקנייה"]
        },
        "finance_insurance": {
            "name_he": "פיננסים וביטוחים",
            "subs": ["ביטוחי בריאות", "פנסיה וגמל", "ייעוץ פיננסי"]
        }
    }

    try:
        for slug, data in categories_data.items():
            # Create the main category
            category = Category(name_he=data["name_he"], slug=slug)
            db.add(category)
            db.flush() # Flush to get the category ID for sub-categories

            # Create sub-categories
            for sub_name in data["subs"]:
                sub_category = SubCategory(category_id=category.id, name_he=sub_name)
                db.add(sub_category)

        # Commit all changes to the database
        db.commit()
        print("Initial data seeded successfully.")
    
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")

if __name__ == "__main__":
    init_db()
    
    # Create a database session
    db_session = SessionLocal()
    try:
        seed_data(db_session)
    finally:
        db_session.close()