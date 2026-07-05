import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ArrowLeft, FilePlus, Pencil, Trash2, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiErrorMessage } from '@/lib/axios';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { PaymentMethod, Sale } from '@/features/billing/types';
import { CustomerFormDialog } from '../components/CustomerFormDialog';
import type { OutstandingSale, Prescription } from '../types';
import {
  useAddPrescription,
  useCollectCustomerPayment,
  useCustomer,
  useCustomerHistory,
  useCustomerOutstanding,
  useDeleteCustomer,
  usePrescriptions,
} from '../api/customer-api';

function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = useCustomer(id);
  const outstanding = useCustomerOutstanding(id);
  const [historyPage, setHistoryPage] = useState(1);
  const history = useCustomerHistory(id, historyPage);
  const prescriptions = usePrescriptions(id);
  const remove = useDeleteCustomer();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saleColumns = useMemo<ColumnDef<Sale, unknown>[]>(
    () => [
      { header: 'Invoice', accessorKey: 'invoiceNumber' },
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.saleDate), 'dd MMM yyyy') },
      { header: 'Total', cell: ({ row }) => formatCurrency(amount(row.original.grandTotal)) },
      { header: 'Paid', cell: ({ row }) => formatCurrency(amount(row.original.paidAmount)) },
      { header: 'Status', accessorKey: 'paymentStatus' },
    ],
    [],
  );

  const dueColumns = useMemo<ColumnDef<OutstandingSale, unknown>[]>(
    () => [
      { header: 'Invoice', accessorKey: 'invoiceNumber' },
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.saleDate), 'dd MMM yyyy') },
      {
        header: 'Outstanding',
        cell: ({ row }) => formatCurrency(amount(row.original.grandTotal) - amount(row.original.paidAmount)),
      },
      { header: 'Status', accessorKey: 'paymentStatus' },
    ],
    [],
  );

  const prescriptionColumns = useMemo<ColumnDef<Prescription, unknown>[]>(
    () => [
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy') },
      { header: 'Invoice', cell: ({ row }) => row.original.sale?.invoiceNumber ?? '-' },
      {
        header: 'File',
        cell: ({ row }) => (
          <a className="text-primary underline-offset-4 hover:underline" href={row.original.fileUrl} target="_blank" rel="noreferrer">
            Open
          </a>
        ),
      },
      { header: 'Note', cell: ({ row }) => row.original.note ?? '-' },
    ],
    [],
  );

  const item = customer.data;

  return (
    <div>
      <PageHeader
        title={item?.name ?? 'Customer'}
        description={item ? `${item.phone}${item.email ? ` / ${item.email}` : ''}` : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/app/customers')}><ArrowLeft /> Back</Button>
            {item && <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>}
            {item && <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 /> Delete</Button>}
          </>
        }
      />

      {item && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Stat title="Outstanding" value={formatCurrency(amount(outstanding.data?.totalOutstanding))} />
            <Stat title="Loyalty" value={formatNumber(item.loyaltyPoints)} />
            <Stat title="Sales" value={formatNumber(item._count?.sales ?? 0)} />
            <Stat title="Prescriptions" value={formatNumber(item._count?.prescriptions ?? 0)} />
          </div>

          <Tabs defaultValue="history">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button variant="outline" disabled={amount(outstanding.data?.totalOutstanding) <= 0} onClick={() => setPaymentOpen(true)}>
                  <Wallet /> Collect due
                </Button>
                <Button onClick={() => setPrescriptionOpen(true)}><FilePlus /> Add prescription</Button>
              </div>
            </div>

            <TabsContent value="history">
              <DataTable
                columns={saleColumns}
                data={history.data?.rows}
                loading={history.isLoading}
                meta={history.data?.meta}
                onPageChange={setHistoryPage}
                emptyMessage="No purchase history yet"
              />
            </TabsContent>
            <TabsContent value="outstanding">
              <DataTable
                columns={dueColumns}
                data={outstanding.data?.sales}
                loading={outstanding.isLoading}
                emptyMessage="No outstanding invoices"
              />
            </TabsContent>
            <TabsContent value="prescriptions">
              <DataTable
                columns={prescriptionColumns}
                data={prescriptions.data}
                loading={prescriptions.isLoading}
                emptyMessage="No prescriptions uploaded"
              />
            </TabsContent>
          </Tabs>

          <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={item} />
          <CollectPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} customerId={item.id} max={amount(outstanding.data?.totalOutstanding)} />
          <PrescriptionDialog open={prescriptionOpen} onOpenChange={setPrescriptionOpen} customerId={item.id} />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete customer?"
            description="This marks the customer inactive. Sales and payment history stay intact."
            confirmLabel="Delete"
            destructive
            loading={remove.isPending}
            onConfirm={() => remove.mutate(item.id, {
              onSuccess: () => {
                toast.success('Customer deleted');
                navigate('/app/customers');
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
      <CardContent><p className="text-2xl font-semibold">{value}</p></CardContent>
    </Card>
  );
}

function CollectPaymentDialog({
  open,
  onOpenChange,
  customerId,
  max,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  max: number;
}) {
  const collect = useCollectCustomerPayment(customerId);
  const [amountValue, setAmountValue] = useState(max);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect due</DialogTitle>
          <DialogDescription>Payment will be applied to oldest unpaid invoices first.</DialogDescription>
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
            <Input type="number" min={0} max={max} value={amountValue} onChange={(event) => setAmountValue(Number(event.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Reference</Label>
            <Input value={reference} onChange={(event) => setReference(event.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            loading={collect.isPending}
            onClick={() => collect.mutate(
              { amount: amountValue, method, reference: reference || undefined },
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

function PrescriptionDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
}) {
  const add = useAddPrescription(customerId);
  const [fileUrl, setFileUrl] = useState('');
  const [note, setNote] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add prescription</DialogTitle>
          <DialogDescription>Store a link to the prescription file for this customer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>File URL</Label>
            <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
          </div>
          <div>
            <Label>Note</Label>
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            loading={add.isPending}
            onClick={() => add.mutate(
              { fileUrl, note: note || undefined },
              {
                onSuccess: () => {
                  toast.success('Prescription saved');
                  setFileUrl('');
                  setNote('');
                  onOpenChange(false);
                },
                onError: (error) => toast.error(apiErrorMessage(error)),
              },
            )}
          >
            Save prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
