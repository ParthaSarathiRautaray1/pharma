import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/features/auth/components/RequireAuth';

// Route-level code splitting: marketing visitors never download the ERP.
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));

// Placeholders replaced by their modules (marketing → M13, dashboard → M6/M7)
const MarketingHomePage = lazy(() => import('@/features/marketing/pages/HomePage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
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

  // Protected ERP
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      { index: true, element: <Page><DashboardPage /></Page> },
      // Feature routes are appended here module by module
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
