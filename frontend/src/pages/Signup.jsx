import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 0 1 0-24c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 35.9 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export default function Signup() {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await signup(form);
      if (data.session) {
        navigate('/detect', { replace: true });
      } else {
        setPendingEmail(form.email);
      }
    } catch (err) {
      setError(err.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  if (pendingEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="card text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xl font-bold">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-slate-600">
            We sent a confirmation link to <strong>{pendingEmail}</strong>. Click it to
            activate your account, then come back and sign in.
          </p>
          <Link to="/login" className="btn-primary w-full mt-6">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="card">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">Free, no credit card required.</p>

        <button
          type="button"
          onClick={onGoogle}
          className="btn-secondary w-full mt-6 !py-2.5"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          <span>or with email</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.full_name} onChange={setField('full_name')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={form.email}
              onChange={setField('email')}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={form.password}
              onChange={setField('password')}
              autoComplete="new-password"
            />
            <div className="text-xs text-slate-500 mt-1">At least 6 characters.</div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="text-sm text-slate-500 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-700 font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
