import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/axios';
import { formatCurrency } from '@/lib/format';
import type { PaymentMethod } from '@/features/billing/types';
import { useMedicines } from '@/features/inventory/api/inventory-api';
import { useSuppliers } from '@/features/suppliers/api/supplier-api';
import { useCreatePurchase } from '../api/purchase-api';

interface Line {
  medicineId: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstRate: number;
}

const emptyLine: Line = {
  medicineId: '',
  batchNumber: '',
  mfgDate: '',
  expiryDate: '',
  quantity: 1,
  freeQuantity: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  mrp: 0,
  gstRate: 12,
};

export function PurchaseFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const suppliers = useSuppliers({ page: 1 });
  const medicines = useMedicines({ page: 1 });
  const createPurchase = useCreatePurchase();
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  const totals = lines.reduce(
    (acc, line) => {
      const base = line.purchasePrice * line.quantity;
      const tax = base * (line.gstRate / 100);
      return { subtotal: acc.subtotal + base, tax: acc.tax + tax };
    },
    { subtotal: 0, tax: 0 },
  );
  const grandTotal = Math.max(0, totals.subtotal + totals.tax - discountAmount);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function reset() {
    setSupplierId('');
    setSupplierInvoiceNo('');
    setDiscountAmount(0);
    setPaidAmount(0);
    setPaymentMethod('UPI');
    setNotes('');
    setLines([{ ...emptyLine }]);
  }

  function submit() {
    if (!supplierId) {
      toast.error('Select a supplier');
      return;
    }
    if (lines.some((line) => !line.medicineId || !line.batchNumber || !line.expiryDate || line.quantity <= 0)) {
      toast.error('Complete all purchase lines');
      return;
    }
    createPurchase.mutate(
      {
        supplierId,
        supplierInvoiceNo: supplierInvoiceNo || undefined,
        discountAmount,
        paidAmount,
        paymentMethod: paidAmount > 0 ? paymentMethod : undefined,
        notes: notes || undefined,
        items: lines.map((line) => ({
          ...line,
          mfgDate: line.mfgDate || undefined,
        })),
      },
      {
        onSuccess: (purchase) => {
          toast.success(`Purchase ${purchase.purchaseNumber} created`);
          reset();
          onOpenChange(false);
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>New purchase</DialogTitle>
          <DialogDescription>Create an ordered purchase. Receive it later to add stock into batches.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {(suppliers.data?.rows ?? []).map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier invoice no</Label>
              <Input value={supplierInvoiceNo} onChange={(event) => setSupplierInvoiceNo(event.target.value)} />
            </div>
            <div>
              <Label>Initial payment</Label>
              <Input type="number" value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} />
            </div>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1.4fr_1fr_1fr_0.55fr_0.55fr_0.7fr_0.7fr_0.7fr_0.55fr_auto]">
                <Select value={line.medicineId} onValueChange={(value) => updateLine(index, { medicineId: value })}>
                  <SelectTrigger><SelectValue placeholder="Medicine" /></SelectTrigger>
                  <SelectContent>
                    {(medicines.data?.rows ?? []).map((medicine) => (
                      <SelectItem key={medicine.id} value={medicine.id}>{medicine.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Batch" value={line.batchNumber} onChange={(event) => updateLine(index, { batchNumber: event.target.value })} />
                <Input type="date" value={line.expiryDate} onChange={(event) => updateLine(index, { expiryDate: event.target.value })} />
                <Input type="number" min={1} value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />
                <Input type="number" min={0} value={line.freeQuantity} onChange={(event) => updateLine(index, { freeQuantity: Number(event.target.value) })} />
                <Input type="number" step="0.01" value={line.purchasePrice} onChange={(event) => updateLine(index, { purchasePrice: Number(event.target.value) })} />
                <Input type="number" step="0.01" value={line.sellingPrice} onChange={(event) => updateLine(index, { sellingPrice: Number(event.target.value) })} />
                <Input type="number" step="0.01" value={line.mrp} onChange={(event) => updateLine(index, { mrp: Number(event.target.value) })} />
                <Input type="number" step="0.01" value={line.gstRate} onChange={(event) => updateLine(index, { gstRate: Number(event.target.value) })} />
                <Button variant="outline" size="icon" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length === 1}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <Button variant="outline" onClick={() => setLines((current) => [...current, { ...emptyLine }])}>
              <Plus /> Add line
            </Button>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label>Discount</Label>
                <Input type="number" value={discountAmount} onChange={(event) => setDiscountAmount(Number(event.target.value))} />
              </div>
              <div>
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>Subtotal: {formatCurrency(totals.subtotal)}</p>
                <p>GST: {formatCurrency(totals.tax)}</p>
                <p className="font-semibold">Total: {formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={createPurchase.isPending} onClick={submit}>Create purchase</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
