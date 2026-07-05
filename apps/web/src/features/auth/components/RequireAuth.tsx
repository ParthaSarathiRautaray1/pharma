import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import type { UserRole } from '@/types/api';

/**
 * Route guard. Wrap protected route trees:
 *   <Route element={<RequireAuth />}> ... </Route>
 *   <Route element={<RequireAuth roles={['OWNER', 'SUPER_ADMIN']} />}> ... </Route>
 * UI-level only — the API enforces the same rules authoritatively.
 */
export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}
