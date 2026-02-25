import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

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
    <UserContext.Provider value={{ user, login, logout, updateUser, authLoading: loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);