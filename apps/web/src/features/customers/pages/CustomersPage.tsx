import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatNumber } from '@/lib/format';
import { CustomerFormDialog } from '../components/CustomerFormDialog';
import type { Customer } from '../types';
import { useCustomerAnalytics, useCustomers } from '../api/customer-api';

function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const customers = useCustomers({ page, search });
  const analytics = useCustomerAnalytics();

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      {
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.phone}</p>
          </div>
        ),
      },
      { header: 'Email', cell: ({ row }) => row.original.email ?? '-' },
      { header: 'Sales', cell: ({ row }) => row.original._count?.sales ?? 0 },
      { header: 'Loyalty', cell: ({ row }) => formatNumber(row.original.loyaltyPoints) },
      { header: 'Outstanding', cell: ({ row }) => formatCurrency(amount(row.original.outstanding)) },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer profiles, outstanding balances, prescriptions, and purchase history."
        actions={<Button onClick={() => setShowForm(true)}><Plus /> Add customer</Button>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Stat title="Total" value={analytics.data ? formatNumber(analytics.data.total) : '-'} />
        <Stat title="Active" value={analytics.data ? formatNumber(analytics.data.active) : '-'} />
        <Stat title="With dues" value={analytics.data ? formatNumber(analytics.data.customersWithDue) : '-'} />
        <Stat title="Outstanding" value={analytics.data ? formatCurrency(amount(analytics.data.outstandingAmount)) : '-'} />
      </div>

      <div className="mb-4 max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers.data?.rows}
        loading={customers.isLoading}
        meta={customers.data?.meta}
        onPageChange={setPage}
        onRowClick={(customer) => navigate(`/app/customers/${customer.id}`)}
        emptyMessage="No customers found"
        emptyIcon={<Users className="h-8 w-8" />}
      />

      <CustomerFormDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-semibold">{value}</p></CardContent>
    </Card>
  );
}
