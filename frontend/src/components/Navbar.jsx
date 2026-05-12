import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItem =
  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors';
const navActive = 'bg-brand-50 text-brand-700';
const navIdle = 'text-slate-600 hover:text-brand-700 hover:bg-slate-100';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white shadow-card">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 11V6a2 2 0 1 1 4 0v4" />
              <path d="M10 6V4a2 2 0 1 1 4 0v6" />
              <path d="M14 6a2 2 0 1 1 4 0v8a6 6 0 0 1-12 0V8" />
            </svg>
          </span>
          DEEP-SIGN
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <NavLink to="/detect" className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
                Detect
              </NavLink>
              <NavLink to="/history" className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
                History
              </NavLink>
              <span className="hidden sm:inline text-xs text-slate-500 px-2">
                {user.full_name || user.email}
              </span>
              <button onClick={logout} className="btn-secondary !px-3 !py-1.5 text-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
                Sign in
              </NavLink>
              <Link to="/signup" className="btn-primary !px-3 !py-1.5 text-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
