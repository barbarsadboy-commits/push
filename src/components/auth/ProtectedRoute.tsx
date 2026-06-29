import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'free' | 'vip' | 'reseller' | 'dev';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, status_active, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 animate-pulse">Initializing JhnzSuite...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!status_active && role !== 'owner') {
    return <Navigate to="/lock" replace />;
  }

  // Check if user has required role or is dev
  const hasAccess = !requiredRole || role === requiredRole || role === 'dev';

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
