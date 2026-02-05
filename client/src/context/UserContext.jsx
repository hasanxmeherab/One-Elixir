import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const name = localStorage.getItem('userName');
    if (token && name) {
      setUser({ name, token });
    }
  }, []);

  const login = (userData) => {
    localStorage.setItem('userToken', userData.token);
    localStorage.setItem('userName', userData.user.name);
    setUser({ name: userData.user.name, token: userData.token });
  };

  const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);