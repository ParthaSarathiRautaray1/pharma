import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/axios';
import type { Batch } from '../types';
import { useAdjustStock } from '../api/inventory-api';

const reasons = ['DAMAGE', 'EXPIRY', 'THEFT', 'RECOUNT', 'OTHER'] as const;

const schema = z.object({
  batchId: z.string().min(1, 'Select a batch'),
  quantityChange: z.coerce.number().int().refine((n) => n !== 0, 'Quantity change cannot be zero'),
  reason: z.enum(reasons),
  note: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

type FormValues = z.infer<typeof schema>;

export function AdjustStockDialog({
  open,
  onOpenChange,
  batches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batches: Batch[];
}) {
  const adjust = useAdjustStock();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { batchId: '', quantityChange: 0, reason: 'RECOUNT', note: undefined },
  });

  const onSubmit = handleSubmit((values) => {
    adjust.mutate(values, {
      onSuccess: () => {
        toast.success('Stock adjusted');
        reset();
        onOpenChange(false);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>Use positive values to add stock and negative values to reduce it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Batch" error={errors.batchId?.message}>
            <Controller
              control={control}
              name="batchId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batchNumber} - {batch.quantity} available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity change" error={errors.quantityChange?.message}>
              <Input type="number" {...register('quantityChange')} />
            </Field>
            <Field label="Reason" error={errors.reason?.message}>
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {reasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <Field label="Note" error={errors.note?.message}><Textarea rows={3} {...register('note')} /></Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={adjust.isPending}>Save adjustment</Button>
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
