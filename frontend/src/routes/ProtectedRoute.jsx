import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protect any authenticated route
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="spinner" style={{width:40,height:40}} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Restrict to specific roles
export const RoleRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};
