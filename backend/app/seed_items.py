# backend/app/seed_items.py
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Category, SubCategory, Item

def seed_content_items():
    """
    Populates the database with a rich set of items to make the portal look 'full'.
    Focuses on the working Haredi community's needs and interests.
    """
    db = SessionLocal()
    
    try:
        # Fetch sub-categories to link items correctly
        subs = {sub.name_he: sub.id for sub in db.query(SubCategory).all()}
        
        if not subs:
            print("No sub-categories found. Please run seed.py first.")
            return

        # List of items to add
        items_to_add = [
            # Leisure & Culture
            {"title": "Guided Tour: Jerusalem's Old City Walls", "sub": "סיורים", "price": 45.0, "desc": "A professional guided tour exploring the history of the walls.", "image": "culture_tours.jpg"},
            {"title": "Family Musical: The Lost Heritage", "sub": "מופעים והצגות", "price": 85.0, "desc": "A high-quality musical for the whole family, fully kosher-certified.", "image": "culture_tours.jpg"},
            {"title": "Nature Park Pass - Northern Israel", "sub": "אתרים ופארקים", "price": 120.0, "desc": "Annual pass for a family of 5 for major national parks.", "image": "culture_tours.jpg"},
            
            # Finance & Insurance
            {"title": "Haredi Worker Pension Consultation", "sub": "ייעוץ פיננסי", "price": 0.0, "desc": "One-on-one session to optimize your pension and savings.", "image": "finance_hero.jpg"},
            {"title": "Premium Health Insurance for Large Families", "sub": "ביטוחי בריאות", "price": 150.0, "desc": "Tailored coverage for the specific needs of community families.", "image": "finance_hero.jpg"},
            
            # Professional / Learning
            {"title": "Management for the Haredi Executive", "sub": "קורסים", "price": 1200.0, "desc": "Comprehensive course on leadership and management in the corporate world.", "image": "placeholder.jpg"},
            {"title": "Graphic Design Workshop (Men/Women separate)", "sub": "סדנאות", "price": 450.0, "desc": "Mastering Adobe tools for professional creative work.", "image": "placeholder.jpg"},
 
            # Consumerism
            {"title": "Major Supermarket Voucher - 500 NIS", "sub": "שוברים", "price": 450.0, "desc": "Discounted voucher for all major kosher chains.", "image": "consumer_vouchers.jpg"},
            {"title": "Smart Home Package - Exclusive Deal", "sub": "מוצרי חשמל", "price": 2999.0, "desc": "Advanced appliances with Shabbos-mode built-in.", "image": "placeholder.jpg"},
            
            # Real Estate & Auto
            {"title": "Leasing Deal: Family 7-Seater", "sub": "ליסינג וקנייה", "price": 1800.0, "desc": "Monthly lease for a spacious family vehicle with full service.", "image": "auto_deal.jpg"},
            {"title": "Mortgage Optimization Workshop", "sub": "ייעוץ משכנתאות", "price": 0.0, "desc": "Learn how to save thousands on your home loan interest.", "image": "finance_hero.jpg"},
        ]

        # Check if we already have items to avoid duplication
        if db.query(Item).first():
            print("Items already seeded. Adding more variation...")

        for item_data in items_to_add:
            # Only add if the sub-category exists
            if item_data["sub"] in subs:
                new_item = Item(
                    sub_category_id=subs[item_data["sub"]],
                    title=item_data["title"],
                    description=item_data["desc"],
                    price=item_data["price"],
                    image_url=item_data.get("image"),
                    is_active=True
                )
                db.add(new_item)
        
        db.commit()
        print(f"Successfully added {len(items_to_add)} items to the portal.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding items: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_content_items()