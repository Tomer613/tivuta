from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..rate_limit import limiter
from ..security import get_current_admin, get_current_user, get_db, get_password_hash, verify_password

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=schemas.UserRead)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/users/me", response_model=schemas.UserRead)
def update_users_me(
    payload: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/users/me/register-gabbai", response_model=schemas.UserRead)
def register_gabbai(
    payload: schemas.GabbaiRegistrationUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-service gabbai registration — no admin approval needed, matching the codebase's other
    instant self-service flows (e.g. card-order requests). Idempotent/upsert: sets is_gabbai=True
    unconditionally (any role — member or admin — can self-register; is_gabbai is independent of
    `role`, see models.User), then later calls (editing community/synagogue details) just update
    the fields in place. An admin can also set/unset this separately via
    PATCH /admin/users/{id}/gabbai."""
    current_user.is_gabbai = True
    current_user.gabbai_community_name = payload.community_name
    current_user.gabbai_synagogue_address = payload.synagogue_address
    current_user.gabbai_contact_name = payload.contact_name
    current_user.gabbai_contact_phone = payload.contact_phone
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/users/dashboard", response_model=schemas.DashboardData)
def get_user_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns personalized dashboard data.
    """
    distribution = [
        {"label": "אופנה", "value": 20, "color": "#8884d8"},
        {"label": "סופרים", "value": 50, "color": "#8dd1e1"},
        {"label": "אטרקציות", "value": 10, "color": "#82ca9d"},
        {"label": "יהדות", "value": 15, "color": "#ffc658"},
        {"label": "בריאות וביטוחים", "value": 5, "color": "#ff8042"}
    ]

    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()

    if not orders:
        mock_orders = [
            {"title_he": "קנייה בסופר 'אושר עד'", "amount": 450.0, "status": "completed", "date": datetime.now() - timedelta(days=2)},
            {"title_he": "חליפת צמר - בגדי גברים", "amount": 1200.0, "status": "completed", "date": datetime.now() - timedelta(days=5)},
            {"title_he": "מנוי שנתי למקווה", "amount": 350.0, "status": "completed", "date": datetime.now() - timedelta(days=10)},
            {"title_he": "כרטיסים לספארי", "amount": 280.0, "status": "completed", "date": datetime.now() - timedelta(days=15)},
        ]
        for m in mock_orders:
            db.add(models.Order(user_id=current_user.id, **m))
        db.commit()
        orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()

    return {
        "distribution": distribution,
        "total_savings": 850.0,
        "monthly_expenses": 4500.0,
        "recent_orders": orders,
    }


@router.get("/orders/me", response_model=List[schemas.OrderRead])
def get_my_orders(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(models.Order)
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.date.desc())
        .all()
    )


@router.get("/users/me/points-history", response_model=List[schemas.PointsLedgerEntryRead])
def get_my_points_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    entries = (
        db.query(models.PointsLedgerEntry)
        .options(selectinload(models.PointsLedgerEntry.sale_transaction).selectinload(models.SaleTransaction.vendor))
        .filter(models.PointsLedgerEntry.user_id == current_user.id)
        .order_by(models.PointsLedgerEntry.created_at.desc())
        .all()
    )
    return [
        schemas.PointsLedgerEntryRead(
            id=e.id,
            delta_points=e.delta_points,
            reason=e.reason,
            balance_after=e.balance_after,
            vendor_name_he=e.sale_transaction.vendor.name_he if e.sale_transaction and e.sale_transaction.vendor else None,
            created_at=e.created_at,
        )
        for e in entries
    ]


@router.patch("/users/me/notification-prefs", response_model=schemas.UserRead)
def update_notification_prefs(
    payload: schemas.NotificationPrefsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_prefs = dict(current_user.notification_prefs or {})
    updates = payload.model_dump(exclude_none=True)
    current_prefs.update(updates)
    current_user.notification_prefs = current_prefs
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/users/me/preferred-language", response_model=schemas.UserRead)
def update_preferred_language(
    payload: schemas.PreferredLanguageUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.preferred_language = payload.preferred_language
    db.commit()
    db.refresh(current_user)
    return current_user


# Admin: user management
@router.get("/admin/users", response_model=List[schemas.UserRead], dependencies=[Depends(get_current_admin)])
def admin_list_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@router.post("/admin/users", response_model=schemas.UserRead, dependencies=[Depends(get_current_admin)])
def admin_create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/admin/users/{user_id}", response_model=schemas.UserRead, dependencies=[Depends(get_current_admin)])
def admin_update_user(user_id: int, payload: schemas.UserAdminUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)
    new_email = updates.get("email")
    if new_email and new_email != user.email:
        if db.query(models.User).filter(models.User.email == new_email, models.User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        if db.query(models.Vendor).filter(models.Vendor.login_email == new_email).first():
            raise HTTPException(status_code=400, detail="Email already in use by a vendor portal account")

    for field, value in updates.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.patch("/admin/users/{user_id}/role", response_model=schemas.UserRead, dependencies=[Depends(get_current_admin)])
def admin_set_user_role(user_id: int, payload: schemas.UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role not in ("member", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/admin/users/{user_id}/gabbai", response_model=schemas.UserRead, dependencies=[Depends(get_current_admin)])
def admin_set_user_gabbai_status(user_id: int, payload: schemas.UserGabbaiStatusUpdate, db: Session = Depends(get_db)):
    """Sets gabbai status directly, independent of `role` — an admin account can be flagged
    is_gabbai=True without losing admin access (see models.User)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_gabbai = payload.is_gabbai
    db.commit()
    db.refresh(user)
    return user


@router.patch("/admin/users/{user_id}/unlock", response_model=schemas.UserRead, dependencies=[Depends(get_current_admin)])
def admin_unlock_user(user_id: int, db: Session = Depends(get_db)):
    """Immediately lifts a login lockout — for when the account/password is fine and an admin
    just wants to skip the (short, tunable via SystemSetting) wait rather than block someone
    who's calling for help. Harmless no-op if the user wasn't locked."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    db.refresh(user)
    return user


@router.delete("/admin/users/{user_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin users")
    db.delete(user)
    db.commit()
    return {"message": "deleted"}


@router.get("/admin/users/member-count", dependencies=[Depends(get_current_admin)])
def admin_member_count(db: Session = Depends(get_db)):
    # "member" here means "not an admin" (a gabbai is still a member with an extra hat), matching
    # admin_stats' member_count below.
    count = db.query(models.User).filter(models.User.role != "admin").count()
    return {"count": count}


@router.patch("/users/me/password")
@limiter.limit("5/minute")
def change_my_password(
    request: Request,
    payload: schemas.PasswordChangeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="הסיסמה הנוכחית שגויה")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="הסיסמה החדשה חייבת להכיל לפחות 6 תווים")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "ok"}


@router.get("/admin/stats", dependencies=[Depends(get_current_admin)])
def admin_stats(db: Session = Depends(get_db)):
    return {
        "open_leads": db.query(models.Lead).filter(models.Lead.status == "new").count(),
        "active_products": db.query(models.Product).filter(models.Product.is_active == True).count(),
        "member_count": db.query(models.User).filter(models.User.role != "admin").count(),
        "active_promotions": db.query(models.Promotion).filter(models.Promotion.is_active == True).count(),
        "draft_distributions": db.query(models.Distribution).filter(models.Distribution.status == "draft").count(),
    }
