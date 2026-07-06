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
const POSPage = lazy(() => import('@/features/billing/pages/POSPage'));
const SalesPage = lazy(() => import('@/features/billing/pages/SalesPage'));
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/features/customers/pages/CustomerDetailPage'));
const InventoryPage = lazy(() => import('@/features/inventory/pages/InventoryPage'));
const MedicineDetailPage = lazy(() => import('@/features/inventory/pages/MedicineDetailPage'));
const StockAlertsPage = lazy(() => import('@/features/inventory/pages/StockAlertsPage'));
const CatalogPage = lazy(() => import('@/features/inventory/pages/CatalogPage'));
const PurchasesPage = lazy(() => import('@/features/purchases/pages/PurchasesPage'));
const PurchaseDetailPage = lazy(() => import('@/features/purchases/pages/PurchaseDetailPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const SuppliersPage = lazy(() => import('@/features/suppliers/pages/SuppliersPage'));
const SupplierDetailPage = lazy(() => import('@/features/suppliers/pages/SupplierDetailPage'));
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
          { path: 'billing', element: <Page><POSPage /></Page> },
          { path: 'sales', element: <Page><SalesPage /></Page> },
          { path: 'inventory', element: <Page><InventoryPage /></Page> },
          { path: 'inventory/alerts', element: <Page><StockAlertsPage /></Page> },
          { path: 'inventory/catalog', element: <Page><CatalogPage /></Page> },
          { path: 'inventory/:id', element: <Page><MedicineDetailPage /></Page> },
          { path: 'purchases', element: <Page><PurchasesPage /></Page> },
          { path: 'purchases/:id', element: <Page><PurchaseDetailPage /></Page> },
          { path: 'customers', element: <Page><CustomersPage /></Page> },
          { path: 'customers/:id', element: <Page><CustomerDetailPage /></Page> },
          { path: 'suppliers', element: <Page><SuppliersPage /></Page> },
          { path: 'suppliers/:id', element: <Page><SupplierDetailPage /></Page> },
          { path: 'samples', element: <ComingSoon title="Lab Samples" /> },
          { path: 'reports', element: <Page><ReportsPage /></Page> },
          { path: 'notifications', element: <Page><NotificationsPage /></Page> },
          { path: 'settings', element: <ComingSoon title="Settings" /> },
          { path: 'settings/password', element: <Page><ChangePasswordPage /></Page> },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
