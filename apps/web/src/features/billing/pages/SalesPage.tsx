import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { RotateCcw, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
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
import { useCollectPayment, useCreateReturn, useSale, useSales } from '../api/billing-api';
import type { PaymentMethod, PaymentStatus, Sale } from '../types';

function amount(value: string | number | undefined | null) {
  return Number(value ?? 0);
}

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string>();
  const sales = useSales({ page, paymentStatus: status === 'ALL' ? undefined : status });
  const selected = useSale(selectedId);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const columns = useMemo<ColumnDef<Sale, unknown>[]>(
    () => [
      { header: 'Invoice', accessorKey: 'invoiceNumber' },
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.saleDate), 'dd MMM yyyy') },
      { header: 'Customer', cell: ({ row }) => row.original.customer?.name ?? 'Walk-in' },
      { header: 'Items', cell: ({ row }) => row.original._count?.items ?? row.original.items?.length ?? '-' },
      { header: 'Total', cell: ({ row }) => formatCurrency(amount(row.original.grandTotal)) },
      { header: 'Paid', cell: ({ row }) => formatCurrency(amount(row.original.paidAmount)) },
      { header: 'Status', cell: ({ row }) => <PaymentBadge status={row.original.paymentStatus} /> },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Invoices, outstanding payments, and sale returns."
        actions={
          <Select value={status} onValueChange={(value) => { setStatus(value as PaymentStatus | 'ALL'); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All payments</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <DataTable
          columns={columns}
          data={sales.data?.rows}
          loading={sales.isLoading}
          meta={sales.data?.meta}
          onPageChange={setPage}
          onRowClick={(sale) => setSelectedId(sale.id)}
          emptyMessage="No sales found"
        />

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Invoice detail</CardTitle></CardHeader>
          <CardContent>
            {!selected.data && <p className="text-sm text-muted-foreground">Select a sale to inspect payments and returns.</p>}
            {selected.data && (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold">{selected.data.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {selected.data.customer?.name ?? 'Walk-in'} / {format(new Date(selected.data.saleDate), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
                <div className="space-y-2">
                  {selected.data.items?.map((item) => (
                    <div key={item.id} className="rounded-md border p-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium">{item.medicine?.name}</span>
                        <span>{formatCurrency(amount(item.total))}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x {formatCurrency(amount(item.unitPrice))} / returned {item.returnedQuantity}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <Row label="Subtotal" value={formatCurrency(amount(selected.data.subtotal))} />
                  <Row label="Discount" value={formatCurrency(amount(selected.data.discountAmount))} />
                  <Row label="GST" value={formatCurrency(amount(selected.data.taxAmount))} />
                  <Row label="Grand total" value={formatCurrency(amount(selected.data.grandTotal))} strong />
                  <Row label="Outstanding" value={formatCurrency(amount(selected.data.grandTotal) - amount(selected.data.paidAmount))} strong />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={selected.data.paymentStatus === 'PAID'}
                    onClick={() => setPaymentOpen(true)}
                  >
                    <Wallet /> Collect payment
                  </Button>
                  <Button
                    variant="outline"
                    disabled={selected.data.status === 'RETURNED'}
                    onClick={() => setReturnOpen(true)}
                  >
                    <RotateCcw /> Return items
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selected.data && (
        <>
          <CollectPaymentDialog sale={selected.data} open={paymentOpen} onOpenChange={setPaymentOpen} />
          <ReturnDialog sale={selected.data} open={returnOpen} onOpenChange={setReturnOpen} />
        </>
      )}
    </div>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const variant = status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'warning' : 'destructive';
  return <Badge variant={variant}>{status}</Badge>;
}

function CollectPaymentDialog({ sale, open, onOpenChange }: { sale: Sale; open: boolean; onOpenChange: (open: boolean) => void }) {
  const collect = useCollectPayment(sale.id);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const outstanding = Math.max(0, amount(sale.grandTotal) - amount(sale.paidAmount));
  const [payment, setPayment] = useState(outstanding);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
          <DialogDescription>{sale.invoiceNumber} has {formatCurrency(outstanding)} outstanding.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
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
            <Input type="number" value={payment} onChange={(event) => setPayment(Number(event.target.value))} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            loading={collect.isPending}
            onClick={() => collect.mutate(
              { payments: [{ method, amount: payment }] },
              {
                onSuccess: () => {
                  toast.success('Payment collected');
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

function ReturnDialog({ sale, open, onOpenChange }: { sale: Sale; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createReturn = useCreateReturn(sale.id);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const items = sale.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return items</DialogTitle>
          <DialogDescription>Returned quantities are added back to the original batch.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {items.map((item) => {
            const max = item.quantity - item.returnedQuantity;
            return (
              <div key={item.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_120px]">
                <div>
                  <p className="font-medium">{item.medicine?.name}</p>
                  <p className="text-xs text-muted-foreground">Returnable: {max}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={max}
                  value={quantities[item.id] ?? 0}
                  onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                />
              </div>
            );
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Refund method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            loading={createReturn.isPending}
            onClick={() => {
              const returnItems = Object.entries(quantities)
                .filter(([, quantity]) => quantity > 0)
                .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
              if (returnItems.length === 0) {
                toast.error('Enter at least one return quantity');
                return;
              }
              createReturn.mutate(
                { items: returnItems, refundMethod: method, reason: reason || undefined },
                {
                  onSuccess: () => {
                    toast.success('Return recorded');
                    setQuantities({});
                    setReason('');
                    onOpenChange(false);
                  },
                  onError: (error) => toast.error(apiErrorMessage(error)),
                },
              );
            }}
          >
            Record return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between font-semibold' : 'flex justify-between'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
