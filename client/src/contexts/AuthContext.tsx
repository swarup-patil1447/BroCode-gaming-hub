import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (employeeId: string, password: string, expectedRole?: Role) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserSession: (updatedUser: User, newToken?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bc_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const u = await api.auth.getMe();
          setUser(u);
          localStorage.setItem('bc_user', JSON.stringify(u));
        } catch (err) {
          console.warn('Session expired or invalid, logging out.');
          logout();
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (employeeId: string, password: string, expectedRole?: Role): Promise<User> => {
    const res = await api.auth.login({ employeeId, password, expectedRole });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('bc_token', res.token);
    localStorage.setItem('bc_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('bc_token');
    localStorage.removeItem('bc_user');
  };

  const updateUserSession = (updatedUser: User, newToken?: string) => {
    setUser(updatedUser);
    localStorage.setItem('bc_user', JSON.stringify(updatedUser));
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('bc_token', newToken);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const u = await api.auth.getMe();
      setUser(u);
      localStorage.setItem('bc_user', JSON.stringify(u));
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        updateUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
