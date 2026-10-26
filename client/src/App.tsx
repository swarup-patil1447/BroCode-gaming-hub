import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { OwnerDashboard } from './pages/owner/Dashboard';
import { EmployeeDashboard } from './pages/employee/Dashboard';
import { Stations } from './pages/Stations';
import { Bookings } from './pages/Bookings';
import { Pricing } from './pages/owner/Pricing';
import { FoodMenu } from './pages/FoodMenu';
import { Employees } from './pages/owner/Employees';
import { Reports } from './pages/owner/Reports';
import { AuditLogs } from './pages/owner/AuditLogs';
import { Settings } from './pages/owner/Settings';
import { Profile } from './pages/Profile';
import { LoadingScreen } from './components/ui/Feedback';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRole?: 'OWNER' | 'EMPLOYEE';
}> = ({ children, allowedRole }) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Verifying BroCode Session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Redirect unauthorized employee to employee dashboard
    return <Navigate to={role === 'OWNER' ? '/owner/dashboard' : '/employee/dashboard'} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Initializing BroCode Gaming Cafe..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Owner Protected Routes */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute allowedRole="OWNER">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="stations" element={<Stations />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="food" element={<FoodMenu />} />
        <Route path="employees" element={<Employees />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Employee Protected Routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRole="EMPLOYEE">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="stations" element={<Stations />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="food" element={<FoodMenu />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Fallback Root Route */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to={role === 'OWNER' ? '/owner/dashboard' : '/employee/dashboard'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;
