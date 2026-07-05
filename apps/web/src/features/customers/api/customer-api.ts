import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess, PageMeta } from '@/types/api';
import type {
  Customer,
  CustomerAnalytics,
  CustomerOutstanding,
  CustomerPayment,
  CustomerSale,
  Prescription,
} from '../types';

export interface CustomerFilters {
  page: number;
  search?: string;
}

function toParams(filters: CustomerFilters): string {
  const p = new URLSearchParams({ page: String(filters.page), pageSize: '15' });
  if (filters.search) p.set('search', filters.search);
  return p.toString();
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Customer[]>>(`/customers?${toParams(filters)}`);
      return { rows: data.data, meta: data.meta as PageMeta };
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customer', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiSuccess<Customer>>(`/customers/${id}`)).data.data,
  });
}

export function useSaveCustomer(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      id
        ? (await api.patch<ApiSuccess<Customer>>(`/customers/${id}`, body)).data.data
        : (await api.post<ApiSuccess<Customer>>('/customers', body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useCustomerHistory(id: string | undefined, page: number) {
  return useQuery({
    queryKey: ['customer-history', id, page],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CustomerSale[]>>(`/customers/${id}/history?page=${page}&pageSize=10`);
      return { rows: data.data, meta: data.meta as PageMeta };
    },
  });
}

export function useCustomerOutstanding(id: string | undefined) {
  return useQuery({
    queryKey: ['customer-outstanding', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiSuccess<CustomerOutstanding>>(`/customers/${id}/outstanding`)).data.data,
  });
}

export function useCollectCustomerPayment(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CustomerPayment) =>
      (await api.post<ApiSuccess<CustomerOutstanding>>(`/customers/${id}/payments`, body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-outstanding', id] });
      qc.invalidateQueries({ queryKey: ['customer-history', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function usePrescriptions(id: string | undefined) {
  return useQuery({
    queryKey: ['prescriptions', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiSuccess<Prescription[]>>(`/customers/${id}/prescriptions`)).data.data,
  });
}

export function useAddPrescription(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { fileUrl: string; note?: string; saleId?: string }) =>
      (await api.post<ApiSuccess<Prescription>>(`/customers/${id}/prescriptions`, body)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions', id] }),
  });
}

export function useCustomerAnalytics() {
  return useQuery({
    queryKey: ['customer-analytics'],
    queryFn: async () => (await api.get<ApiSuccess<CustomerAnalytics>>('/customers/analytics')).data.data,
    retry: false,
  });
}
