import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage } from '@/lib/axios';
import type { Brand, Category } from '../types';
import {
  useBrands,
  useCategories,
  useDeleteBrand,
  useDeleteCategory,
  useSaveBrand,
  useSaveCategory,
} from '../api/inventory-api';

export default function CatalogPage() {
  const navigate = useNavigate();
  const categories = useCategories();
  const brands = useBrands();

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Manage medicine categories and brands used by inventory filters."
        actions={<Button variant="outline" onClick={() => navigate('/app/inventory')}><ArrowLeft /> Inventory</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CategoryCreateRow />
            {(categories.data ?? []).map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Brands</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <BrandCreateRow />
            {(brands.data ?? []).map((brand) => (
              <BrandRow key={brand.id} brand={brand} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CategoryCreateRow() {
  const save = useSaveCategory();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="rounded-lg border p-3">
      <Label>Add category</Label>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Button
          loading={save.isPending}
          onClick={() => save.mutate(
            { name, description: description || undefined },
            {
              onSuccess: () => {
                toast.success('Category saved');
                setName('');
                setDescription('');
              },
              onError: (error) => toast.error(apiErrorMessage(error)),
            },
          )}
        >
          <Plus /> Add
        </Button>
      </div>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const save = useSaveCategory(category.id);
  const remove = useDeleteCategory();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <Input value={description} onChange={(event) => setDescription(event.target.value)} />
      <Button
        variant="outline"
        loading={save.isPending}
        onClick={() => save.mutate(
          { name, description: description || undefined },
          {
            onSuccess: () => toast.success('Category updated'),
            onError: (error) => toast.error(apiErrorMessage(error)),
          },
        )}
      >
        Save
      </Button>
      <Button variant="outline" size="icon" onClick={() => setConfirm(true)}><Trash2 /></Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete category?"
        description="Medicines keep their history, but this category will no longer be available for selection."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate(category.id, {
          onSuccess: () => toast.success('Category deleted'),
          onError: (error) => toast.error(apiErrorMessage(error)),
        })}
      />
    </div>
  );
}

function BrandCreateRow() {
  const save = useSaveBrand();
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');

  return (
    <div className="rounded-lg border p-3">
      <Label>Add brand</Label>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input placeholder="Manufacturer" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
        <Button
          loading={save.isPending}
          onClick={() => save.mutate(
            { name, manufacturer: manufacturer || undefined },
            {
              onSuccess: () => {
                toast.success('Brand saved');
                setName('');
                setManufacturer('');
              },
              onError: (error) => toast.error(apiErrorMessage(error)),
            },
          )}
        >
          <Plus /> Add
        </Button>
      </div>
    </div>
  );
}

function BrandRow({ brand }: { brand: Brand }) {
  const save = useSaveBrand(brand.id);
  const remove = useDeleteBrand();
  const [name, setName] = useState(brand.name);
  const [manufacturer, setManufacturer] = useState(brand.manufacturer ?? '');
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <Input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
      <Button
        variant="outline"
        loading={save.isPending}
        onClick={() => save.mutate(
          { name, manufacturer: manufacturer || undefined },
          {
            onSuccess: () => toast.success('Brand updated'),
            onError: (error) => toast.error(apiErrorMessage(error)),
          },
        )}
      >
        Save
      </Button>
      <Button variant="outline" size="icon" onClick={() => setConfirm(true)}><Trash2 /></Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete brand?"
        description="Medicines keep their history, but this brand will no longer be available for selection."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate(brand.id, {
          onSuccess: () => toast.success('Brand deleted'),
          onError: (error) => toast.error(apiErrorMessage(error)),
        })}
      />
    </div>
  );
}
