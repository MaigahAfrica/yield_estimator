import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser } from '../context/AuthContext';

type Role = AuthUser['role'];

export interface ProtectedRouteProps {
  roles?: Role[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="unauthorized">
        <h2>Access denied</h2>
        <p>You do not have permission to view this area. Please contact an administrator.</p>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
