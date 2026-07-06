from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..security import get_current_user, get_db

router = APIRouter(tags=["favorites"])


@router.get("/favorites", response_model=List[schemas.FavoriteRead])
def list_favorites(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Favorite)
        .options(selectinload(models.Favorite.product))
        .filter(models.Favorite.user_id == current_user.id)
        .order_by(models.Favorite.created_at.desc())
        .all()
    )


@router.post("/favorites/{product_id}", response_model=schemas.FavoriteRead)
def add_favorite(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.product_id == product_id,
    ).first()
    if existing:
        return existing
    fav = models.Favorite(user_id=current_user.id, product_id=product_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/favorites/{product_id}", status_code=204)
def remove_favorite(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.product_id == product_id,
    ).first()
    if fav:
        db.delete(fav)
        db.commit()


@router.get("/favorites/ids")
def list_favorite_ids(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = db.query(models.Favorite.product_id).filter(models.Favorite.user_id == current_user.id).all()
    return [r[0] for r in rows]
