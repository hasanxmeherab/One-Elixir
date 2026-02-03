import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Check if our "auth" flag exists in localStorage
  const isAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';

  if (!isAuthenticated) {
    // Redirect to a simple login page if not authenticated
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default ProtectedRoute;