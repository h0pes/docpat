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
          {
            path: '/visits',
            element: <div>Visits page - Coming soon</div>,
          },
          {
            path: '/prescriptions',
            element: <div>Prescriptions page - Coming soon</div>,
          },
          {
            path: '/documents',
            element: <div>Documents page - Coming soon</div>,
          },
          {
            path: '/reports',
            element: <div>Reports page - Coming soon</div>,
          },
          {
            path: '/settings',
            element: <div>Settings page - Coming soon</div>,
          },
          {
            path: '/profile',
            element: <div>Profile page - Coming soon</div>,
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
