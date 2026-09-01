import csv
import io
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db
from ..services import get_image_storage
from ..services.image_storage import generate_image_filename
from ..services.inventory import adjust_stock, set_stock_quantity
from .product_categories import validate_category
from .quantity_discounts import validate_quantity_discount_bundle
from .verticals import validate_vertical_slug

router = APIRouter(tags=["products"])


def _active_promotions(product: models.Product) -> List[schemas.PromotionBrief]:
    now = datetime.utcnow()
    return [
        schemas.PromotionBrief.model_validate(p)
        for p in product.promotions
        if p.is_active and (p.end_date is None or p.end_date > now)
    ]


def _active_quantity_discount(product: models.Product) -> Optional[schemas.QuantityDiscountBrief]:
    bundle = product.quantity_discount_bundle
    if bundle is None or not bundle.is_active:
        return None
    return schemas.QuantityDiscountBrief.model_validate(bundle)


def _product_read(product: models.Product) -> schemas.ProductRead:
    result = schemas.ProductRead.model_validate(product)
    result.promotions = _active_promotions(product)
    result.quantity_discount = _active_quantity_discount(product)
    approved = [r for r in product.reviews if r.is_approved]
    result.review_count = len(approved)
    result.avg_rating = round(sum(r.rating for r in approved) / len(approved), 1) if approved else None
    return result


def _parse_optional_id(raw: str) -> Optional[int]:
    """Tolerates a whole-number-valued float string (e.g. "5.0") — a common artifact of a CSV
    round-tripping through Excel/Sheets, which auto-formats an integer ID column that way. A
    genuinely fractional value (e.g. "5.5") is not a valid row id and still raises, same as
    plain int() would for any other non-numeric garbage."""
    raw = raw.strip()
    if not raw:
        return None
    value = float(raw)
    if not value.is_integer():
        raise ValueError(f"'{raw}' is not a valid id")
    return int(value)


def _validate_sale_price(price: Optional[float], sale_price: Optional[float]) -> None:
    """sale_price=0 (or None) means 'no sale' and needs no base price. Anything above 0 must be
    a genuine discount off a real, positive price — never >= it."""
    if not sale_price or sale_price <= 0:
        return
    if not price or price <= 0:
        raise HTTPException(status_code=400, detail="מחיר מבצע דורש מחיר רגיל תקין")
    if sale_price >= price:
        raise HTTPException(status_code=400, detail="מחיר מבצע חייב להיות נמוך מהמחיר הרגיל")


