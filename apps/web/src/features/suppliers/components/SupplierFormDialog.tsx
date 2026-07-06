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
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/axios';
import { useSaveSupplier } from '../api/supplier-api';
import type { Supplier } from '../types';

const optionalText = z.string().trim().optional().transform((value) => (value ? value : undefined));

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  contactPerson: optionalText,
  phone: z.string().trim().min(5, 'Phone is required'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')).transform((value) => value || undefined),
  gstin: optionalText,
  address: optionalText,
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: '',
  contactPerson: undefined,
  phone: '',
  email: undefined,
  gstin: undefined,
  address: undefined,
};

function valuesFromSupplier(supplier?: Supplier): FormValues {
  if (!supplier) return emptyValues;
  return {
    name: supplier.name,
    contactPerson: supplier.contactPerson ?? undefined,
    phone: supplier.phone,
    email: supplier.email ?? undefined,
    gstin: supplier.gstin ?? undefined,
    address: supplier.address ?? undefined,
  };
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}) {
  const save = useSaveSupplier(supplier?.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: valuesFromSupplier(supplier),
  });

  const onSubmit = handleSubmit((values) => {
    save.mutate(values, {
      onSuccess: () => {
        toast.success(supplier ? 'Supplier updated' : 'Supplier created');
        reset(emptyValues);
        onOpenChange(false);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
          <DialogDescription>Supplier records connect purchases, invoices, and payment dues.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}><Input {...register('name')} /></Field>
            <Field label="Contact person" error={errors.contactPerson?.message}><Input {...register('contactPerson')} /></Field>
            <Field label="Phone" error={errors.phone?.message}><Input {...register('phone')} /></Field>
            <Field label="Email" error={errors.email?.message}><Input type="email" {...register('email')} /></Field>
            <Field label="GSTIN" error={errors.gstin?.message}><Input {...register('gstin')} /></Field>
          </div>
          <Field label="Address" error={errors.address?.message}><Textarea rows={3} {...register('address')} /></Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{supplier ? 'Save changes' : 'Create supplier'}</Button>
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
