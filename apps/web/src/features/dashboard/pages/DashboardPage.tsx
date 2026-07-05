import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  IndianRupee,
  PackageX,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import {
  useCustomerAnalytics,
  useDashboardSummary,
  useRevenueSeries,
  useSalesPurchases,
  useTopMedicines,
} from '../api/dashboard-api';
import { ChartCard } from '../components/ChartCard';
import {
  CustomerChart,
  RevenueChart,
  SalesPurchaseChart,
  TopMedicinesChart,
} from '../components/charts';
import { StatCard } from '../components/StatCard';

const RANGES = ['7d', '30d', '90d'] as const;
type Range = (typeof RANGES)[number];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<Range>('30d');

  const summary = useDashboardSummary();
  const revenue = useRevenueSeries(range);
  const salesPurchases = useSalesPurchases(12);
  const topMedicines = useTopMedicines(8);
  const customers = useCustomerAnalytics(12);

  const s = summary.data;
  const loading = summary.isLoading;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        description={user?.pharmacyName ?? 'Platform administration'}
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total Sales" value={s ? formatCurrency(s.totalSales) : '—'} icon={IndianRupee} loading={loading} />
        <StatCard label="Today's Sales" value={s ? formatCurrency(s.todaySales) : '—'} icon={CalendarDays} loading={loading} />
        <StatCard label="Monthly Sales" value={s ? formatCurrency(s.monthlySales) : '—'} icon={TrendingUp} loading={loading} />
        <StatCard label="Total Purchases" value={s ? formatCurrency(s.totalPurchase) : '—'} icon={ShoppingBag} loading={loading} />
        <StatCard
          label="Profit"
          value={s ? formatCurrency(s.profit) : '—'}
          hint={s ? `${formatCurrency(s.monthlyProfit)} this month` : undefined}
          icon={Wallet}
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Low Stock"
          value={s ? formatNumber(s.lowStock) : '—'}
          hint="at or below reorder level"
          icon={AlertTriangle}
          tone={s && s.lowStock > 0 ? 'warning' : 'default'}
          loading={loading}
        />
        <StatCard
          label="Expired"
          value={s ? formatNumber(s.expiredMedicines) : '—'}
          hint="batches in stock"
          icon={PackageX}
          tone={s && s.expiredMedicines > 0 ? 'destructive' : 'default'}
          loading={loading}
        />
        <StatCard
          label="Near Expiry"
          value={s ? formatNumber(s.nearExpiry) : '—'}
          hint="within window"
          icon={CalendarClock}
          tone={s && s.nearExpiry > 0 ? 'warning' : 'default'}
          loading={loading}
        />
        <StatCard
          label="Pending Payments"
          value={s ? formatCurrency(s.pendingPayments.amount) : '—'}
          hint={s ? `${s.pendingPayments.count} invoice(s)` : undefined}
          icon={Wallet}
          tone={s && s.pendingPayments.amount > 0 ? 'warning' : 'default'}
          loading={loading}
        />
        <StatCard label="Active Customers" value={s ? formatNumber(s.activeCustomers) : '—'} hint="last 90 days" icon={Users} loading={loading} />
      </div>

      {/* ── Charts ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Revenue"
          loading={revenue.isLoading}
          empty={!!revenue.data && revenue.data.every((d) => d.revenue === 0)}
          action={
            <div className="flex rounded-md border p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                    range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        >
          {revenue.data && <RevenueChart data={revenue.data} />}
        </ChartCard>

        <ChartCard
          title="Sales vs Purchases (12 months)"
          loading={salesPurchases.isLoading}
          empty={!!salesPurchases.data && salesPurchases.data.every((d) => d.sales === 0 && d.purchases === 0)}
        >
          {salesPurchases.data && <SalesPurchaseChart data={salesPurchases.data} />}
        </ChartCard>

        <ChartCard
          title="Top Medicines"
          loading={topMedicines.isLoading}
          empty={!!topMedicines.data && topMedicines.data.length === 0}
        >
          {topMedicines.data && <TopMedicinesChart data={topMedicines.data} />}
        </ChartCard>

        <ChartCard
          title="Customer Growth (12 months)"
          loading={customers.isLoading}
          empty={!!customers.data && customers.data.every((d) => d.newCustomers === 0 && d.returning === 0)}
        >
          {customers.data && <CustomerChart data={customers.data} />}
        </ChartCard>
      </div>
    </div>
  );
}
