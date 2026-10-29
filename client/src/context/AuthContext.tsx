import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types/index.js';
import { api } from '../services/api.js';
import { getSocket, disconnectSocket } from '../services/socket.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | undefined>;
  register: (formData: any) => Promise<User | undefined>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('findback_token') || localStorage.getItem('campusconnect_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; user: User }>('/auth/me');
      if (res.success) {
        setUser(res.user);
        getSocket();
      }
    } catch {
      localStorage.removeItem('findback_token');
      localStorage.removeItem('campusconnect_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, [token, refreshProfile]);

  const login = async (email: string, password: string): Promise<User | undefined> => {
    const res = await api.post<{ success: boolean; token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    if (res.success) {
      localStorage.setItem('findback_token', res.token);
      setToken(res.token);
      setUser(res.user);
      getSocket();
      return res.user;
    }
  };

  const register = async (formData: any): Promise<User | undefined> => {
    const res = await api.post<{ success: boolean; token: string; user: User }>('/auth/register', formData);
    if (res.success) {
      localStorage.setItem('findback_token', res.token);
      setToken(res.token);
      setUser(res.user);
      getSocket();
      return res.user;
    }
  };

  const logout = () => {
    localStorage.removeItem('findback_token');
    localStorage.removeItem('campusconnect_token');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
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
