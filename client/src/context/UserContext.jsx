import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token  = localStorage.getItem('userToken');
    const name   = localStorage.getItem('userName');
    const email  = localStorage.getItem('userEmail');
    const avatar = localStorage.getItem('userAvatar') || '';

    if (token && name && email) {
      setUser({ name, token, email, avatar });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('userToken',        userData.token);
    localStorage.setItem('userRefreshToken', userData.refreshToken || '');
    localStorage.setItem('userName',         userData.user.name);
    localStorage.setItem('userEmail',        userData.user.email);
    localStorage.setItem('userAvatar',       userData.user.avatar || '');
    setUser({
      name:   userData.user.name,
      token:  userData.token,
      email:  userData.user.email,
      avatar: userData.user.avatar || ''
    });
  };

  const updateUser = (updated) => {
    if (updated.name)   localStorage.setItem('userName',   updated.name);
    if (updated.avatar !== undefined) localStorage.setItem('userAvatar', updated.avatar);
    setUser(prev => ({ ...prev, ...updated }));
  };

  const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRefreshToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userAvatar');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser, authLoading: loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);