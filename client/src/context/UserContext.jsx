import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Added to track initial load

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail'); // Retrieve email

    if (token && name && email) {
      setUser({ name, token, email }); // Set user with email
    }
    setLoading(false); // Auth check complete
  }, []);

  const login = (userData) => {
    localStorage.setItem('userToken', userData.token);
    localStorage.setItem('userName', userData.user.name);
    localStorage.setItem('userEmail', userData.user.email); // Save email
    
    setUser({ 
      name: userData.user.name, 
      token: userData.token, 
      email: userData.user.email 
    });
  };

  const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail'); // Remove email
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, authLoading: loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);