// LocalStorage-backed detection history (no server, no auth).
// Each browser keeps its own list. Capped at 500 most recent entries.

const KEY = 'deepsign:history';
const MAX = 500;

function safeParse(raw) {
  try { return JSON.parse(raw) || []; } catch { return []; }
}

export const history = {
  /** Return rows sorted newest-first. */
  load() {
    if (typeof window === 'undefined') return [];
    return safeParse(localStorage.getItem(KEY));
  },

  /** Append a detection and return the new list. */
  add(sign, confidence) {
    if (typeof window === 'undefined') return [];
    const rows = this.load();
    rows.unshift({
      id: Date.now() + Math.random(),
      sign,
      confidence: Number(Number(confidence).toFixed(3)),
      createdAt: new Date().toISOString(),
    });
    if (rows.length > MAX) rows.length = MAX;
    localStorage.setItem(KEY, JSON.stringify(rows));
    return rows;
  },

  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEY);
  },
};
