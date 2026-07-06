import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatNumber } from '@/lib/format';
import { SupplierFormDialog } from '../components/SupplierFormDialog';
import type { Supplier } from '../types';
import { useSupplierReports, useSuppliers } from '../api/supplier-api';

function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const suppliers = useSuppliers({ page, search });
  const reports = useSupplierReports();

  const columns = useMemo<ColumnDef<Supplier, unknown>[]>(
    () => [
      {
        header: 'Supplier',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.phone}</p>
          </div>
        ),
      },
      { header: 'Contact', cell: ({ row }) => row.original.contactPerson ?? '-' },
      { header: 'GSTIN', cell: ({ row }) => row.original.gstin ?? '-' },
      { header: 'Purchases', cell: ({ row }) => row.original._count?.purchases ?? 0 },
      { header: 'Outstanding', cell: ({ row }) => formatCurrency(amount(row.original.outstanding)) },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Supplier profiles, purchase history, and payable balances."
        actions={<Button onClick={() => setFormOpen(true)}><Plus /> Add supplier</Button>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Stat title="Total" value={reports.data ? formatNumber(reports.data.total) : '-'} />
        <Stat title="Active" value={reports.data ? formatNumber(reports.data.active) : '-'} />
        <Stat title="With dues" value={reports.data ? formatNumber(reports.data.suppliersWithDue) : '-'} />
        <Stat title="Outstanding" value={reports.data ? formatCurrency(amount(reports.data.outstandingAmount)) : '-'} />
      </div>

      <div className="mb-4 max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by supplier, phone, contact, GSTIN"
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
        data={suppliers.data?.rows}
        loading={suppliers.isLoading}
        meta={suppliers.data?.meta}
        onPageChange={setPage}
        onRowClick={(supplier) => navigate(`/app/suppliers/${supplier.id}`)}
        emptyMessage="No suppliers found"
        emptyIcon={<Truck className="h-8 w-8" />}
      />

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} />
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
