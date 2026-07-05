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
import { useSaveCustomer } from '../api/customer-api';
import type { Customer } from '../types';

const optionalText = z.string().trim().optional().transform((value) => (value ? value : undefined));

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(5, 'Phone is required'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')).transform((value) => value || undefined),
  gender: optionalText,
  dateOfBirth: optionalText,
  address: optionalText,
  notes: optionalText,
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: '',
  phone: '',
  email: undefined,
  gender: undefined,
  dateOfBirth: undefined,
  address: undefined,
  notes: undefined,
};

function valuesFromCustomer(customer?: Customer): FormValues {
  if (!customer) return emptyValues;
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? undefined,
    gender: customer.gender ?? undefined,
    dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : undefined,
    address: customer.address ?? undefined,
    notes: customer.notes ?? undefined,
  };
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}) {
  const save = useSaveCustomer(customer?.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: valuesFromCustomer(customer),
  });

  const onSubmit = handleSubmit((values) => {
    save.mutate(values, {
      onSuccess: () => {
        toast.success(customer ? 'Customer updated' : 'Customer created');
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
          <DialogTitle>{customer ? 'Edit customer' : 'Add customer'}</DialogTitle>
          <DialogDescription>Keep contact, loyalty, and prescription records tied to invoices.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}><Input {...register('name')} /></Field>
            <Field label="Phone" error={errors.phone?.message}><Input {...register('phone')} /></Field>
            <Field label="Email" error={errors.email?.message}><Input type="email" {...register('email')} /></Field>
            <Field label="Gender" error={errors.gender?.message}><Input {...register('gender')} /></Field>
            <Field label="Date of birth" error={errors.dateOfBirth?.message}><Input type="date" {...register('dateOfBirth')} /></Field>
          </div>
          <Field label="Address" error={errors.address?.message}><Textarea rows={2} {...register('address')} /></Field>
          <Field label="Notes" error={errors.notes?.message}><Textarea rows={3} {...register('notes')} /></Field>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{customer ? 'Save changes' : 'Create customer'}</Button>
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
