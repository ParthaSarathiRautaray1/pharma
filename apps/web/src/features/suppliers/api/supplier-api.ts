import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess, PageMeta } from '@/types/api';
import type { Supplier, SupplierOutstanding, SupplierReports } from '../types';

export interface SupplierFilters {
  page: number;
  search?: string;
}

function toParams(filters: SupplierFilters) {
  const p = new URLSearchParams({ page: String(filters.page), pageSize: '15' });
  if (filters.search) p.set('search', filters.search);
  return p.toString();
}

export function useSuppliers(filters: SupplierFilters) {
  return useQuery({
    queryKey: ['suppliers', filters],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Supplier[]>>(`/suppliers?${toParams(filters)}`);
      return { rows: data.data, meta: data.meta as PageMeta };
    },
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: ['supplier', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiSuccess<Supplier>>(`/suppliers/${id}`)).data.data,
  });
}

export function useSaveSupplier(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      id
        ? (await api.patch<ApiSuccess<Supplier>>(`/suppliers/${id}`, body)).data.data
        : (await api.post<ApiSuccess<Supplier>>('/suppliers', body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplier', id] });
      qc.invalidateQueries({ queryKey: ['supplier-reports'] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useSupplierOutstanding(id: string | undefined) {
  return useQuery({
    queryKey: ['supplier-outstanding', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiSuccess<SupplierOutstanding>>(`/suppliers/${id}/outstanding`)).data.data,
  });
}

export function useSupplierReports() {
  return useQuery({
    queryKey: ['supplier-reports'],
    queryFn: async () => (await api.get<ApiSuccess<SupplierReports>>('/suppliers/reports')).data.data,
    retry: false,
  });
}
