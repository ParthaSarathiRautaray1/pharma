import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Boxes, Plus, Search, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNumber } from '@/lib/format';
import type { Medicine } from '../types';
import { useBrands, useCategories, useMedicines } from '../api/inventory-api';
import { ExpiryBadge } from '../components/ExpiryBadge';
import { MedicineFormDialog } from '../components/MedicineFormDialog';
import { StockBadge } from '../components/StockBadge';

export default function InventoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>();
  const [brandId, setBrandId] = useState<string>();
  const [lowStock, setLowStock] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const categories = useCategories();
  const brands = useBrands();
  const medicines = useMedicines({ page, search, categoryId, brandId, lowStock });

  const columns = useMemo<ColumnDef<Medicine, unknown>[]>(
    () => [
      {
        header: 'Medicine',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.genericName ?? row.original.unit}</p>
          </div>
        ),
      },
      { header: 'Category', cell: ({ row }) => row.original.category?.name ?? '-' },
      { header: 'Brand', cell: ({ row }) => row.original.brand?.name ?? '-' },
      {
        header: 'Stock',
        cell: ({ row }) => (
          <StockBadge stock={row.original.stock} minStockLevel={row.original.minStockLevel} />
        ),
      },
      {
        header: 'GST',
        cell: ({ row }) => `${Number(row.original.gstRate).toFixed(2)}%`,
      },
      {
        header: 'Nearest expiry',
        cell: ({ row }) => row.original.nearestExpiry ? <ExpiryBadge date={row.original.nearestExpiry} /> : '-',
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Search medicines, monitor stock, and manage batch-level inventory."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/app/inventory/alerts')}>
              <AlertTriangle /> Alerts
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/inventory/catalog')}>
              <Settings2 /> Catalog
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus /> Add medicine
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by medicine, generic name, or barcode"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={categoryId ?? 'all'} onValueChange={(v) => { setCategoryId(v === 'all' ? undefined : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={brandId ?? 'all'} onValueChange={(v) => { setBrandId(v === 'all' ? undefined : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {(brands.data ?? []).map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={lowStock ? 'default' : 'outline'}
          onClick={() => {
            setLowStock((value) => !value);
            setPage(1);
          }}
        >
          Low stock
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={medicines.data?.rows}
        loading={medicines.isLoading}
        meta={medicines.data?.meta}
        onPageChange={setPage}
        onRowClick={(medicine) => navigate(`/app/inventory/${medicine.id}`)}
        emptyMessage="No medicines match these filters"
        emptyIcon={<Boxes className="h-8 w-8" />}
      />

      {medicines.data?.meta && (
        <p className="mt-3 text-xs text-muted-foreground">
          {formatNumber(medicines.data.meta.total)} catalog item(s)
        </p>
      )}

      <MedicineFormDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
