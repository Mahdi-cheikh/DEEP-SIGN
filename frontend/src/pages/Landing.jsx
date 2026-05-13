import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const SIGNS = [
  { label: 'HELLO',        emoji: '✋' },
  { label: 'YES',          emoji: '👍' },
  { label: 'NO',           emoji: '👎' },
  { label: 'PEACE',        emoji: '✌️' },
  { label: 'YOU',          emoji: '☝️' },
  { label: 'STOP',         emoji: '✊' },
  { label: 'I LOVE YOU',   emoji: '🤟' },
  { label: 'GOOD',         emoji: '👌' },
  { label: 'ROCK',         emoji: '🤘' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <span className="inline-flex items-center gap-2 badge bg-white/70 text-brand-700 border border-brand-100 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Real-time · In-browser · No server
          </span>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Sign with your hands.
            <br />
            <span className="text-gradient">Speak with the world.</span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
            DEEP-SIGN turns hand gestures into words, sentences, and speech — all powered
            by MediaPipe running directly in your browser. No video ever leaves your computer.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link to="/detect" className="btn-primary !px-5 !py-3 text-base">
                Open detector
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-primary !px-5 !py-3 text-base">
                  Create free account
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/login" className="btn-secondary !px-5 !py-3 text-base">
                  Sign in
                </Link>
              </>
            )}
          </div>

          <div className="mt-10 flex items-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              No data leaves your browser
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              ~30 fps on any modern device
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="card !p-5">
            <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <span>Vocabulary</span>
              <span className="text-brand-700">{SIGNS.length} signs</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SIGNS.map((s, i) => (
                <div
                  key={s.label}
                  className="aspect-square rounded-2xl grid place-items-center text-center transition-transform hover:scale-[1.04]"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(239,246,255,0.9) 0%, rgba(219,234,254,0.7) 100%)',
                    animation: `floaty 6s ease-in-out ${i * 0.12}s infinite alternate`,
                  }}
                >
                  <div>
                    <div className="text-3xl">{s.emoji}</div>
                    <div className="mt-1 text-[11px] font-bold text-brand-800 tracking-wide">
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes floaty {
              0%   { transform: translateY(0); }
              100% { transform: translateY(-4px); }
            }
          `}</style>

          {/* Floating decoration */}
          <div
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-50 blur-2xl -z-10"
            style={{ background: 'radial-gradient(closest-side, #4f90ff, transparent)' }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-50 blur-2xl -z-10"
            style={{ background: 'radial-gradient(closest-side, #22d3ee, transparent)' }}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-20">
        {[
          {
            t: 'Pure-browser inference',
            d: '21 hand landmarks per hand via MediaPipe WASM. No server round-trip, no upload.',
            icon: (
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            ),
          },
          {
            t: 'Sentence builder',
            d: 'Hold each sign for half a second. Words stack into sentences and play through your speakers.',
            icon: (
              <>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            ),
          },
          {
            t: 'Your history, private',
            d: 'Confident detections persist to your Supabase account — row-level security keeps them yours.',
            icon: (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            ),
          },
        ].map((f) => (
          <div key={f.t} className="card">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center text-white mb-3"
              style={{ backgroundImage: 'linear-gradient(135deg, #4f90ff, #1d4ed8)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {f.icon}
              </svg>
            </div>
            <div className="text-sm font-bold text-slate-900">{f.t}</div>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
