import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'destructive';

const TONE: Record<Tone, { icon: string; ring: string }> = {
  default: { icon: 'bg-primary/10 text-primary', ring: '' },
  success: { icon: 'bg-success/15 text-success', ring: '' },
  warning: { icon: 'bg-warning/15 text-warning', ring: 'ring-1 ring-warning/30' },
  destructive: { icon: 'bg-destructive/15 text-destructive', ring: 'ring-1 ring-destructive/30' },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  loading?: boolean;
}) {
  const t = TONE[tone];
  return (
    <Card className={cn('p-4', t.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          )}
          {hint && !loading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', t.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}
