import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    if (userData.role === 'admin') return <Navigate to="/admin" replace />;
    if (userData.role === 'driver') return <Navigate to="/driver" replace />;
    if (userData.role === 'pending' || userData.role === 'rejected') return <Navigate to="/pending" replace />;
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="جاري تحميل بيانات المستخدم..." />
      </div>
    );
  }

  return children;
}
