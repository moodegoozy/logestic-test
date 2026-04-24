import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerOrder from './pages/CustomerOrder';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DriverDashboard from './pages/DriverDashboard';
import UsersManagement from './pages/UsersManagement';
import Revenue from './pages/Revenue';
import NotFound from './pages/NotFound';
import DriverRegister from './pages/DriverRegister';
import PendingApproval from './pages/PendingApproval';
import DriverRequestsAdmin from './pages/DriverRequestsAdmin';
import DriverProfile from './pages/DriverProfile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'Tajawal, sans-serif',
              direction: 'rtl',
            },
            duration: 3000,
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/order" replace />} />
          <Route path="/order" element={<CustomerOrder />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<DriverRegister />} />
          <Route
            path="/pending"
            element={
              <ProtectedRoute allowedRoles={['pending', 'rejected']}>
                <PendingApproval />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/revenue"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Revenue />
              </ProtectedRoute>
            }
          />
            <Route
              path="/admin/driver-requests"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DriverRequestsAdmin />
                </ProtectedRoute>
              }
            />
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/profile"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverProfile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
