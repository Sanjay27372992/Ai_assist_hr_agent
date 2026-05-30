import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Departments from './pages/Departments';
import Designations from './pages/Designations';
import Jarvis from './pages/Jarvis';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: 10,
              fontSize: 14,
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#1e293b' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/jarvis" element={<Jarvis />} />

          {/* Protected - all authenticated users */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout><Dashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute>
              <DashboardLayout><Attendance /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/leaves" element={
            <ProtectedRoute>
              <DashboardLayout><Leaves /></DashboardLayout>
            </ProtectedRoute>
          } />

          {/* HR Admin + Manager only */}
          <Route path="/employees" element={
            <ProtectedRoute>
              <RoleRoute roles={['hr_admin', 'manager']}>
                <DashboardLayout><Employees /></DashboardLayout>
              </RoleRoute>
            </ProtectedRoute>
          } />

          {/* HR Admin only */}
          <Route path="/departments" element={
            <ProtectedRoute>
              <RoleRoute roles={['hr_admin']}>
                <DashboardLayout><Departments /></DashboardLayout>
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/designations" element={
            <ProtectedRoute>
              <RoleRoute roles={['hr_admin']}>
                <DashboardLayout><Designations /></DashboardLayout>
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute>
              <RoleRoute roles={['hr_admin', 'employee']}>
                <DashboardLayout><Payroll /></DashboardLayout>
              </RoleRoute>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
