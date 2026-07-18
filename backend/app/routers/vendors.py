from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import get_current_admin, get_db

router = APIRouter(tags=["vendors"])

VALID_VERTICALS = ("diamonds", "cars", "insurance")


def _validate_vertical(vertical: str):
    if vertical not in VALID_VERTICALS:
        raise HTTPException(status_code=400, detail=f"vertical must be one of {VALID_VERTICALS}")


@router.get("/admin/vendors", response_model=List[schemas.VendorRead], dependencies=[Depends(get_current_admin)])
def admin_list_vendors(vertical: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Vendor)
    if vertical:
        query = query.filter(models.Vendor.vertical == vertical)
    return query.order_by(models.Vendor.created_at.desc()).all()


@router.post("/admin/vendors", response_model=schemas.VendorRead, dependencies=[Depends(get_current_admin)])
def admin_create_vendor(vendor_in: schemas.VendorCreate, db: Session = Depends(get_db)):
    _validate_vertical(vendor_in.vertical)
    new_vendor = models.Vendor(**vendor_in.model_dump())
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    return new_vendor


@router.patch("/admin/vendors/{vendor_id}", response_model=schemas.VendorRead, dependencies=[Depends(get_current_admin)])
def admin_update_vendor(vendor_id: int, vendor_in: schemas.VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    update_data = vendor_in.model_dump(exclude_unset=True)
    if "vertical" in update_data:
        _validate_vertical(update_data["vertical"])
        if update_data["vertical"] != vendor.vertical:
            raise HTTPException(status_code=400, detail="Vendor vertical cannot be changed after creation")
    for key, value in update_data.items():
        setattr(vendor, key, value)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/admin/vendors/{vendor_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.is_active = False
    db.commit()
    return {"message": "Vendor deactivated"}
