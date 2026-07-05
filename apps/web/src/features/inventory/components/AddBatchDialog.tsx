import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { apiErrorMessage } from '@/lib/axios';
import { useCreateBatch } from '../api/inventory-api';

const schema = z.object({
  batchNumber: z.string().trim().min(1, 'Batch number is required'),
  mfgDate: z.string().optional(),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  purchasePrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  mrp: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().min(0),
}).refine((v) => v.sellingPrice <= v.mrp, {
  path: ['sellingPrice'],
  message: 'Selling price cannot exceed MRP',
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  batchNumber: '',
  mfgDate: '',
  expiryDate: '',
  purchasePrice: 0,
  sellingPrice: 0,
  mrp: 0,
  quantity: 0,
};

export function AddBatchDialog({
  open,
  onOpenChange,
  medicineId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicineId: string;
}) {
  const createBatch = useCreateBatch();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const onSubmit = handleSubmit((values) => {
    createBatch.mutate(
      { ...values, medicineId, mfgDate: values.mfgDate || undefined },
      {
        onSuccess: () => {
          toast.success('Batch added');
          reset(defaultValues);
          onOpenChange(false);
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add batch</DialogTitle>
          <DialogDescription>Opening stock is recorded into the batch inventory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Batch number" error={errors.batchNumber?.message}><Input {...register('batchNumber')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="MFG date" error={errors.mfgDate?.message}><Input type="date" {...register('mfgDate')} /></Field>
            <Field label="Expiry date" error={errors.expiryDate?.message}><Input type="date" {...register('expiryDate')} /></Field>
            <Field label="Purchase price" error={errors.purchasePrice?.message}><Input type="number" step="0.01" {...register('purchasePrice')} /></Field>
            <Field label="Selling price" error={errors.sellingPrice?.message}><Input type="number" step="0.01" {...register('sellingPrice')} /></Field>
            <Field label="MRP" error={errors.mrp?.message}><Input type="number" step="0.01" {...register('mrp')} /></Field>
            <Field label="Opening quantity" error={errors.quantity?.message}><Input type="number" min={0} {...register('quantity')} /></Field>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={createBatch.isPending}>Add batch</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
