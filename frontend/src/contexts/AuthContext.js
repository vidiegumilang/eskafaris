import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { formatApiErrorDetail } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (error) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: formatApiErrorDetail(error.response?.data?.detail) || error.message,
      };
    }
  };

  const register = async (email, password, name, role) => {
    try {
      const { data } = await api.post('/auth/register', { email, password, name, role });
      setUser(data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: formatApiErrorDetail(error.response?.data?.detail) || error.message,
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};