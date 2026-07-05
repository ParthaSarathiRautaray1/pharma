import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowLeft, PackagePlus, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiErrorMessage } from '@/lib/axios';
import { formatCurrency } from '@/lib/format';
import type { Batch, LedgerEntry } from '../types';
import { useBatches, useDeleteMedicine, useLedger, useMedicine } from '../api/inventory-api';
import { AddBatchDialog } from '../components/AddBatchDialog';
import { AdjustStockDialog } from '../components/AdjustStockDialog';
import { ExpiryBadge } from '../components/ExpiryBadge';
import { MedicineFormDialog } from '../components/MedicineFormDialog';
import { StockBadge } from '../components/StockBadge';

export default function MedicineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const medicine = useMedicine(id);
  const batches = useBatches(id);
  const ledger = useLedger(id);
  const deleteMedicine = useDeleteMedicine();
  const [showEdit, setShowEdit] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const batchColumns = useMemo<ColumnDef<Batch, unknown>[]>(
    () => [
      { header: 'Batch', accessorKey: 'batchNumber' },
      { header: 'Qty', accessorKey: 'quantity' },
      { header: 'Expiry', cell: ({ row }) => <ExpiryBadge date={row.original.expiryDate} /> },
      { header: 'MRP', cell: ({ row }) => formatCurrency(Number(row.original.mrp)) },
      { header: 'Selling', cell: ({ row }) => formatCurrency(Number(row.original.sellingPrice)) },
      { header: 'Purchase', cell: ({ row }) => formatCurrency(Number(row.original.purchasePrice)) },
    ],
    [],
  );

  const ledgerColumns = useMemo<ColumnDef<LedgerEntry, unknown>[]>(
    () => [
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy, h:mm a') },
      { header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.movementType}</Badge> },
      { header: 'Batch', cell: ({ row }) => row.original.batch?.batchNumber ?? '-' },
      { header: 'Change', cell: ({ row }) => row.original.quantityChange },
      { header: 'Balance', cell: ({ row }) => row.original.balanceAfter },
      { header: 'Note', cell: ({ row }) => row.original.note ?? row.original.refType ?? '-' },
    ],
    [],
  );

  const item = medicine.data;

  return (
    <div>
      <PageHeader
        title={item?.name ?? 'Medicine'}
        description={item?.genericName ?? 'Batch-level stock and ledger'}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/app/inventory')}><ArrowLeft /> Back</Button>
            {item && <Button variant="outline" onClick={() => setShowEdit(true)}><Pencil /> Edit</Button>}
            {item && <Button variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</Button>}
          </>
        }
      />

      {item && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Sellable stock</CardTitle></CardHeader>
              <CardContent><StockBadge stock={item.stock} minStockLevel={item.minStockLevel} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Category</CardTitle></CardHeader>
              <CardContent className="text-sm">{item.category?.name ?? '-'}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Brand</CardTitle></CardHeader>
              <CardContent className="text-sm">{item.brand?.name ?? '-'}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Barcode</CardTitle></CardHeader>
              <CardContent className="text-sm">{item.barcode ?? '-'}</CardContent>
            </Card>
          </div>

          <Tabs defaultValue="batches">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="batches">Batches</TabsTrigger>
                <TabsTrigger value="ledger">Ledger</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAdjust(true)} disabled={(batches.data?.length ?? 0) === 0}>
                  <SlidersHorizontal /> Adjust
                </Button>
                <Button onClick={() => setShowBatch(true)}><PackagePlus /> Add batch</Button>
              </div>
            </div>
            <TabsContent value="batches">
              <DataTable
                columns={batchColumns}
                data={batches.data}
                loading={batches.isLoading}
                emptyMessage="No batches recorded yet"
              />
            </TabsContent>
            <TabsContent value="ledger">
              <DataTable
                columns={ledgerColumns}
                data={ledger.data}
                loading={ledger.isLoading}
                emptyMessage="No stock movements yet"
              />
            </TabsContent>
          </Tabs>

          <MedicineFormDialog open={showEdit} onOpenChange={setShowEdit} medicine={item} />
          <AddBatchDialog open={showBatch} onOpenChange={setShowBatch} medicineId={item.id} />
          <AdjustStockDialog open={showAdjust} onOpenChange={setShowAdjust} batches={batches.data ?? []} />
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete medicine?"
            description="This soft-deletes the medicine from active inventory. Existing stock history stays intact."
            confirmLabel="Delete"
            destructive
            loading={deleteMedicine.isPending}
            onConfirm={() => {
              deleteMedicine.mutate(item.id, {
                onSuccess: () => {
                  toast.success('Medicine deleted');
                  navigate('/app/inventory');
                },
                onError: (error) => toast.error(apiErrorMessage(error)),
              });
            }}
          />
        </>
      )}
    </div>
  );
}
