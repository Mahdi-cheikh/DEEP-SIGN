"""History endpoints: list and stats."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Detection, User
from ..schemas import DetectionRead, HistoryStats
from ..security import get_current_user

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/", response_model=List[DetectionRead])
def list_history(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[DetectionRead]:
    rows = (
        db.query(Detection)
        .filter(Detection.user_id == current_user.id)
        .order_by(desc(Detection.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [DetectionRead.model_validate(r) for r in rows]


@router.get("/stats", response_model=HistoryStats)
def history_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HistoryStats:
    base = db.query(Detection).filter(Detection.user_id == current_user.id)
    total = base.count()
    unique = (
        db.query(func.count(func.distinct(Detection.sign)))
        .filter(Detection.user_id == current_user.id)
        .scalar()
        or 0
    )
    top = (
        db.query(Detection.sign, func.count(Detection.id).label("c"))
        .filter(Detection.user_id == current_user.id)
        .group_by(Detection.sign)
        .order_by(desc("c"))
        .first()
    )
    last = base.order_by(desc(Detection.created_at)).first()

    return HistoryStats(
        total=total,
        unique_signs=int(unique),
        top_sign=top[0] if top else None,
        last_seen_at=last.created_at if last else None,
    )


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    db.query(Detection).filter(Detection.user_id == current_user.id).delete()
    db.commit()
