# backend/app/seed.py
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from . import models

def seed_db():
    db = SessionLocal()
    
    try:
        # Clear existing data
        db.query(models.Item).delete()
        db.query(models.SubCategory).delete()
        db.query(models.Category).delete()
        db.commit()

        # Define Categories with Sub-Categories
        category_data = [
            {
                "name": ("יהדות", "Judaism", "Judaïsme", "יהדות"),
                "slug": "judaism",
                "icon": "ScrollText",
                "subs": ["יודאיקה", "חנויות ספרים", "מקוואות", "חברות קהילתיות", "גדרים", "קמחא דפסחא", "תרומות לארגוני חסד"]
            },
            {
                "name": ("מסעדות", "Dining", "Restauration", "רעסטוראנטן"),
                "slug": "dining",
                "icon": "Utensils",
                "subs": ["מסעדות שף מהדרין", "כשרויות שונות", "בתי קפה ועגלות קפה", "לובי בתי מלון", "צ'ולנטיות", "חנויות פיצוחים", "מעדניות לשבת", "קייטרינג"]
            },
            {
                "name": ("ביגוד והנעלה", "Fashion", "Mode", "קליידער"),
                "slug": "fashion",
                "icon": "Shirt",
                "subs": ["בגדי גברים", "בגדי נשים", "בגדי ילדים ונעליים", "ביגוד ספורט", "חנויות משקפיים"]
            },
            {
                "name": ("מזון", "Groceries", "Alimentation", "עסנווארג"),
                "slug": "groceries",
                "icon": "ShoppingBasket",
                "subs": ["רשתות צרכנות וסופרים", "חנויות יין", "מאפיות"]
            },
            {
                "name": ("נופשים ואטרקציות", "Travel & Attractions", "Voyage", "טוריזם"),
                "slug": "travel_attractions",
                "icon": "Palmtree",
                "subs": ["נופשים", "חו\"ל מאורגן", "טיולי קברי צדיקים", "ספארי", "לונה פארקים", "פארקי אטרקציות", "מדריכי טיולים", "פארקי מים", "בריכות"]
            },
            {
                "name": ("חשמל ואלקטרוניקה", "Electronics", "Électronique", "עלעקטראניק"),
                "slug": "electronics",
                "icon": "Smartphone",
                "subs": ["מוצרי חשמל לבית", "סלולר ואביזרים"]
            },
            {
                "name": ("בריאות וטיפוח", "Health & Beauty", "Santé", "געזונטהייט"),
                "slug": "health_beauty",
                "icon": "HeartPulse",
                "subs": ["חברות קופ\"ח", "חדרי כושר נפרדים", "מספרות", "מוצרי טיפוח", "טיפולים", "פאות", "דיאטנים"]
            },
            {
                "name": ("אירועים", "Events", "Événements", "שמחות"),
                "slug": "events",
                "icon": "PartyPopper",
                "subs": ["שבתות חתן", "מצוות", "סידורי פרחים", "שמלות", "אולמות", "שף פרטי", "משגיחים"]
            },
            {
                "name": ("נדל\"ן ורכב", "Real Estate & Auto", "Immobilier", "נדל\"ן"),
                "slug": "real_estate_auto",
                "icon": "Home",
                "subs": ["דיל לרכבים חדשים", "שיווק פרויקטים לציבור", "שכירות דירות לשבתות"]
            },
            {
                "name": ("למשפחה", "Family", "Famille", "משפחה"),
                "slug": "family",
                "icon": "Users",
                "subs": ["יועצים זוגיים", "חינוך ילדים", "שידוכים", "שיעורים פרטיים", "חוגים", "לימודים ופרנסה", "גמ\"חים", "שוברי שמחות"]
            },
            {
                "name": ("פיננסים", "Finance", "Finance", "פינאנצן"),
                "slug": "finance",
                "icon": "Landmark",
                "subs": ["פתיחת ח-ן בנק", "עמלות ומסלולים לחברי מועדון", "בתי השקעות", "ביטוחים", "ניהול כספי פנסיה וקרנות", "כלכלת משפחה", "ליווי עסקי", "עו\"ד וטוענים רבניים"]
            },
            {
                "name": ("עולם הבניה והשיפוץ", "Construction & Home", "Construction", "בויען"),
                "slug": "home_renovation",
                "icon": "Hammer",
                "subs": ["טייחים", "שיפוצניקים", "אינסטלטורים", "חשמלאים", "חומרי בניין", "חנויות קרמיקה", "כלים סניטריים", "פרגולות", "אדריכלות", "מעצבות פנים"]
            }
        ]

        for cat_item in category_data:
            names = cat_item["name"]
            new_cat = models.Category(
                name_he=names[0], name_en=names[1], name_fr=names[2], name_yi=names[3],
                slug=cat_item["slug"], icon_name=cat_item["icon"]
            )
            db.add(new_cat)
            db.flush()

            for sub_name in cat_item["subs"]:
                new_sub = models.SubCategory(
                    category_id=new_cat.id,
                    name_he=sub_name,
                    slug=sub_name.replace(" ", "_").lower().replace('"', '').replace("\\", "")
                )
                db.add(new_sub)
        
        db.commit()
        
        sub_map = {sub.name_he: sub.id for sub in db.query(models.SubCategory).all()}

        items_data = [
            # Judaism
            {"sub": "יודאיקה", "title_he": "סט תפילין מהודר - כתב בית יוסף", "desc_he": "סט תפילין באיכות הגבוהה ביותר, כולל בדיקת מוגה ממוחשבת וידנית.", "image": "tefillin.webp", "price": 2800},
            {"sub": "יודאיקה", "title_he": "מזוזות מהודרות - גודל 12 ס\"מ", "desc_he": "מזוזות שנכתבו על ידי סופר ירא שמים עם בדיקה כפולה.", "image": "tefillin.webp", "price": 180},
            {"sub": "חנויות ספרים", "title_he": "סט ש\"ס וילנא החדש - 20 כרכים", "desc_he": "מהדורה מפוארת עם דפי קרם וטקסט מאיר עיניים.", "image": "culture_tours.webp", "price": 1200},
            
            # Dining
            {"sub": "מסעדות שף מהדרין", "title_he": "ארוחת טעימות יוקרתית - גורמה גלאט", "desc_he": "חוויה קולינרית בלתי נשכחת בכשרות המהודרת ביותר.", "image": "chef_restaurant.webp", "price": 280},
            {"sub": "מעדניות לשבת", "title_he": "מארז מעדני שבת מלכותי", "desc_he": "מבחר דגים, סלטים וצ'ולנט לחוויית שבת מושלמת.", "image": "chef_restaurant.webp", "price": 150},
            {"sub": "צ'ולנטיות", "title_he": "דיל ליל שישי קבוצתי", "desc_he": "מארז צ'ולנט וקיגל ל-5 אנשים בתנאים מיוחדים.", "image": "chef_restaurant.webp", "price": 100},
            
            # Fashion
            {"sub": "בגדי גברים", "title_he": "חליפת צמר איטלקית פרימיום", "desc_he": "חליפה יוקרתית בעיצוב קלאסי למראה מכובד.", "image": "mens_suit.webp", "price": 1400},
            {"sub": "בגדי גברים", "title_he": "חולצות כפתורים Non-Iron", "desc_he": "חולצות איכותיות שנשארות מגוהצות כל היום.", "image": "mens_suit.webp", "price": 180},
            {"sub": "בגדי נשים", "title_he": "שמלת ערב צנועה ומעוצבת", "desc_he": "שמלה יוקרתית לאירועים, עיצוב ייחודי וצניעות ללא פשרות.", "image": "modest_wedding_dress.webp", "price": 650},
            
            # Groceries
            {"sub": "חנויות ייין", "title_he": "מארז יינות פרימיום לחג", "desc_he": "מבחר יינות מהיקבים המובילים בכשרות מהדרין.", "image": "wine_bottles.webp", "price": 320},
            {"sub": "רשתות צרכנות וסופרים", "title_he": "שובר קנייה מוטען - 500 ש\"ח", "desc_he": "ניתן למימוש בכל סניפי הרשת המובחרים.", "image": "consumer_vouchers.webp", "price": 450},
            
            # Travel
            {"sub": "נופשים", "title_he": "חופשת סקי כשרה - אינסברוק", "desc_he": "חבילת הכל כלול: טיסות, מלון כשר וציוד סקי.", "image": "kosher_hotel.webp", "price": 4800},
            {"sub": "נופשים", "title_he": "נופש משפחתי בכינרת", "desc_he": "צימרים מפוארים עם בריכה נפרדת וארוחות כשרות.", "image": "kosher_hotel.webp", "price": 950},
            
            # Electronics
            {"sub": "סלולר ואביזרים", "title_he": "סמארטפון מסונן TIVUTA Safe", "desc_he": "המכשיר המתקדם ביותר עם סינון הרמטי ללא פשרות.", "image": "filtered_phone.webp", "price": 1200},
            {"sub": "מוצרי חשמל לבית", "title_he": "מכונת כביסה 9 ק\"ג - משפחתית", "desc_he": "קיבולת גדולה וחיסכון בחשמל, מושלמת למשפחות גדולות.", "image": "washing_machine.webp", "price": 2400},
            
            # Health
            {"sub": "חדרי כושר נפרדים", "title_he": "מנוי שנתי - מועדון הכוח", "desc_he": "שעות נפרדות לנשים וגברים בסביבה תומכת ומקצועית.", "image": "finance_hero.webp", "price": 1800},
            
            # Events
            {"sub": "שמלות", "title_he": "שמלת כלה צנועה ומפוארת", "desc_he": "עיצוב אישי וליווי צמוד ליום החשוב בחייך.", "image": "modest_wedding_dress.webp", "price": 4500},
            {"sub": "אולמות", "title_he": "אולם אירועים 'היכל המלכות'", "desc_he": "הפקה מלאה לאירועים יוקרתיים בלב ירושלים.", "image": "chef_restaurant.webp", "price": 15000},
            
            # Real Estate
            {"sub": "דיל לרכבים חדשים", "title_he": "טויוטה סיאנה 2026 - רכב 8 מקומות", "desc_he": "הרכב האידיאלי למשפחה החרדית בתנאי מימון נוחים.", "image": "auto_deal.webp", "price": 240000},
            {"sub": "שיווק פרויקטים לציבור", "title_he": "דירת 4 חדרים בבית שמש החדשה", "desc_he": "פרויקט מגורים איכותי בלב קהילה תוססת ומתפתחת.", "image": "jerusalem_apartment.webp", "price": 2100000},
            
            # Home
            {"sub": "מעצבות פנים", "title_he": "תכנון מטבח מהדרין מודרני", "desc_he": "עיצוב מטבח חכם עם הפרדה מלאה וניצול שטח מקסימלי.", "image": "kosher_kitchen.webp", "price": 2500},
            {"sub": "אינסטלטורים", "title_he": "שירות אינסטלציה 24/6", "desc_he": "תיקון כל סוגי התקלות במהירות ובאמינות.", "image": "finance_hero.webp", "price": 250}
        ]

        # Duplicate items to make the site look fuller
        for item in items_data:
            db.add(models.Item(
                sub_category_id=sub_map.get(item["sub"]),
                title_he=item["title_he"],
                description_he=item["desc_he"],
                image_url=item["image"],
                price=item["price"]
            ))
            
            # Add a variation
            db.add(models.Item(
                sub_category_id=sub_map.get(item["sub"]),
                title_he=item["title_he"] + " - מהדורת פרימיום",
                description_he=item["desc_he"] + " גרסה משופרת ויוקרתית יותר לחברי המועדון.",
                image_url=item["image"],
                price=item.get("price", 0) * 1.2 if item.get("price") else 0
            ))
        
        db.commit()
        print("Database successfully seeded with a massive list of rich items.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()