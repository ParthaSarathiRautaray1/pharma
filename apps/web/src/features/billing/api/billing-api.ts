import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess, PageMeta } from '@/types/api';
import type { MedicineDetail } from '@/features/inventory/types';
import type { DiscountType, PaymentMethod, Sale, SaleReturn } from '../types';

export interface SaleFilters {
  page: number;
  paymentStatus?: string;
}

function toParams(filters: SaleFilters): string {
  const p = new URLSearchParams({ page: String(filters.page), pageSize: '15' });
  if (filters.paymentStatus) p.set('paymentStatus', filters.paymentStatus);
  return p.toString();
}

export function useSales(filters: SaleFilters) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Sale[]>>(`/sales?${toParams(filters)}`);
      return { rows: data.data, meta: data.meta as PageMeta };
    },
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sale', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiSuccess<Sale>>(`/sales/${id}`)).data.data,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      customerId?: string;
      items: { medicineId: string; batchId: string; quantity: number; unitPrice?: number }[];
      discountType?: DiscountType;
      discountValue?: number;
      payments: { method: PaymentMethod; amount: number; reference?: string }[];
      notes?: string;
    }) => (await api.post<ApiSuccess<Sale>>('/sales', body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['stock-alerts'] });
    },
  });
}

export function useCollectPayment(saleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { payments: { method: PaymentMethod; amount: number; reference?: string }[] }) =>
      (await api.post<ApiSuccess<Sale>>(`/sales/${saleId}/payments`, body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sale', saleId] });
    },
  });
}

export function useCreateReturn(saleId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      items: { saleItemId: string; quantity: number }[];
      reason?: string;
      refundMethod: PaymentMethod;
    }) => (await api.post<ApiSuccess<Sale>>(`/sales/${saleId}/returns`, body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sale', saleId] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['medicines'] });
    },
  });
}

export function useReturns(page: number) {
  return useQuery({
    queryKey: ['returns', page],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<SaleReturn[]>>(`/returns?page=${page}&pageSize=15`);
      return { rows: data.data, meta: data.meta as PageMeta };
    },
  });
}

export async function fetchMedicine(id: string) {
  return (await api.get<ApiSuccess<MedicineDetail>>(`/medicines/${id}`)).data.data;
}
