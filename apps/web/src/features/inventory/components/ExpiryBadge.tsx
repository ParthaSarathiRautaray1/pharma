import { differenceInDays } from 'date-fns';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

/** Expiry date with color: red = expired, amber = within 90 days. */
export function ExpiryBadge({ date }: { date: string }) {
  const d = new Date(date);
  const days = differenceInDays(d, new Date());
  const variant = days < 0 ? 'destructive' : days <= 90 ? 'warning' : 'secondary';
  const label = format(d, 'MMM yyyy');
  return (
    <Badge variant={variant}>
      {label}
      {days < 0 ? ' · expired' : days <= 90 ? ` · ${days}d` : ''}
    </Badge>
  );
}
