import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, formatNumber } from '@/lib/format';
import type { CustomerPoint, RevenuePoint, SalesPurchasePoint, TopMedicine } from '../types';

const AXIS = { fontSize: 12, fill: 'var(--color-muted-foreground)' };
const GRID = 'var(--color-border)';

/** Shared themed tooltip. */
function ChartTooltip({
  active,
  payload,
  label,
  currency = true,
}: TooltipProps<number, string> & { currency?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {currency ? formatCurrency(Number(entry.value)) : formatNumber(Number(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

const monthLabel = (m: string) => format(parseISO(`${m}-01`), 'MMM');
const dayLabel = (d: string) => format(parseISO(d), 'd MMM');

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={formatCurrencyCompact} tick={AXIS} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={<ChartTooltip />} labelFormatter={(l) => dayLabel(String(l))} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#revFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SalesPurchaseChart({ data }: { data: SalesPurchasePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={formatCurrencyCompact} tick={AXIS} tickLine={false} axisLine={false} width={56} />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          labelFormatter={(l) => monthLabel(String(l))}
        />
        <Bar dataKey="sales" name="Sales" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="purchases" name="Purchases" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const BAR_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

export function TopMedicinesChart({ data }: { data: TopMedicine[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip
          content={<ChartTooltip currency={false} />}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
        />
        <Bar dataKey="quantity" name="Units sold" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CustomerChart({ data }: { data: CustomerPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip
          content={<ChartTooltip currency={false} />}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          labelFormatter={(l) => monthLabel(String(l))}
        />
        <Bar dataKey="newCustomers" name="New" stackId="c" fill="var(--color-chart-1)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="returning" name="Returning" stackId="c" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
