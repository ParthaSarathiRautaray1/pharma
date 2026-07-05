import { PageHeader } from '@/components/common/PageHeader';
import { useAuthStore } from '@/stores/auth-store';

/** Placeholder — replaced by the analytics dashboard in Module 7. */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        description={user?.pharmacyName ?? 'Platform administration'}
      />
      <div className="rounded-xl border border-dashed py-24 text-center text-sm text-muted-foreground">
        Analytics dashboard arrives in Module 7.
      </div>
    </div>
  );
}
