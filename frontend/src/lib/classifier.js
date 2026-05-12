/**
 * Sign-language classifier — direct port of backend/app/services/detector.py.
 *
 * Takes one hand's 21 MediaPipe landmarks (each {x, y, z} in normalized image
 * coordinates) plus the handedness label, and returns { label, confidence }.
 *
 * The logic is deterministic geometry: which fingers are extended + a pinch
 * test for OK and C. No training data required.
 */

// --- Landmark indices (per MediaPipe spec) ---
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
  const tipDist = dist(lms[tipIdx], wrist);
  const pipDist = dist(lms[pipIdx], wrist);
  return tipDist > pipDist * 1.05;
}

/**
 * The thumb is mostly horizontal — we compare the tip vs MCP along x and
 * factor in handedness so the direction sign is correct on both hands.
 */
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
  // key = `${t}${i}${m}${r}${p}` of 0/1 flags
  ['00000', { label: 'FIST / A',    confidence: 0.90 }],
  ['10000', { label: 'THUMBS_UP / A', confidence: 0.88 }],
  ['01111', { label: 'B',           confidence: 0.90 }],
  ['11111', { label: 'HELLO',       confidence: 0.95 }],
  ['01000', { label: 'POINT / D',   confidence: 0.85 }],
  ['11000', { label: 'L',           confidence: 0.92 }],
  ['01100', { label: 'PEACE / V',   confidence: 0.92 }],
  ['01110', { label: 'W',           confidence: 0.88 }],
  ['00001', { label: 'I',           confidence: 0.85 }],
  ['11001', { label: 'ROCK',        confidence: 0.86 }],
  ['10001', { label: 'CALL / Y',    confidence: 0.88 }],
  ['00100', { label: 'MIDDLE',      confidence: 0.75 }],
  ['00011', { label: 'F',           confidence: 0.70 }],
]);

/**
 * Classify a single hand. Returns { label, confidence } where confidence is in [0, 1].
 *
 * @param {Array<{x:number, y:number, z:number}>} lms - 21 landmarks
 * @param {'Left' | 'Right'} handedness
 */
export function classifyHand(lms, handedness) {
  const s = computeFingerState(lms, handedness);

  // Pinch test — thumb tip touches index tip = OK / C.
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
 * Pick the best-confidence hand out of an array of (landmarks, handedness)
 * pairs and apply the global confidence threshold.
 */
export function classifyFrame(hands, minConfidence = 0.55) {
  if (!hands || hands.length === 0) {
    return { sign: 'NO_HAND', confidence: 0, handsDetected: 0 };
  }
  let best = { label: 'UNKNOWN', confidence: 0 };
  for (const { landmarks, handedness } of hands) {
    const r = classifyHand(landmarks, handedness);
    if (r.confidence > best.confidence) best = r;
  }
  return {
    sign: best.confidence >= minConfidence ? best.label : 'UNKNOWN',
    confidence: best.confidence,
    handsDetected: hands.length,
  };
}
