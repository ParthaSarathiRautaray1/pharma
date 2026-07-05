import { Minus, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useMedicines } from '@/features/inventory/api/inventory-api';
import type { Medicine } from '@/features/inventory/types';
import { useCustomers } from '@/features/customers/api/customer-api';
import type { Customer } from '@/features/customers/types';
import { fetchMedicine, useCreateSale } from '../api/billing-api';
import type { CartLine, DiscountType, PaymentMethod } from '../types';

function n(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>();
  const [discountType, setDiscountType] = useState<DiscountType | 'NONE'>('NONE');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const medicines = useMedicines({ page: 1, search });
  const customers = useCustomers({ page: 1, search: customerSearch });
  const createSale = useCreateSale();

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const discount =
      discountType === 'PERCENTAGE'
        ? subtotal * (discountValue / 100)
        : discountType === 'FLAT'
          ? Math.min(discountValue, subtotal)
          : 0;
    const tax = cart.reduce((sum, line) => {
      const base = line.unitPrice * line.quantity;
      const share = subtotal > 0 ? base / subtotal : 0;
      return sum + (base - discount * share) * (n(line.medicine.gstRate) / 100);
    }, 0);
    const total = Math.max(0, subtotal - discount + tax);
    return { subtotal, discount, tax, total, due: Math.max(0, total - paidAmount) };
  }, [cart, discountType, discountValue, paidAmount]);

  async function addMedicine(medicine: Medicine) {
    try {
      const detail = await fetchMedicine(medicine.id);
      const batch = detail.batches.find((b) => b.quantity > 0 && new Date(b.expiryDate) > new Date());
      if (!batch) {
        toast.error('No sellable batch is available for this medicine');
        return;
      }
      setCart((current) => {
        const existing = current.find((line) => line.batch.id === batch.id);
        if (existing) {
          return current.map((line) =>
            line.id === existing.id
              ? { ...line, quantity: Math.min(line.quantity + 1, batch.quantity) }
              : line,
          );
        }
        return [
          ...current,
          {
            id: `${medicine.id}-${batch.id}`,
            medicine: detail,
            batch,
            quantity: 1,
            unitPrice: n(batch.sellingPrice),
          },
        ];
      });
      setSearch('');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function updateQuantity(id: string, quantity: number) {
    setCart((current) =>
      current.map((line) =>
        line.id === id ? { ...line, quantity: Math.max(1, Math.min(quantity, line.batch.quantity)) } : line,
      ),
    );
  }

  function updateBatch(lineId: string, batchId: string) {
    setCart((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;
        const batch = line.medicine.batches.find((b) => b.id === batchId);
        if (!batch) return line;
        return {
          ...line,
          id: `${line.medicine.id}-${batch.id}`,
          batch,
          quantity: Math.min(line.quantity, batch.quantity),
          unitPrice: n(batch.sellingPrice),
        };
      }),
    );
  }

  function checkout() {
    if (cart.length === 0) {
      toast.error('Add at least one medicine');
      return;
    }
    createSale.mutate(
      {
        items: cart.map((line) => ({
          medicineId: line.medicine.id,
          batchId: line.batch.id,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        customerId: selectedCustomer?.id,
        discountType: discountType === 'NONE' ? undefined : discountType,
        discountValue: discountType === 'NONE' ? 0 : discountValue,
        payments: paidAmount > 0 ? [{ method: paymentMethod, amount: paidAmount }] : [],
        notes: notes || undefined,
      },
      {
        onSuccess: (sale) => {
          toast.success(`Invoice ${sale.invoiceNumber} created`);
          setCart([]);
          setDiscountType('NONE');
          setSelectedCustomer(undefined);
          setCustomerSearch('');
          setDiscountValue(0);
          setPaidAmount(0);
          setNotes('');
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    );
  }

  return (
    <div>
      <PageHeader title="POS Billing" description="Fast checkout with batch-aware stock deduction and split-ready payments." />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search medicine by name, generic name, or barcode"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              {search && (
                <div className="mt-3 divide-y rounded-md border">
                  {(medicines.data?.rows ?? []).slice(0, 8).map((medicine) => (
                    <button
                      key={medicine.id}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => void addMedicine(medicine)}
                    >
                      <span>
                        <span className="block font-medium">{medicine.name}</span>
                        <span className="text-xs text-muted-foreground">{medicine.genericName ?? medicine.unit}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{medicine.stock} in stock</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cart</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 && (
                <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                  <ReceiptText className="mb-2 h-8 w-8" />
                  <p className="text-sm">Search and add medicines to start billing</p>
                </div>
              )}
              {cart.map((line) => (
                <div key={line.id} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.2fr_0.8fr_0.5fr_0.45fr_auto]">
                  <div>
                    <p className="font-medium">{line.medicine.name}</p>
                    <p className="text-xs text-muted-foreground">{line.medicine.genericName ?? line.medicine.unit}</p>
                  </div>
                  <Select value={line.batch.id} onValueChange={(value) => updateBatch(line.id, value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {line.medicine.batches
                        .filter((batch) => batch.quantity > 0 && new Date(batch.expiryDate) > new Date())
                        .map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.batchNumber} - {batch.quantity} left
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center rounded-md border">
                    <Button variant="ghost" size="icon" onClick={() => updateQuantity(line.id, line.quantity - 1)}>
                      <Minus />
                    </Button>
                    <Input
                      className="border-0 text-center shadow-none"
                      type="number"
                      value={line.quantity}
                      onChange={(event) => updateQuantity(line.id, Number(event.target.value))}
                    />
                    <Button variant="ghost" size="icon" onClick={() => updateQuantity(line.id, line.quantity + 1)}>
                      <Plus />
                    </Button>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(event) =>
                      setCart((current) =>
                        current.map((row) => row.id === line.id ? { ...row, unitPrice: Number(event.target.value) } : row),
                      )
                    }
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCart((current) => current.filter((row) => row.id !== line.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer</Label>
              <Input
                placeholder={selectedCustomer ? `${selectedCustomer.name} / ${selectedCustomer.phone}` : 'Search customer or leave walk-in'}
                value={customerSearch}
                onChange={(event) => {
                  setCustomerSearch(event.target.value);
                  if (selectedCustomer) setSelectedCustomer(undefined);
                }}
              />
              {customerSearch && !selectedCustomer && (
                <div className="mt-2 divide-y rounded-md border">
                  {(customers.data?.rows ?? []).slice(0, 5).map((customer) => (
                    <button
                      key={customer.id}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch('');
                      }}
                    >
                      <span className="block font-medium">{customer.name}</span>
                      <span className="text-xs text-muted-foreground">{customer.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <Button className="mt-2" variant="outline" size="sm" onClick={() => setSelectedCustomer(undefined)}>
                  Clear customer
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Discount</Label>
                <Select value={discountType} onValueChange={(value) => setDiscountType(value as DiscountType | 'NONE')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FLAT">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input type="number" min={0} value={discountValue} onChange={(event) => setDiscountValue(Number(event.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Method</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Paid</Label>
                <Input type="number" min={0} value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
              <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
              <Row label="Discount" value={formatCurrency(totals.discount)} />
              <Row label="GST" value={formatCurrency(totals.tax)} />
              <Row label="Total" value={formatCurrency(totals.total)} strong />
              <Row label="Due" value={formatCurrency(totals.due)} strong />
            </div>
            <Button className="w-full" size="lg" loading={createSale.isPending} onClick={checkout}>
              Create invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between text-base font-semibold' : 'flex justify-between'}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
