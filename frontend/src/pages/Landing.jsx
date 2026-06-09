import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const VOCAB = [
  { word: 'HELLO',     hint: 'Open palm' },
  { word: 'YES',       hint: 'Thumbs up' },
  { word: 'NO',        hint: 'Thumbs down' },
  { word: 'PEACE',     hint: 'Victory' },
  { word: 'YOU',       hint: 'Pointing up' },
  { word: 'STOP',      hint: 'Closed fist' },
  { word: 'I LOVE YOU',hint: 'ASL sign' },
  { word: 'GOOD',      hint: 'OK pinch' },
  { word: 'CALL',      hint: 'Thumb + pinky' },
];

const FOR_WHO = [
  {
    title: 'Deaf and hard-of-hearing communities',
    body: 'Lets you sign directly to anyone with a webcam — your gestures become spoken words instantly, with no special equipment needed.',
  },
  {
    title: 'Students and educators',
    body: 'A free, browser-based tool to practice common gestures and ASL signs. Detection feedback is instant and visual.',
  },
  {
    title: 'Developers and researchers',
    body: 'Open-source codebase, deterministic geometry classifier, and a clean Supabase backend. Fork it, extend the vocabulary, or train your own model.',
  },
  {
    title: 'Accessibility teams',
    body: 'Ship inclusive features without bloated SDKs or paid services. Runs entirely client-side — privacy by default.',
  },
];

const HOW_STEPS = [
  {
    n: '01',
    title: 'You sign in front of your camera',
    body: 'Browser-only — no install. Webcam frames are processed locally and never uploaded.',
  },
  {
    n: '02',
    title: 'MediaPipe finds your hand',
    body: 'Google’s WASM Hand Landmarker locates 21 joints on each hand at ~30 fps directly on your device.',
  },
  {
    n: '03',
    title: 'A classifier names the sign',
    body: 'Geometric rules + MediaPipe’s gesture model identify what you are signing and how confident we are.',
  },
  {
    n: '04',
    title: 'Words become a sentence — and speech',
    body: 'Hold each sign for half a second to add it; the browser’s text-to-speech speaks the full sentence aloud.',
  },
];

function HandIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11V5.5a1.5 1.5 0 1 1 3 0V11" />
      <path d="M12 11V4.5a1.5 1.5 0 1 1 3 0V11" />
      <path d="M15 11V6a1.5 1.5 0 1 1 3 0v10a6 6 0 0 1-12 0v-4" />
      <path d="M6 12V9a1.5 1.5 0 1 1 3 0v3" />
    </svg>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
      {/* HERO --------------------------------------------------------------- */}
      <section className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <span className="inline-flex items-center gap-2 badge bg-white/70 text-brand-700 border border-brand-100 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Real-time · In-browser · Open-source
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Sign with your hands.
            <br />
            <span className="text-gradient">Speak with the world.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
            DEEP-SIGN turns hand gestures into words, sentences and speech in real time —
            without sending a single frame of video to a server. Everything runs in your
            browser, on any modern phone or computer.
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
                </Link>
                <Link to="/login" className="btn-secondary !px-5 !py-3 text-base">
                  Sign in
                </Link>
              </>
            )}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { v: '~30', l: 'fps detection' },
              { v: '0', l: 'frames uploaded' },
              { v: '20+', l: 'signs supported' },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular">{s.v}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="card !p-5">
            <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <span>Vocabulary</span>
              <span className="text-brand-700">{VOCAB.length} signs</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {VOCAB.map((s, i) => (
                <div
                  key={s.word}
                  className="aspect-square rounded-2xl flex flex-col items-center justify-center text-center p-2 transition-transform hover:scale-[1.03]"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(219,234,254,0.7) 100%)',
                    animation: `floaty 6s ease-in-out ${i * 0.12}s infinite alternate`,
                  }}
                >
                  <HandIcon className="w-7 h-7 text-brand-700/80" />
                  <div className="mt-2 text-[11px] sm:text-xs font-bold text-brand-800 tracking-wide leading-tight">
                    {s.word}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5 leading-tight hidden sm:block">
                    {s.hint}
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

          <div
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-50 blur-2xl -z-10"
            style={{ background: 'radial-gradient(closest-side, #4f90ff, transparent)' }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-50 blur-2xl -z-10"
            style={{ background: 'radial-gradient(closest-side, #22d3ee, transparent)' }}
          />
        </div>
      </section>

      {/* HOW IT WORKS ------------------------------------------------------- */}
      <section className="mt-24">
        <div className="text-center mb-12">
          <span className="badge bg-white/70 text-brand-700 border border-brand-100 mb-3">How it works</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            From gesture to sentence,
            <span className="text-gradient"> in four steps</span>
          </h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Built with MediaPipe&apos;s WebAssembly hand landmarker, a deterministic
            geometry classifier and the browser&apos;s native Web Speech API.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_STEPS.map((s) => (
            <div key={s.n} className="card">
              <div className="text-xs font-mono font-bold text-brand-600 tabular">{s.n}</div>
              <div className="text-base font-bold text-slate-900 mt-2 leading-snug">{s.title}</div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOR WHO ------------------------------------------------------------ */}
      <section className="mt-24">
        <div className="text-center mb-12">
          <span className="badge bg-white/70 text-brand-700 border border-brand-100 mb-3">Who it&apos;s for</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Built for everyone who
            <span className="text-gradient"> wants to be understood</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FOR_WHO.map((f) => (
            <div key={f.title} className="card">
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-white"
                  style={{ backgroundImage: 'linear-gradient(135deg, #4f90ff, #1d4ed8)' }}
                >
                  <HandIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">{f.title}</div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER ------------------------------------------------------------ */}
      <section className="mt-24">
        <div className="card grid sm:grid-cols-[180px_1fr] sm:items-center gap-6 sm:gap-8 p-6 sm:p-8">
          <div className="mx-auto sm:mx-0">
            <div
              className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #dbeafe, #93c5fd)' }}
            >
              <img
                src={`${import.meta.env.BASE_URL}founder.jpg`}
                alt="Mehdi Cheikh — founder of DEEP-SIGN"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Graceful fallback if the photo hasn't been added yet.
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.querySelector('[data-initials]').style.display = 'grid';
                }}
              />
              <div
                data-initials
                style={{ display: 'none' }}
                className="absolute inset-0 place-items-center text-brand-800 text-4xl font-extrabold"
              >
                MC
              </div>
            </div>
          </div>
          <div>
            <span className="badge bg-brand-50 text-brand-700">Founder &amp; developer</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 text-slate-900">
              Mehdi Cheikh
            </h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              I built DEEP-SIGN because accessible communication shouldn&apos;t require expensive
              hardware or sending video to a server. My goal is a free, private, in-browser tool
              that lets anyone be heard the moment they sign — on any device, anywhere. The whole
              project is open-source so others can extend the vocabulary, train new models, and
              build it into their own products.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://github.com/Mahdi-cheikh"
                target="_blank"
                rel="noreferrer noopener"
                className="badge bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                github.com/Mahdi-cheikh
              </a>
              <span className="badge bg-slate-100 text-slate-700">Université de Kairouan</span>
              <span className="badge bg-slate-100 text-slate-700">Tunisia</span>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA ---------------------------------------------------------- */}
      <section className="mt-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to be <span className="text-gradient">heard?</span>
        </h2>
        <p className="mt-3 text-slate-600 max-w-xl mx-auto">
          Free forever. No server, no tracking, no install required —
          but you can add DEEP-SIGN to your home screen like a native app.
        </p>
        <div className="mt-6 inline-flex flex-wrap gap-3 justify-center">
          {user ? (
            <Link to="/detect" className="btn-primary !px-6 !py-3 text-base">Open detector</Link>
          ) : (
            <>
              <Link to="/signup" className="btn-primary !px-6 !py-3 text-base">Create free account</Link>
              <Link to="/login" className="btn-secondary !px-6 !py-3 text-base">I have an account</Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
