import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..security import get_current_admin
from ..services.translator import translate_product

router = APIRouter(tags=["translate"])


class TranslateRequest(BaseModel):
    title_he: str
    description_he: str


@router.get("/admin/translate/status", dependencies=[Depends(get_current_admin)])
def translate_status():
    return {"available": bool(os.environ.get("ANTHROPIC_API_KEY"))}


@router.post("/admin/translate", dependencies=[Depends(get_current_admin)])
def auto_translate(payload: TranslateRequest):
    if not payload.title_he.strip():
        raise HTTPException(status_code=400, detail="title_he is required")
    try:
        return translate_product(payload.title_he, payload.description_he)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Translation failed")
