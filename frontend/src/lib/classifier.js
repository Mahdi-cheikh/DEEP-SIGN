/**
 * Sign-language classifier with two layers:
 *
 *   1. MediaPipe GestureRecognizer's built-in 7 named gestures
 *      (Open_Palm, Closed_Fist, Thumb_Up, Thumb_Down, Pointing_Up, Victory, ILoveYou)
 *   2. Our deterministic geometry classifier as a fallback for letters/shapes
 *      MediaPipe doesn't cover.
 *
 * Both produce raw labels which we then map to friendly English words via
 * WORD_MAP so the sentence builder gets natural output like "HELLO" instead
 * of "Open_Palm".
 */

// --- MediaPipe landmark indices (per official spec) ---
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function fingerExtended(lms, tipIdx, pipIdx) {
  const wrist = lms[LM.WRIST];
  return dist(lms[tipIdx], wrist) > dist(lms[pipIdx], wrist) * 1.05;
}

function thumbExtended(lms, handedness) {
  const tip = lms[LM.THUMB_TIP];
  const mcp = lms[LM.THUMB_MCP];
  const wrist = lms[LM.WRIST];
  const handSize = dist(wrist, lms[LM.MIDDLE_MCP]) || 1e-6;
  const horiz = Math.abs(tip.x - mcp.x) / handSize;
  const directional = handedness === 'Right' ? mcp.x - tip.x : tip.x - mcp.x;
  return horiz > 0.35 && directional > 0;
}

function computeFingerState(lms, handedness) {
  return {
    thumb: thumbExtended(lms, handedness),
    index: fingerExtended(lms, LM.INDEX_TIP, LM.INDEX_PIP),
    middle: fingerExtended(lms, LM.MIDDLE_TIP, LM.MIDDLE_PIP),
    ring: fingerExtended(lms, LM.RING_TIP, LM.RING_PIP),
    pinky: fingerExtended(lms, LM.PINKY_TIP, LM.PINKY_PIP),
  };
}

const TABLE = new Map([
  ['00000', { label: 'FIST',     confidence: 0.90 }],
  ['10000', { label: 'THUMBS_UP', confidence: 0.88 }],
  ['01111', { label: 'B',        confidence: 0.90 }],
  ['11111', { label: 'OPEN_PALM', confidence: 0.95 }],
  ['01000', { label: 'POINT',    confidence: 0.85 }],
  ['11000', { label: 'L',        confidence: 0.92 }],
  ['01100', { label: 'PEACE',    confidence: 0.92 }],
  ['01110', { label: 'W',        confidence: 0.88 }],
  ['00001', { label: 'I',        confidence: 0.85 }],
  ['11001', { label: 'ROCK',     confidence: 0.86 }],
  ['10001', { label: 'CALL',     confidence: 0.88 }],
  ['00100', { label: 'MIDDLE',   confidence: 0.75 }],
  ['00011', { label: 'F',        confidence: 0.70 }],
  ['10111', { label: 'ILOVEYOU', confidence: 0.90 }],
]);

/**
 * Rule-based classifier — used when the built-in GestureRecognizer
 * returns "None" or a low-confidence guess.
 */
export function classifyHand(lms, handedness) {
  const s = computeFingerState(lms, handedness);

  const handSize = dist(lms[LM.WRIST], lms[LM.MIDDLE_MCP]) || 1e-6;
  const pinch = dist(lms[LM.THUMB_TIP], lms[LM.INDEX_TIP]) / handSize;
  if (pinch < 0.35 && s.middle && s.ring && s.pinky) {
    return { label: 'OK', confidence: 0.92 };
  }
  if (pinch < 0.65 && !s.index && !s.middle && !s.ring && !s.pinky) {
    return { label: 'C', confidence: 0.78 };
  }

  const key = `${+s.thumb}${+s.index}${+s.middle}${+s.ring}${+s.pinky}`;
  return TABLE.get(key) || { label: 'UNKNOWN', confidence: 0.30 };
}

/**
 * Map raw model output (MediaPipe gesture name or our rule label) to a
 * friendly English "word" suitable for the sentence builder.
 */
export const WORD_MAP = {
  // MediaPipe GestureRecognizer built-ins
  Open_Palm:     'HELLO',
  Closed_Fist:   'STOP',
  Thumb_Up:      'YES',
  Thumb_Down:    'NO',
  Pointing_Up:   'YOU',
  Victory:       'PEACE',
  ILoveYou:      'I_LOVE_YOU',

  // Rule-based fallbacks
  OPEN_PALM:  'HELLO',
  FIST:       'STOP',
  THUMBS_UP:  'YES',
  PEACE:      'PEACE',
  POINT:      'YOU',
  ILOVEYOU:   'I_LOVE_YOU',
  OK:         'GOOD',
  ROCK:       'ROCK',
  CALL:       'CALL',
  L:          'L',
  B:          'B',
  C:          'C',
  W:          'W',
  I:          'I',
  F:          'F',
  MIDDLE:     'RUDE',
};

/** Make a label safe to display + speak. Underscores become spaces. */
export function toWord(label) {
  const mapped = WORD_MAP[label];
  if (!mapped) return null;
  return mapped.replace(/_/g, ' ');
}

/**
 * Combine GestureRecognizer's output with our rule classifier and pick the
 * best label per hand. `hands` is an array of:
 *   { landmarks, handedness, builtinGesture?, builtinScore? }
 */
export function classifyFrame(hands, minConfidence = 0.55) {
  if (!hands || hands.length === 0) {
    return { sign: 'NO_HAND', confidence: 0, handsDetected: 0 };
  }
  let best = { label: 'UNKNOWN', confidence: 0 };
  for (const h of hands) {
    let label = h.builtinGesture && h.builtinGesture !== 'None' ? h.builtinGesture : null;
    let conf = h.builtinScore ?? 0;

    // Use the rule classifier if MediaPipe is unsure.
    if (!label || conf < 0.55) {
      const r = classifyHand(h.landmarks, h.handedness);
      label = r.label;
      conf = r.confidence;
    }

    if (conf > best.confidence) best = { label, confidence: conf };
  }
  return {
    sign: best.confidence >= minConfidence ? best.label : 'UNKNOWN',
    confidence: best.confidence,
    handsDetected: hands.length,
  };
}
