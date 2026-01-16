/**
 * Application Routes Configuration
 *
 * Defines all application routes with protected route wrappers.
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RootLayout, MainLayout } from '../components/layouts';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import {
  PatientsPage,
  NewPatientPage,
  EditPatientPage,
  PatientDetailPage,
} from '../pages/patients';
import {
  AppointmentsPage,
  NewAppointmentPage,
  EditAppointmentPage,
  AppointmentDetailPage,
} from '../pages/appointments';
import {
  VisitsPage,
  NewVisitPage,
  EditVisitPage,
  VisitDetailPage,
  VisitTemplatesPage,
  PrescriptionTemplatesPage,
} from '../pages/visits';
import {
  PrescriptionsPage,
  PrescriptionDetailPage,
  NewPrescriptionPage,
  EditPrescriptionPage,
} from '../pages/prescriptions';
import { PatientVisitsPage } from '../pages/patients/PatientVisitsPage';
import { DocumentTemplatesPage } from '../components/documents';
import { DocumentsPage } from '../pages/documents/DocumentsPage';
import { ReportsPage } from '../pages/reports';
import {
  UsersPage,
  NewUserPage,
  EditUserPage,
  UserDetailPage,
} from '../pages/users';
import { SettingsPage } from '../pages/settings';
import { AuditLogsPage } from '../pages/audit';
import { SystemHealthPage } from '../pages/system';
import { ProfilePage } from '../pages/ProfilePage';
import { NotificationsPage } from '../pages/notifications';

/**
 * Application router configuration
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes (no layout)
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
      // Protected routes (with MainLayout)
      {
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          // Patient routes
          {
            path: '/patients',
            element: <PatientsPage />,
          },
          {
            path: '/patients/new',
            element: <NewPatientPage />,
          },
          {
            path: '/patients/:id',
            element: <PatientDetailPage />,
          },
          {
            path: '/patients/:id/edit',
            element: <EditPatientPage />,
          },
          {
            path: '/patients/:id/visits',
            element: <PatientVisitsPage />,
          },
          // Appointment routes
          {
            path: '/appointments',
            element: <AppointmentsPage />,
          },
          {
            path: '/appointments/new',
            element: <NewAppointmentPage />,
          },
          {
            path: '/appointments/:id',
            element: <AppointmentDetailPage />,
          },
          {
            path: '/appointments/:id/edit',
            element: <EditAppointmentPage />,
          },
          // Visit routes
          {
            path: '/visits',
            element: <VisitsPage />,
          },
          {
            path: '/visits/new',
            element: <NewVisitPage />,
          },
          {
            path: '/visits/:id',
            element: <VisitDetailPage />,
          },
          {
            path: '/visits/:id/edit',
            element: <EditVisitPage />,
          },
          {
            path: '/visits/templates',
            element: <VisitTemplatesPage />,
          },
          // Prescription routes
          {
            path: '/prescriptions',
            element: <PrescriptionsPage />,
          },
          {
            path: '/prescriptions/new',
            element: <NewPrescriptionPage />,
          },
          {
            path: '/prescriptions/templates',
            element: <PrescriptionTemplatesPage />,
          },
          {
            path: '/prescriptions/:id',
            element: <PrescriptionDetailPage />,
          },
          {
            path: '/prescriptions/:id/edit',
            element: <EditPrescriptionPage />,
          },
          {
            path: '/documents',
            element: <DocumentsPage />,
          },
          // Document templates (Admin only)
          {
            path: '/document-templates',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <DocumentTemplatesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/reports',
            element: <ReportsPage />,
          },
          // Notifications (Admin and Doctor)
          {
            path: '/notifications',
            element: <NotificationsPage />,
          },
          // User management routes (Admin only)
          {
            path: '/users',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <UsersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/users/new',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <NewUserPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/users/:id',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <UserDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/users/:id/edit',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <EditUserPage />
              </ProtectedRoute>
            ),
          },
          // Settings (Admin only)
          {
            path: '/settings',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <SettingsPage />
              </ProtectedRoute>
            ),
          },
          // Audit Logs (Admin only)
          {
            path: '/audit-logs',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <AuditLogsPage />
              </ProtectedRoute>
            ),
          },
          // System Health (Admin only)
          {
            path: '/system-health',
            element: (
              <ProtectedRoute requiredRole="ADMIN">
                <SystemHealthPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/help',
            element: <div>Help page - Coming soon</div>,
          },
        ],
      },
      // Redirect any unknown routes to dashboard
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
