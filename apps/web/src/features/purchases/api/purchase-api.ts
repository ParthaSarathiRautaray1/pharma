import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess, PageMeta } from '@/types/api';
import type { PaymentMethod } from '@/features/billing/types';
import type { Purchase, PurchaseStatus } from '../types';

export interface PurchaseFilters {
  page: number;
  supplierId?: string;
  status?: PurchaseStatus | 'ALL';
}

function toParams(filters: PurchaseFilters) {
  const p = new URLSearchParams({ page: String(filters.page), pageSize: '15' });
  if (filters.supplierId) p.set('supplierId', filters.supplierId);
  if (filters.status && filters.status !== 'ALL') p.set('status', filters.status);
  return p.toString();
}

export function usePurchases(filters: PurchaseFilters) {
  return useQuery({
    queryKey: ['purchases', filters],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Purchase[]>>(`/purchases?${toParams(filters)}`);
      return { rows: data.data, meta: data.meta as PageMeta };
    },
  });
}

export function usePurchase(id: string | undefined) {
  return useQuery({
    queryKey: ['purchase', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiSuccess<Purchase>>(`/purchases/${id}`)).data.data,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post<ApiSuccess<Purchase>>('/purchases', body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplier-reports'] });
    },
  });
}

export function useReceivePurchase(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<ApiSuccess<Purchase>>(`/purchases/${id}/receive`)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['stock-alerts'] });
    },
  });
}

export function useCollectPurchasePayment(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { amount: number; method: PaymentMethod; reference?: string }) =>
      (await api.post<ApiSuccess<Purchase>>(`/purchases/${id}/payments`, body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
