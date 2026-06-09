import { Link, NavLink } from 'react-router-dom';

const navItem = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all';
const navActive = 'bg-brand-50 text-brand-700 shadow-sm';
const navIdle = 'text-slate-600 hover:text-brand-700 hover:bg-white/60';

function Logo() {
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white shadow-lg shadow-brand-500/30 ring-1 ring-white/50"
      style={{ backgroundImage: 'linear-gradient(135deg, #4f90ff 0%, #1d4ed8 60%, #1e3a8a 100%)' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor">
        <g>
          <path d="M9.5 17.2c0-1.6 0.8-2.4 2.2-2.4h7.6c1.3 0 2.2 0.9 2.2 2.3v4.8c0 2.9-2.4 5.3-5.3 5.3h-1.4c-2.9 0-5.3-2.4-5.3-5.3z" />
          <rect x="10.2" y="7.5" width="2.2" height="9" rx="1.1" />
          <rect x="13.2" y="9.5" width="2.2" height="7" rx="1.1" />
          <rect x="16.2" y="10" width="2.2" height="6.5" rx="1.1" />
          <rect x="19" y="11" width="2" height="5.5" rx="1" />
          <path d="M9.4 16.6c-1.4 0.4-2.3 1.6-2.3 3 0 1.5 1.1 2.5 2.5 2.5l1.8-0.2v-5.4z" />
        </g>
      </svg>
    </span>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-lg bg-white/60 border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold tracking-tight text-slate-900">
              DEEP<span className="text-brand-600">·</span>SIGN
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
              by Mehdi Cheikh
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/detect" className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
            Detect
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `${navItem} ${isActive ? navActive : navIdle}`}>
            History
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
