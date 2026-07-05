import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess, PageMeta } from '@/types/api';
import type {
  Batch,
  Brand,
  Category,
  LedgerEntry,
  Medicine,
  MedicineDetail,
  StockAlerts,
} from '../types';

export interface MedicineFilters {
  page: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  lowStock?: boolean;
  expired?: boolean;
}

function toParams(filters: MedicineFilters): string {
  const p = new URLSearchParams({ page: String(filters.page), pageSize: '15' });
  if (filters.search) p.set('search', filters.search);
  if (filters.categoryId) p.set('categoryId', filters.categoryId);
  if (filters.brandId) p.set('brandId', filters.brandId);
  if (filters.lowStock) p.set('lowStock', 'true');
  if (filters.expired) p.set('expired', 'true');
  return p.toString();
}

// ── Medicines ──────────────────────────────────────────────────────────
export function useMedicines(filters: MedicineFilters) {
  return useQuery({
    queryKey: ['medicines', filters],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Medicine[]>>(`/medicines?${toParams(filters)}`);
      return { rows: data.data, meta: data.meta as PageMeta };
    },
  });
}

export function useMedicine(id: string | undefined) {
  return useQuery({
    queryKey: ['medicine', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<MedicineDetail>>(`/medicines/${id}`);
      return data.data;
    },
  });
}

export function useSaveMedicine(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = id
        ? await api.patch<ApiSuccess<Medicine>>(`/medicines/${id}`, body)
        : await api.post<ApiSuccess<Medicine>>('/medicines', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['medicine', id] });
    },
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/medicines/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  });
}

// ── Categories & Brands ────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<ApiSuccess<Category[]>>('/categories')).data.data,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api.get<ApiSuccess<Brand[]>>('/brands')).data.data,
  });
}

export function useSaveCategory(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const { data } = id
        ? await api.patch<ApiSuccess<Category>>(`/categories/${id}`, body)
        : await api.post<ApiSuccess<Category>>('/categories', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useSaveBrand(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; manufacturer?: string }) => {
      const { data } = id
        ? await api.patch<ApiSuccess<Brand>>(`/brands/${id}`, body)
        : await api.post<ApiSuccess<Brand>>('/brands', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/brands/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
  });
}

// ── Batches & Stock ────────────────────────────────────────────────────
export function useBatches(medicineId: string | undefined) {
  return useQuery({
    queryKey: ['batches', medicineId],
    enabled: !!medicineId,
    queryFn: async () =>
      (await api.get<ApiSuccess<Batch[]>>(`/batches?medicineId=${medicineId}&pageSize=100`)).data.data,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.post<ApiSuccess<Batch>>('/batches', body);
      return data.data;
    },
    onSuccess: (_d, _v) => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['medicine'] });
      qc.invalidateQueries({ queryKey: ['stock-alerts'] });
    },
  });
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => (await api.get<ApiSuccess<StockAlerts>>('/stock/alerts')).data.data,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      batchId: string;
      quantityChange: number;
      reason: string;
      note?: string;
    }) => {
      const { data } = await api.post<ApiSuccess<unknown>>('/stock/adjustments', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['medicine'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['stock-alerts'] });
    },
  });
}

export function useLedger(medicineId: string | undefined) {
  return useQuery({
    queryKey: ['ledger', medicineId],
    enabled: !!medicineId,
    queryFn: async () =>
      (await api.get<ApiSuccess<LedgerEntry[]>>(`/stock/ledger?medicineId=${medicineId}&pageSize=50`))
        .data.data,
  });
}
