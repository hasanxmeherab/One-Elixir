import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Check for both the flag and the JWT token
  const isAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';
  const hasToken = localStorage.getItem('adminToken');

  if (!isAuthenticated || !hasToken) {
    // Redirect to the new admin login page
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

export default ProtectedRoute;