import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('deepsign_token'));
  const [loading, setLoading] = useState(true);

  // Bootstrap session on mount.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('deepsign_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const persist = useCallback((data) => {
    localStorage.setItem('deepsign_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await api.login(email, password);
      persist(data);
      return data;
    },
    [persist]
  );

  const signup = useCallback(
    async (payload) => {
      const data = await api.signup(payload);
      persist(data);
      return data;
    },
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('deepsign_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
