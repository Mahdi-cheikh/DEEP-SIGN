"""Detection endpoints: REST (single image) and WebSocket (live stream)."""
from __future__ import annotations

import asyncio
import json
import logging

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..models import Detection, User
from ..schemas import DetectionResult
from ..security import get_current_user, get_user_from_token
from ..services.detector import get_detector

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/detect", tags=["detect"])


def _persist(db: Session, user_id: int, sign: str, confidence: float) -> None:
    """Save a detection to history when it's a confident, real sign."""
    if sign in {"UNKNOWN", "NO_HAND", "NO_INPUT"}:
        return
    row = Detection(user_id=user_id, sign=sign, confidence=confidence)
    db.add(row)
    db.commit()


@router.post("/image", response_model=DetectionResult)
def detect_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DetectionResult:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload must be an image",
        )
    buf = file.file.read()
    frame = get_detector().decode_bytes(buf)
    result = get_detector().predict(frame)
    _persist(db, current_user.id, result["sign"], result["confidence"])
    return DetectionResult(**result)


@router.websocket("/ws")
async def detect_ws(websocket: WebSocket) -> None:
    """Real-time detection over WebSocket.

    Protocol:
      * Client connects with ``?token=<jwt>``.
      * Client sends frames as text messages containing a base64 ``data:image/jpeg`` URL.
      * Server replies with JSON ``{sign, confidence, hands_detected, annotations}``.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = get_user_from_token(token, db)
    except HTTPException:
        await websocket.close(code=4401)
        db.close()
        return

    await websocket.accept()
    detector = get_detector()
    loop = asyncio.get_running_loop()

    last_persisted_sign: str | None = None
    persisted_streak = 0
    PERSIST_THRESHOLD = 4  # require N consecutive frames to log a sign

    try:
        while True:
            message = await websocket.receive_text()
            try:
                frame = await loop.run_in_executor(
                    None, detector.decode_data_url, message
                )
                result = await loop.run_in_executor(None, detector.predict, frame)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Detection failed")
                await websocket.send_text(
                    json.dumps({"error": "decode_failed", "detail": str(exc)})
                )
                continue

            sign = result["sign"]
            if sign == last_persisted_sign:
                persisted_streak += 1
            else:
                last_persisted_sign = sign
                persisted_streak = 1

            if persisted_streak == PERSIST_THRESHOLD:
                _persist(db, user.id, sign, result["confidence"])

            await websocket.send_text(json.dumps(result))
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for user %s", user.id)
    finally:
        db.close()
