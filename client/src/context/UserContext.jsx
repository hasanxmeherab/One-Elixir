import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext();

const API_URL = import.meta.env.VITE_API_URL;

export const UserProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token  = localStorage.getItem('userToken');
    const name   = localStorage.getItem('userName');
    const email  = localStorage.getItem('userEmail');
    const avatar = localStorage.getItem('userAvatar') || '';
    const userId = localStorage.getItem('userId') || '';

    if (token && name && email) {
      setUser({ _id: userId, name, token, email, avatar });
    }
    setLoading(false);
  }, []);

  // Refresh the access token using the stored refresh token
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('userRefreshToken');
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem('userToken', data.token);
      setUser(prev => prev ? { ...prev, token: data.token } : prev);
      return data.token;
    } catch {
      return null;
    }
  }, []);

  // Wrapper for authenticated fetch that auto-retries on 401
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('userToken');
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers });
      }
    }
    return res;
  }, [refreshAccessToken]);

  const login = (userData) => {
    const u = userData.user;
    localStorage.setItem('userToken',        userData.token);
    localStorage.setItem('userRefreshToken', userData.refreshToken || '');
    localStorage.setItem('userName',         u.name);
    localStorage.setItem('userEmail',        u.email);
    localStorage.setItem('userAvatar',       u.avatar || '');
    localStorage.setItem('userId',           u._id || '');
    setUser({
      _id:    u._id   || '',
      name:   u.name,
      token:  userData.token,
      email:  u.email,
      avatar: u.avatar || ''
    });
  };

  const updateUser = (updated) => {
    if (updated.name   !== undefined) localStorage.setItem('userName',   updated.name);
    if (updated.avatar !== undefined) localStorage.setItem('userAvatar', updated.avatar);
    if (updated._id    !== undefined) localStorage.setItem('userId',     updated._id);
    setUser(prev => ({ ...prev, ...updated }));
  };

  const logout = () => {
    ['userToken','userRefreshToken','userName','userEmail','userAvatar','userId']
      .forEach(k => localStorage.removeItem(k));
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser, authLoading: loading, authFetch, refreshAccessToken }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);