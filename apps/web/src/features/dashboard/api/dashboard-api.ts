import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess } from '@/types/api';
import type {
  CustomerPoint,
  DashboardSummary,
  RevenuePoint,
  SalesPurchasePoint,
  TopMedicine,
} from '../types';

async function get<T>(url: string): Promise<T> {
  const { data } = await api.get<ApiSuccess<T>>(url);
  return data.data;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => get<DashboardSummary>('/dashboard/summary'),
  });
}

export function useRevenueSeries(range: '7d' | '30d' | '90d') {
  return useQuery({
    queryKey: ['dashboard', 'revenue', range],
    queryFn: () => get<RevenuePoint[]>(`/dashboard/charts/revenue?range=${range}`),
  });
}

export function useSalesPurchases(months = 12) {
  return useQuery({
    queryKey: ['dashboard', 'sales-purchases', months],
    queryFn: () => get<SalesPurchasePoint[]>(`/dashboard/charts/sales-purchases?months=${months}`),
  });
}

export function useTopMedicines(limit = 8) {
  return useQuery({
    queryKey: ['dashboard', 'top-medicines', limit],
    queryFn: () => get<TopMedicine[]>(`/dashboard/charts/top-medicines?limit=${limit}`),
  });
}

export function useCustomerAnalytics(months = 12) {
  return useQuery({
    queryKey: ['dashboard', 'customers', months],
    queryFn: () => get<CustomerPoint[]>(`/dashboard/charts/customers?months=${months}`),
  });
}
