from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_current_user, get_db, get_password_hash

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
    count = db.query(models.User).filter(models.User.role == "member").count()
    return {"count": count}
