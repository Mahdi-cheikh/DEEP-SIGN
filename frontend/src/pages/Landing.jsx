import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="badge bg-brand-100 text-brand-700 mb-4">Real-time · WebSocket · MediaPipe</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Real-time sign-language <span className="text-brand-700">detection</span> in your browser.
          </h1>
          <p className="mt-4 text-slate-600 text-lg">
            DEEP-SIGN runs hand-landmark recognition on your webcam frames and recognises common ASL letters and
            gestures with sub-200&nbsp;ms latency. Save your sessions, review history, and explore the API.
          </p>
          <div className="mt-8 flex gap-3">
            {user ? (
              <Link to="/detect" className="btn-primary">Open detector</Link>
            ) : (
              <>
                <Link to="/signup" className="btn-primary">Create free account</Link>
                <Link to="/login" className="btn-secondary">Sign in</Link>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-3 gap-4 text-center">
            {['HELLO', 'PEACE', 'OK', 'L', 'THUMBS_UP', 'C', 'ROCK', 'CALL', 'B'].map((s) => (
              <div
                key={s}
                className="aspect-square rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 grid place-items-center text-brand-700 font-bold text-sm shadow-inner"
              >
                {s}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Out-of-the-box signs — no training data required.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-16">
        {[
          { t: 'Frame-by-frame', d: '21 hand landmarks per hand via MediaPipe, classified server-side.' },
          { t: 'Stays in sync', d: 'WebSocket streaming keeps latency low and the UI smooth.' },
          { t: 'Your history', d: 'Confident detections are logged to your account automatically.' },
        ].map((f) => (
          <div key={f.t} className="card">
            <div className="text-sm font-semibold text-slate-900">{f.t}</div>
            <p className="text-sm text-slate-600 mt-1">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
