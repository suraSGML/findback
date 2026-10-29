import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard/admin" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export default OfficerDashboard;
