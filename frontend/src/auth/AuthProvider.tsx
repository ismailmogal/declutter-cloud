import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../api/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (token: string, userInfo?: any) => void;
  logout: () => void;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // Optionally fetch user info
      apiClient.get('/api/user/me').then(res => setUser(res.data)).catch(() => setUser(null));
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  const login = (token: string, userInfo?: any) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    if (userInfo) {
      setUser(userInfo);
    } else {
      apiClient.get('/api/user/me').then(res => setUser(res.data)).catch(() => setUser(null));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}; 