"use client";

import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'theosphere-access-token';
const USER_ID_KEY = 'theosphere-user-id';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inicializa o estado a partir do localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUserId = localStorage.getItem(USER_ID_KEY);
    
    if (savedToken) {
      // Verificação básica de expiração via payload do JWT
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setToken(savedToken);
          setUserId(savedUserId || payload.sub);
          setIsAuthenticated(true);
        } else {
          // Token expirado
          logout();
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        const { accessToken, userId: id } = data.data;
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(USER_ID_KEY, id);
        setToken(accessToken);
        setUserId(id);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: data.message || 'Falha no login' };
    } catch (err) {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        return await login(email, password);
      }
      return { success: false, error: data.message || 'Falha no cadastro' };
    } catch (err) {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    setToken(null);
    setUserId(null);
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    userId,
    token,
    loading,
    login,
    register,
    logout,
  };
}
