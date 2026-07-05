import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ComingSoon } from '@/components/common/ComingSoon';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/features/auth/components/RequireAuth';

// Route-level code splitting: marketing visitors never download the ERP.
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const MarketingHomePage = lazy(() => import('@/features/marketing/pages/HomePage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const ChangePasswordPage = lazy(() => import('@/features/settings/pages/ChangePasswordPage'));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // Public marketing site
  { path: '/', element: <Page><MarketingHomePage /></Page> },

  // Auth
  { path: '/auth/login', element: <Page><LoginPage /></Page> },
  { path: '/auth/forgot-password', element: <Page><ForgotPasswordPage /></Page> },
  { path: '/auth/reset-password', element: <Page><ResetPasswordPage /></Page> },

  // Protected ERP inside the app shell
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Page><DashboardPage /></Page> },
          // Placeholders swapped for real pages as modules land
          { path: 'billing', element: <ComingSoon title="POS Billing" /> },
          { path: 'sales', element: <ComingSoon title="Sales" /> },
          { path: 'inventory', element: <ComingSoon title="Inventory" /> },
          { path: 'purchases', element: <ComingSoon title="Purchases" /> },
          { path: 'customers', element: <ComingSoon title="Customers" /> },
          { path: 'suppliers', element: <ComingSoon title="Suppliers" /> },
          { path: 'samples', element: <ComingSoon title="Lab Samples" /> },
          { path: 'reports', element: <ComingSoon title="Reports" /> },
          { path: 'notifications', element: <ComingSoon title="Notifications" /> },
          { path: 'settings', element: <ComingSoon title="Settings" /> },
          { path: 'settings/password', element: <Page><ChangePasswordPage /></Page> },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
