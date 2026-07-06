import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiErrorMessage } from '@/lib/axios';
import { formatCurrency, formatNumber } from '@/lib/format';
import { usePurchases } from '@/features/purchases/api/purchase-api';
import type { Purchase } from '@/features/purchases/types';
import { SupplierFormDialog } from '../components/SupplierFormDialog';
import { useDeleteSupplier, useSupplier, useSupplierOutstanding } from '../api/supplier-api';

function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const supplier = useSupplier(id);
  const outstanding = useSupplierOutstanding(id);
  const purchases = usePurchases({ page: 1, supplierId: id });
  const remove = useDeleteSupplier();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const columns = useMemo<ColumnDef<Purchase, unknown>[]>(
    () => [
      { header: 'PO', accessorKey: 'purchaseNumber' },
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.orderDate), 'dd MMM yyyy') },
      { header: 'Status', accessorKey: 'status' },
      { header: 'Payment', accessorKey: 'paymentStatus' },
      { header: 'Total', cell: ({ row }) => formatCurrency(amount(row.original.grandTotal)) },
      { header: 'Paid', cell: ({ row }) => formatCurrency(amount(row.original.paidAmount)) },
    ],
    [],
  );

  const item = supplier.data;

  return (
    <div>
      <PageHeader
        title={item?.name ?? 'Supplier'}
        description={item ? `${item.phone}${item.gstin ? ` / ${item.gstin}` : ''}` : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/app/suppliers')}><ArrowLeft /> Back</Button>
            {item && <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>}
            {item && <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 /> Delete</Button>}
          </>
        }
      />

      {item && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Stat title="Outstanding" value={formatCurrency(amount(outstanding.data?.totalOutstanding))} />
            <Stat title="Purchases" value={formatNumber(item._count?.purchases ?? 0)} />
            <Stat title="Contact" value={item.contactPerson ?? '-'} />
          </div>
          <DataTable
            columns={columns}
            data={purchases.data?.rows}
            loading={purchases.isLoading}
            meta={purchases.data?.meta}
            onPageChange={() => undefined}
            onRowClick={(purchase) => navigate(`/app/purchases/${purchase.id}`)}
            emptyMessage="No purchases for this supplier"
          />

          <SupplierFormDialog open={editOpen} onOpenChange={setEditOpen} supplier={item} />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete supplier?"
            description="This marks the supplier inactive. Purchase history stays intact."
            confirmLabel="Delete"
            destructive
            loading={remove.isPending}
            onConfirm={() => remove.mutate(item.id, {
              onSuccess: () => {
                toast.success('Supplier deleted');
                navigate('/app/suppliers');
              },
              onError: (error) => toast.error(apiErrorMessage(error)),
            })}
          />
        </>
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-lg font-semibold">{value}</p></CardContent>
    </Card>
  );
}
