import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowLeft, PackageCheck, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiErrorMessage } from '@/lib/axios';
import { formatCurrency } from '@/lib/format';
import type { PaymentMethod } from '@/features/billing/types';
import type { PurchaseItem } from '../types';
import { useCollectPurchasePayment, usePurchase, useReceivePurchase } from '../api/purchase-api';

function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const purchase = usePurchase(id);
  const receive = useReceivePurchase(id);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const columns = useMemo<ColumnDef<PurchaseItem, unknown>[]>(
    () => [
      { header: 'Medicine', cell: ({ row }) => row.original.medicine?.name ?? row.original.medicineId },
      { header: 'Batch', accessorKey: 'batchNumber' },
      { header: 'Qty', cell: ({ row }) => `${row.original.quantity} + ${row.original.freeQuantity}` },
      { header: 'Expiry', cell: ({ row }) => format(new Date(row.original.expiryDate), 'dd MMM yyyy') },
      { header: 'Cost', cell: ({ row }) => formatCurrency(amount(row.original.purchasePrice)) },
      { header: 'GST', cell: ({ row }) => `${amount(row.original.gstRate).toFixed(2)}%` },
      { header: 'Total', cell: ({ row }) => formatCurrency(amount(row.original.total)) },
    ],
    [],
  );

  const item = purchase.data;
  const outstanding = item ? Math.max(0, amount(item.grandTotal) - amount(item.paidAmount)) : 0;

  return (
    <div>
      <PageHeader
        title={item?.purchaseNumber ?? 'Purchase'}
        description={item ? `${item.supplier?.name ?? 'Supplier'} / ${item.status}` : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/app/purchases')}><ArrowLeft /> Back</Button>
            {item && item.status === 'ORDERED' && (
              <Button
                variant="outline"
                loading={receive.isPending}
                onClick={() => receive.mutate(undefined, {
                  onSuccess: () => toast.success('Purchase received into inventory'),
                  onError: (error) => toast.error(apiErrorMessage(error)),
                })}
              >
                <PackageCheck /> Receive
              </Button>
            )}
            {item && item.paymentStatus !== 'PAID' && (
              <Button onClick={() => setPaymentOpen(true)}><Wallet /> Pay supplier</Button>
            )}
          </>
        }
      />

      {item && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Stat title="Grand total" value={formatCurrency(amount(item.grandTotal))} />
            <Stat title="Paid" value={formatCurrency(amount(item.paidAmount))} />
            <Stat title="Outstanding" value={formatCurrency(outstanding)} />
            <Stat title="Supplier invoice" value={item.supplierInvoiceNo ?? '-'} />
          </div>
          <DataTable columns={columns} data={item.items} emptyMessage="No purchase items" />
          <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} purchaseId={item.id} max={outstanding} />
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

function PaymentDialog({ open, onOpenChange, purchaseId, max }: { open: boolean; onOpenChange: (open: boolean) => void; purchaseId: string; max: number }) {
  const pay = useCollectPurchasePayment(purchaseId);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [value, setValue] = useState(max);
  const [reference, setReference] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay supplier</DialogTitle>
          <DialogDescription>Outstanding balance is {formatCurrency(max)}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Reference</Label>
            <Input value={reference} onChange={(event) => setReference(event.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            loading={pay.isPending}
            onClick={() => pay.mutate(
              { amount: value, method, reference: reference || undefined },
              {
                onSuccess: () => {
                  toast.success('Supplier payment recorded');
                  onOpenChange(false);
                },
                onError: (error) => toast.error(apiErrorMessage(error)),
              },
            )}
          >
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
