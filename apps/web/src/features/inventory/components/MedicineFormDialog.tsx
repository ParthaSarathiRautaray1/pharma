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
import type { Medicine } from '../types';
import { useBrands, useCategories, useSaveMedicine } from '../api/inventory-api';

const optionalText = z.string().trim().optional().transform((v) => (v ? v : undefined));

const schema = z.object({
  name: z.string().trim().min(1, 'Medicine name is required'),
  genericName: optionalText,
  categoryId: optionalText,
  brandId: optionalText,
  unit: z.string().trim().min(1, 'Unit is required').max(30),
  packSize: optionalText,
  hsnCode: optionalText,
  gstRate: z.coerce.number().min(0).max(100),
  barcode: optionalText,
  rackNumber: optionalText,
  minStockLevel: z.coerce.number().int().min(0),
  requiresPrescription: z.coerce.boolean(),
  description: optionalText,
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  name: '',
  genericName: undefined,
  categoryId: undefined,
  brandId: undefined,
  unit: 'STRIP',
  packSize: undefined,
  hsnCode: undefined,
  gstRate: 12,
  barcode: undefined,
  rackNumber: undefined,
  minStockLevel: 10,
  requiresPrescription: false,
  description: undefined,
};

function valuesFromMedicine(medicine?: Medicine): FormValues {
  if (!medicine) return defaultValues;
  return {
    name: medicine.name,
    genericName: medicine.genericName ?? undefined,
    categoryId: medicine.categoryId ?? undefined,
    brandId: medicine.brandId ?? undefined,
    unit: medicine.unit,
    packSize: medicine.packSize ?? undefined,
    hsnCode: medicine.hsnCode ?? undefined,
    gstRate: Number(medicine.gstRate),
    barcode: medicine.barcode ?? undefined,
    rackNumber: medicine.rackNumber ?? undefined,
    minStockLevel: medicine.minStockLevel,
    requiresPrescription: medicine.requiresPrescription,
    description: medicine.description ?? undefined,
  };
}

export function MedicineFormDialog({
  open,
  onOpenChange,
  medicine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine?: Medicine;
}) {
  const categories = useCategories();
  const brands = useBrands();
  const save = useSaveMedicine(medicine?.id);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: valuesFromMedicine(medicine),
  });

  const onSubmit = handleSubmit((values) => {
    save.mutate(values, {
      onSuccess: () => {
        toast.success(medicine ? 'Medicine updated' : 'Medicine created');
        onOpenChange(false);
        reset(defaultValues);
      },
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{medicine ? 'Edit medicine' : 'Add medicine'}</DialogTitle>
          <DialogDescription>Maintain catalog details used by stock, billing, and reports.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Medicine name" error={errors.name?.message}>
              <Input {...register('name')} />
            </Field>
            <Field label="Generic name" error={errors.genericName?.message}>
              <Input {...register('genericName')} />
            </Field>
            <Field label="Category" error={errors.categoryId?.message}>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {(categories.data ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Brand" error={errors.brandId?.message}>
              <Controller
                control={control}
                name="brandId"
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No brand</SelectItem>
                      {(brands.data ?? []).map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Unit" error={errors.unit?.message}>
              <Input {...register('unit')} />
            </Field>
            <Field label="Pack size" error={errors.packSize?.message}>
              <Input placeholder="10 tablets" {...register('packSize')} />
            </Field>
            <Field label="HSN code" error={errors.hsnCode?.message}>
              <Input {...register('hsnCode')} />
            </Field>
            <Field label="GST rate %" error={errors.gstRate?.message}>
              <Input type="number" step="0.01" {...register('gstRate')} />
            </Field>
            <Field label="Barcode" error={errors.barcode?.message}>
              <Input {...register('barcode')} />
            </Field>
            <Field label="Rack number" error={errors.rackNumber?.message}>
              <Input {...register('rackNumber')} />
            </Field>
            <Field label="Minimum stock" error={errors.minStockLevel?.message}>
              <Input type="number" min={0} {...register('minStockLevel')} />
            </Field>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <input id="requiresPrescription" type="checkbox" className="h-4 w-4" {...register('requiresPrescription')} />
              <Label htmlFor="requiresPrescription">Requires prescription</Label>
            </div>
          </div>

          <Field label="Description" error={errors.description?.message}>
            <Textarea rows={3} {...register('description')} />
          </Field>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{medicine ? 'Save changes' : 'Create medicine'}</Button>
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
