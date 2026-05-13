import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Detect from './pages/Detect.jsx';
import History from './pages/History.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/detect"
            element={
              <ProtectedRoute>
                <Detect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="mt-10 border-t border-slate-200/60 backdrop-blur bg-white/40">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">DEEP-SIGN</span>
            <span className="mx-2 opacity-50">·</span>
            <span>React · Vite · Supabase · MediaPipe</span>
          </div>
          <div>
            Crafted by{' '}
            <a
              href="https://github.com/Mahdi-cheikh"
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-brand-700 hover:underline"
            >
              MEHDI CHEIKH
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