@router.get("/products", response_model=List[schemas.ProductRead])
def list_products(
    vertical: Optional[str] = None,
    sort: Optional[str] = None,  # 'popularity' | 'price_asc' | 'price_desc' | 'newest'
    promotion_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    query = (
        db.query(models.Product)
        .filter(models.Product.is_active == True)
        .options(selectinload(models.Product.promotions), selectinload(models.Product.reviews), selectinload(models.Product.vendor), selectinload(models.Product.category), selectinload(models.Product.quantity_discount_bundle).selectinload(models.QuantityDiscountBundle.tiers))
    )
    if vertical:
        query = query.filter(models.Product.vertical == vertical)
    if promotion_type:
        promo_product_ids = (
            db.query(models.product_promotions_table.c.product_id)
            .join(models.Promotion, models.Promotion.id == models.product_promotions_table.c.promotion_id)
            .filter(
                models.Promotion.type == promotion_type,
                models.Promotion.is_active == True,
                or_(models.Promotion.end_date == None, models.Promotion.end_date > now),
            )
            .subquery()
        )
        query = query.filter(models.Product.id.in_(promo_product_ids))
    if sort == "price_asc":
        query = query.order_by(models.Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(models.Product.price.desc())
    elif sort == "newest":
        query = query.order_by(models.Product.created_at.desc())
    else:  # 'popularity' or unspecified — popularity is the default sort
        query = query.order_by(models.Product.popularity_score.desc(), models.Product.created_at.desc())

    return [_product_read(p) for p in query.all()]


@router.get("/products/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .options(selectinload(models.Product.promotions), selectinload(models.Product.reviews), selectinload(models.Product.vendor), selectinload(models.Product.category), selectinload(models.Product.quantity_discount_bundle).selectinload(models.QuantityDiscountBundle.tiers))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_read(product)


@router.post("/products/{product_id}/view")
def increment_product_view(product_id: int, db: Session = Depends(get_db)):
    db.query(models.Product).filter(models.Product.id == product_id).update(
        {"view_count": models.Product.view_count + 1}
    )
    db.commit()
    return {"ok": True}


@router.get("/search", response_model=List[schemas.ProductRead])
def search_products(q: str = "", db: Session = Depends(get_db)):
    if not q or len(q.strip()) < 2:
        return []
    term = f"%{q.strip()}%"
    products = (
        db.query(models.Product)
        .filter(
            models.Product.is_active == True,
            or_(
                models.Product.title_he.ilike(term),
                models.Product.title_en.ilike(term),
                models.Product.description_he.ilike(term),
            ),
        )
        .options(selectinload(models.Product.promotions), selectinload(models.Product.reviews), selectinload(models.Product.vendor), selectinload(models.Product.category), selectinload(models.Product.quantity_discount_bundle).selectinload(models.QuantityDiscountBundle.tiers))
        .limit(20)
        .all()
    )
    return [_product_read(p) for p in products]


def _validate_vendor(vendor_id: Optional[int], vertical: str, db: Session):
    if vendor_id is None:
        return
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if vendor.vertical != vertical:
        raise HTTPException(status_code=400, detail="Vendor vertical does not match product vertical")


@router.post("/admin/products", response_model=schemas.ProductRead, dependencies=[Depends(get_current_admin)])
def admin_create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    validate_vertical_slug(db, product_in.vertical)
    _validate_vendor(product_in.vendor_id, product_in.vertical, db)
    validate_category(product_in.category_id, product_in.vertical, db)
    validate_quantity_discount_bundle(product_in.quantity_discount_bundle_id, db)
    _validate_sale_price(product_in.price, product_in.sale_price)
    new_product = models.Product(**product_in.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    if new_product.stock_quantity is not None:
        db.add(models.InventoryLedgerEntry(
            product_id=new_product.id, delta=new_product.stock_quantity, reason="initial_stock",
            balance_after=new_product.stock_quantity,
        ))
        db.commit()
    return new_product


@router.post("/admin/products/batch", response_model=List[schemas.ProductRead], dependencies=[Depends(get_current_admin)])
def admin_create_products_batch(products_in: List[schemas.ProductCreate], db: Session = Depends(get_db)):
    new_products = []
    for product_in in products_in:
        validate_vertical_slug(db, product_in.vertical)
        new_product = models.Product(**product_in.model_dump())
        db.add(new_product)
        new_products.append(new_product)
    db.commit()
    for p in new_products:
        db.refresh(p)
    return new_products


@router.put("/admin/products/{product_id}", response_model=schemas.ProductRead, dependencies=[Depends(get_current_admin)])
def admin_update_product(product_id: int, product_in: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .options(selectinload(models.Product.promotions))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = product_in.model_dump(exclude_unset=True)
    if "vertical" in update_data:
        validate_vertical_slug(db, update_data["vertical"])
    if "vendor_id" in update_data:
        _validate_vendor(update_data["vendor_id"], update_data.get("vertical", product.vertical), db)
    if "category_id" in update_data:
        validate_category(update_data["category_id"], update_data.get("vertical", product.vertical), db)
    if "quantity_discount_bundle_id" in update_data:
        validate_quantity_discount_bundle(update_data["quantity_discount_bundle_id"], db)
    if "price" in update_data or "sale_price" in update_data:
        # Validate against the *effective* post-update state, not just whatever keys happen to be
        # in this particular payload — e.g. a PUT that only sends sale_price must still be checked
        # against the product's existing price, and vice versa.
        effective_price = update_data.get("price", product.price)
        effective_sale_price = update_data.get("sale_price", product.sale_price)
        _validate_sale_price(effective_price, effective_sale_price)
    # stock_quantity always goes through the ledger (see services/inventory.py), never a bare
    # setattr, so a direct edit via this form is audited the same as the quick +/- stepper.
    new_stock_quantity = update_data.pop("stock_quantity", "__unset__")
    for key, value in update_data.items():
        setattr(product, key, value)
    if new_stock_quantity != "__unset__":
        set_stock_quantity(db, product, new_stock_quantity)
    db.commit()
    db.refresh(product)
    return _product_read(product)


@router.patch("/admin/products/{product_id}/stock", response_model=schemas.ProductRead, dependencies=[Depends(get_current_admin)])
def admin_adjust_product_stock(
    product_id: int,
    payload: schemas.ProductStockAdjust,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """The quick +/- stepper on the admin products table. If the product wasn't tracking stock
    yet (stock_quantity is NULL), a positive delta here starts tracking it from 0 rather than
    silently no-opping (see adjust_stock's own NULL no-op guard, which assumes an already-tracked
    product) — treated as the admin's chosen starting point."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    actor = f"{current_admin.first_name} {current_admin.last_name}".strip()
    if product.stock_quantity is None:
        set_stock_quantity(db, product, max(0, payload.delta), actor=actor)
    else:
        adjust_stock(db, product, payload.delta, "admin_adjustment", actor=actor)
    db.commit()
    db.refresh(product)
    return _product_read(product)


@router.get("/admin/products", response_model=List[schemas.ProductRead], dependencies=[Depends(get_current_admin)])
def admin_list_all_products(db: Session = Depends(get_db)):
    """Returns all products including inactive ones — for admin management."""
    products = (
        db.query(models.Product)
        .options(selectinload(models.Product.promotions), selectinload(models.Product.reviews), selectinload(models.Product.vendor), selectinload(models.Product.category), selectinload(models.Product.quantity_discount_bundle).selectinload(models.QuantityDiscountBundle.tiers))
        .order_by(models.Product.created_at.desc())
        .all()
    )
    return [_product_read(p) for p in products]


@router.get("/admin/products/analytics", dependencies=[Depends(get_current_admin)])
def admin_product_analytics(db: Session = Depends(get_db)):
    products = (
        db.query(models.Product)
        .options(selectinload(models.Product.reviews))
        .order_by(models.Product.view_count.desc())
        .all()
    )
    fav_counts = dict(
        db.query(models.Favorite.product_id, func.count(models.Favorite.id))
        .group_by(models.Favorite.product_id)
        .all()
    )
    lead_counts = dict(
        db.query(models.Lead.product_id, func.count(models.Lead.id))
        .filter(models.Lead.product_id != None)
        .group_by(models.Lead.product_id)
        .all()
    )
    result = []
    for p in products:
        approved = [r for r in p.reviews if r.is_approved]
        result.append({
            "id": p.id,
            "vertical": p.vertical,
            "title_he": p.title_he,
            "view_count": p.view_count,
            "favorite_count": fav_counts.get(p.id, 0),
            "review_count": len(approved),
            "avg_rating": round(sum(r.rating for r in approved) / len(approved), 1) if approved else None,
            "lead_count": lead_counts.get(p.id, 0),
        })
    return result


@router.post("/admin/upload-image", dependencies=[Depends(get_current_admin)])
async def upload_product_image(file: UploadFile = File(...)):
    filename = generate_image_filename(file.filename or "")
    stored = get_image_storage().save(
        filename=filename,
        content=await file.read(),
        content_type=file.content_type or "application/octet-stream",
    )
    return {"filename": stored}


@router.post("/admin/products/{product_id}/duplicate", response_model=schemas.ProductRead, dependencies=[Depends(get_current_admin)])
def admin_duplicate_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .options(selectinload(models.Product.promotions))
        .filter(models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    clone = models.Product(
        vertical=product.vertical,
        title_he=f"{product.title_he} (עותק)",
        title_en=product.title_en,
        title_fr=product.title_fr,
        title_yi=product.title_yi,
        description_he=product.description_he,
        description_en=product.description_en,
        description_fr=product.description_fr,
        description_yi=product.description_yi,
        image_url=product.image_url,
        price=product.price,
        sale_price=product.sale_price,
        attributes=product.attributes,
        vendor_id=product.vendor_id,
        category_id=product.category_id,
        quantity_discount_bundle_id=product.quantity_discount_bundle_id,
        is_active=False,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


@router.post("/admin/products/import-csv", response_model=List[schemas.ProductRead], dependencies=[Depends(get_current_admin)])
async def admin_import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("windows-1255", errors="replace")
    valid_slugs = {
        row[0] for row in db.query(models.Vertical.slug).filter(models.Vertical.is_active == True).all()
    }
    reader = csv.DictReader(io.StringIO(text))
    new_products = []
    errors = []
    for i, row in enumerate(reader):
        vertical = (row.get("vertical") or "").strip()
        if vertical not in valid_slugs:
            errors.append(f"Row {i+2}: invalid vertical '{vertical}'")
            continue
        title_he = (row.get("title_he") or "").strip()
        if not title_he:
            errors.append(f"Row {i+2}: title_he is required")
            continue
        description_he = (row.get("description_he") or title_he).strip()
        import json as _json
        attrs_raw = (row.get("attributes") or "").strip()
        try:
            attributes = _json.loads(attrs_raw) if attrs_raw else None
        except Exception:
            attributes = None
        try:
            price_raw = (row.get("price") or "").strip()
            price = float(price_raw) if price_raw else None
            sale_price_raw = (row.get("sale_price") or "").strip()
            sale_price = float(sale_price_raw) if sale_price_raw else 0.0
            vendor_id = _parse_optional_id(row.get("vendor_id") or "")
            category_id = _parse_optional_id(row.get("category_id") or "")
            bundle_id = _parse_optional_id(row.get("quantity_discount_bundle_id") or "")
        except ValueError:
            errors.append(f"Row {i+2}: price/sale_price/vendor_id/category_id/quantity_discount_bundle_id must be numeric")
            continue
        is_active_raw = (row.get("is_active") or "true").strip().lower()
        is_active = is_active_raw not in ("false", "0", "no")

        try:
            _validate_sale_price(price, sale_price)
            _validate_vendor(vendor_id, vertical, db)
            validate_category(category_id, vertical, db)
            validate_quantity_discount_bundle(bundle_id, db)
        except HTTPException as e:
            errors.append(f"Row {i+2}: {e.detail}")
            continue

        product = models.Product(
            vertical=vertical,
            title_he=title_he,
            title_en=(row.get("title_en") or "").strip() or None,
            title_fr=(row.get("title_fr") or "").strip() or None,
            title_yi=(row.get("title_yi") or "").strip() or None,
            description_he=description_he,
            description_en=(row.get("description_en") or "").strip() or None,
            description_fr=(row.get("description_fr") or "").strip() or None,
            description_yi=(row.get("description_yi") or "").strip() or None,
            image_url=(row.get("image") or row.get("image_url") or "").strip() or None,
            price=price,
            sale_price=sale_price,
            attributes=attributes,
            vendor_id=vendor_id,
            category_id=category_id,
            quantity_discount_bundle_id=bundle_id,
            is_active=is_active,
        )
        db.add(product)
        new_products.append(product)
    if not new_products and errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    db.commit()
    for p in new_products:
        db.refresh(p)
    return new_products


@router.delete("/admin/products/{product_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_product(product_id: int, db: Session = Depends(get_db)):
    """Permanently deletes the product when nothing historical references it (a real DELETE, not
    the is_active=False hide — that remains a separate action, PUT .../admin/products/{id} with
    {is_active: false}, wired to the products table's status-pill toggle). Blocked (409) whenever
    a Lead/PromotionEntry/SurveyOption/Distribution/SaleTransaction/InventoryLedgerEntry row points at
    this product — exactly the set of FKs that have no `ondelete=` and would make Postgres reject
    the delete outright in production anyway, so this check just surfaces that as a clear message
    instead of a raw IntegrityError. Favorite rows are cleaned up explicitly (no ORM relationship
    declared on the Product side to cascade them automatically); Review rows and product_promotions
    association rows are handled by the existing ORM cascade / SQLAlchemy's automatic secondary-
    table cleanup."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    blockers = [models.Lead, models.PromotionEntry, models.SurveyOption, models.Distribution, models.SaleTransaction, models.InventoryLedgerEntry]
    for model in blockers:
        if db.query(model.id).filter(model.product_id == product_id).first():
            raise HTTPException(
                status_code=409,
                detail="למוצר זה יש היסטוריית הזמנות/מבצעים/סקרים ולכן לא ניתן למחוק אותו לצמיתות — ניתן להסתיר אותו באמצעות כפתור הסטטוס",
            )

    db.query(models.Favorite).filter(models.Favorite.product_id == product_id).delete()
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}


@router.patch("/admin/products/bulk-category", dependencies=[Depends(get_current_admin)])
def admin_bulk_assign_category(payload: schemas.ProductBulkCategoryAssign, db: Session = Depends(get_db)):
    """Applies (or, if category_id is null, clears) one category across many products at once —
    the admin-products-page checkbox-select-then-apply flow. Every selected product must already
    belong to the target category's vertical; a mismatch rejects the whole call rather than
    silently skipping some products."""
    products = db.query(models.Product).filter(models.Product.id.in_(payload.product_ids)).all()
    if not products:
        raise HTTPException(status_code=404, detail="No products found")
    if payload.category_id is not None:
        category = (
            db.query(models.ProductCategory)
            .filter(models.ProductCategory.id == payload.category_id)
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        if not category.is_active:
            raise HTTPException(status_code=400, detail="Category is not active")
        mismatched = [p.id for p in products if p.vertical != category.vertical]
        if mismatched:
            raise HTTPException(
                status_code=400,
                detail=f"Products {mismatched} are not in the '{category.vertical}' world",
            )
    for p in products:
        p.category_id = payload.category_id
    db.commit()
    return {"updated": len(products)}


@router.patch("/admin/products/bulk-quantity-discount", dependencies=[Depends(get_current_admin)])
def admin_bulk_assign_quantity_discount(payload: schemas.ProductBulkQuantityDiscountAssign, db: Session = Depends(get_db)):
    """Applies (or, if quantity_discount_bundle_id is null, clears) one quantity-discount bundle
    across many products at once — mirrors bulk-category exactly. Bundles aren't vertical-scoped,
    so there's no vertical-mismatch check here."""
    products = db.query(models.Product).filter(models.Product.id.in_(payload.product_ids)).all()
    if not products:
        raise HTTPException(status_code=404, detail="No products found")
    validate_quantity_discount_bundle(payload.quantity_discount_bundle_id, db)
    for p in products:
        p.quantity_discount_bundle_id = payload.quantity_discount_bundle_id
    db.commit()
    return {"updated": len(products)}
