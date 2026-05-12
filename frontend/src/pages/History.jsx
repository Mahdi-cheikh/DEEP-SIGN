import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch (_) {
    return iso;
  }
}

export default function History() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, s] = await Promise.all([api.history(100), api.stats()]);
      setRows(items);
      setStats(s);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClear = async () => {
    if (!confirm('Clear all detection history? This cannot be undone.')) return;
    await api.clearHistory();
    await refresh();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Detection history</h1>
          <p className="text-sm text-slate-500">Every confident sign you've signed.</p>
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
        <Stat label="Last seen" value={stats?.last_seen_at ? formatDate(stats.last_seen_at) : '—'} small />
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Sign</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-red-600">{error}</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                  No detections yet. Open the detector and hold a sign for a second!
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{r.sign}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${Math.round(r.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{Math.round(r.confidence * 100)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(r.created_at)}</td>
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
      <div className={`mt-1 font-bold text-slate-900 ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
    </div>
  );
}
