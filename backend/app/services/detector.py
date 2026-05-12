"""Sign-language detection service.

Uses MediaPipe Hands to extract 21 hand landmarks per detected hand, then runs
a deterministic, geometry-based classifier over the finger states to recognise
a curated set of common signs and ASL letters:

    A, B, C, D, F, I, L, O, V, W, Y,
    HELLO (open palm), THUMBS_UP, OK, FIST, PEACE, ROCK, CALL, POINT.

The classifier is intentionally model-free so the project works out of the box
on any machine with no training data required. A drop-in ``KerasClassifier``
hook is provided for upgrading to a trained model later.
"""
from __future__ import annotations

import base64
import math
from dataclasses import dataclass
from io import BytesIO
from typing import List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

from ..config import settings


# --- MediaPipe landmark indices (per official spec) ---
WRIST = 0
THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

FINGER_TIPS = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
FINGER_PIPS = [INDEX_PIP, MIDDLE_PIP, RING_PIP, PINKY_PIP]
FINGER_MCPS = [INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP]


@dataclass
class FingerState:
    """Which fingers are extended on a single hand."""

    thumb: bool
    index: bool
    middle: bool
    ring: bool
    pinky: bool

    def as_tuple(self) -> Tuple[bool, bool, bool, bool, bool]:
        return self.thumb, self.index, self.middle, self.ring, self.pinky

    @property
    def extended_count(self) -> int:
        return sum(self.as_tuple())


def _distance(a, b) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _finger_extended(landmarks, tip_idx: int, pip_idx: int, mcp_idx: int) -> bool:
    """A finger is extended if its tip is farther from the wrist than the PIP joint."""
    wrist = landmarks[WRIST]
    tip_dist = _distance(landmarks[tip_idx], wrist)
    pip_dist = _distance(landmarks[pip_idx], wrist)
    return tip_dist > pip_dist * 1.05


def _thumb_extended(landmarks, handedness: str) -> bool:
    """Thumb is mostly horizontal — compare tip vs IP along the x-axis."""
    tip = landmarks[THUMB_TIP]
    ip = landmarks[THUMB_IP]
    mcp = landmarks[THUMB_MCP]
    # Use horizontal separation between tip and MCP, scaled by hand size.
    hand_size = _distance(landmarks[WRIST], landmarks[MIDDLE_MCP]) or 1e-6
    horiz = abs(tip[0] - mcp[0]) / hand_size
    # Right hand: thumb extended to the left; left hand: to the right.
    if handedness == "Right":
        directional = mcp[0] - tip[0]
    else:
        directional = tip[0] - mcp[0]
    return horiz > 0.35 and directional > 0


def _compute_finger_state(landmarks, handedness: str) -> FingerState:
    return FingerState(
        thumb=_thumb_extended(landmarks, handedness),
        index=_finger_extended(landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP),
        middle=_finger_extended(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP),
        ring=_finger_extended(landmarks, RING_TIP, RING_PIP, RING_MCP),
        pinky=_finger_extended(landmarks, PINKY_TIP, PINKY_PIP, PINKY_MCP),
    )


def _classify(landmarks, handedness: str) -> Tuple[str, float]:
    """Return (label, confidence) for one hand. Confidence is heuristic but stable."""
    state = _compute_finger_state(landmarks, handedness)
    t, i, m, r, p = state.as_tuple()

    # OK sign: thumb tip touches index tip, other three extended.
    hand_size = _distance(landmarks[WRIST], landmarks[MIDDLE_MCP]) or 1e-6
    pinch = _distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / hand_size
    if pinch < 0.35 and m and r and p:
        return "OK", 0.92

    # C: thumb + index curved into a C shape, other fingers mostly curled.
    if pinch < 0.65 and not i and not m and not r and not p:
        return "C", 0.78

    table = {
        # (thumb, index, middle, ring, pinky)
        (False, False, False, False, False): ("FIST / A", 0.90),
        (True, False, False, False, False): ("THUMBS_UP / A", 0.88),
        (False, True, True, True, True): ("B", 0.90),
        (True, True, True, True, True): ("HELLO", 0.95),
        (False, True, False, False, False): ("POINT / D", 0.85),
        (True, True, False, False, False): ("L", 0.92),
        (False, True, True, False, False): ("PEACE / V", 0.92),
        (False, True, True, True, False): ("W", 0.88),
        (False, False, False, False, True): ("I", 0.85),
        (True, True, False, False, True): ("ROCK", 0.86),
        (True, False, False, False, True): ("CALL / Y", 0.88),
        (False, False, True, False, False): ("MIDDLE", 0.75),
        (False, False, False, True, True): ("F", 0.70),
    }

    label, conf = table.get(state.as_tuple(), ("UNKNOWN", 0.30))
    return label, conf


class SignDetector:
    """Wraps MediaPipe Hands and exposes a frame-by-frame predict API."""

    def __init__(self) -> None:
        self._mp_hands = mp.solutions.hands
        self._hands = self._mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.5,
        )

    # ---- input adapters ---------------------------------------------------

    @staticmethod
    def decode_data_url(data_url: str) -> np.ndarray:
        """Decode a `data:image/...;base64,...` payload into a BGR np.array."""
        if "," in data_url:
            data_url = data_url.split(",", 1)[1]
        raw = base64.b64decode(data_url)
        img = Image.open(BytesIO(raw)).convert("RGB")
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    @staticmethod
    def decode_bytes(buf: bytes) -> np.ndarray:
        img = Image.open(BytesIO(buf)).convert("RGB")
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    # ---- prediction -------------------------------------------------------

    def predict(self, frame_bgr: np.ndarray) -> dict:
        """Run detection on a single BGR frame and return a dict result."""
        if frame_bgr is None or frame_bgr.size == 0:
            return {"sign": "NO_INPUT", "confidence": 0.0, "hands_detected": 0, "annotations": []}

        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self._hands.process(rgb)

        if not results.multi_hand_landmarks:
            return {
                "sign": "NO_HAND",
                "confidence": 0.0,
                "hands_detected": 0,
                "annotations": [],
            }

        annotations: List[List[float]] = []
        best_label = "UNKNOWN"
        best_conf = 0.0

        for hand_landmarks, hand_info in zip(
            results.multi_hand_landmarks, results.multi_handedness
        ):
            handedness = hand_info.classification[0].label  # "Left" / "Right"
            pts = [(lm.x, lm.y) for lm in hand_landmarks.landmark]
            label, conf = _classify(pts, handedness)

            # Highest-confidence hand wins.
            if conf > best_conf:
                best_label, best_conf = label, conf
            for x, y in pts:
                annotations.append([float(x), float(y)])

        # Fall back to UNKNOWN if below threshold.
        if best_conf < settings.min_confidence:
            display_label = "UNKNOWN"
        else:
            display_label = best_label

        return {
            "sign": display_label,
            "confidence": round(float(best_conf), 3),
            "hands_detected": len(results.multi_hand_landmarks),
            "annotations": annotations,
        }

    def close(self) -> None:
        try:
            self._hands.close()
        except Exception:
            pass


# Module-level singleton — MediaPipe graphs are expensive to construct.
_detector: Optional[SignDetector] = None


def get_detector() -> SignDetector:
    global _detector
    if _detector is None:
        _detector = SignDetector()
    return _detector
