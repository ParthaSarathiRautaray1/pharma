import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/stores/auth-store';

/** Placeholder — replaced by the analytics dashboard in Module 7. */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">
        Welcome, {user?.name} <span className="text-muted-foreground">({user?.role})</span>
      </h1>
      <p className="text-muted-foreground">{user?.pharmacyName ?? 'Platform administration'}</p>
      <Button
        variant="outline"
        loading={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onSettled: () => {
              toast.success('Signed out');
              navigate('/auth/login', { replace: true });
            },
          })
        }
      >
        Sign out
      </Button>
    </main>
  );
}
