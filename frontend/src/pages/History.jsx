import { useCallback, useEffect, useState } from 'react';
import { history } from '../lib/history.js';

function formatDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function computeStats(rows) {
  if (!rows.length) return { total: 0, unique_signs: 0, top_sign: null, last_seen_at: null };
  const counts = new Map();
  for (const r of rows) counts.set(r.sign, (counts.get(r.sign) || 0) + 1);
  let top = null, topCount = 0;
  for (const [sign, c] of counts) {
    if (c > topCount) { topCount = c; top = sign; }
  }
  return {
    total: rows.length,
    unique_signs: counts.size,
    top_sign: top,
    last_seen_at: rows[0].createdAt,
  };
}

export default function History() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);

  const refresh = useCallback(() => {
    const data = history.load();
    setRows(data);
    setStats(computeStats(data));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onClear = () => {
    if (!confirm('Clear all detection history? This cannot be undone.')) return;
    history.clear();
    refresh();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Detection history</h1>
          <p className="text-sm text-slate-500">
            Stored in this browser only &mdash; nothing leaves your device.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="btn-secondary">Refresh</button>
          <button onClick={onClear} className="btn-danger">Clear all</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Total detections" value={stats?.total ?? '—'} />
        <Stat label="Unique signs" value={stats?.unique_signs ?? '—'} />
        <Stat label="Top sign" value={stats?.top_sign ?? '—'} />
        <Stat
          label="Last seen"
          value={stats?.last_seen_at ? formatDate(stats.last_seen_at) : '—'}
          small
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-left text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Sign</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                  No detections yet. Open the detector and hold a sign for a second!
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-900">{r.sign}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${Math.round(Number(r.confidence) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 tabular">
                      {Math.round(Number(r.confidence) * 100)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className="card !p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 font-bold text-slate-900 ${small ? 'text-base' : 'text-2xl'}`}>
        {value}
      </div>
    </div>
  );
}
