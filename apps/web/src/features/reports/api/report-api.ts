import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess } from '@/types/api';
import type { ReportKind, ReportResponse } from '../types';

export interface ReportFilters {
  kind: ReportKind;
  from?: string;
  to?: string;
  groupBy: 'day' | 'month';
}

function params(filters: ReportFilters) {
  const p = new URLSearchParams({ groupBy: filters.groupBy, format: 'json' });
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  return p.toString();
}

export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', filters],
    queryFn: async () => (await api.get<ApiSuccess<ReportResponse>>(`/reports/${filters.kind}?${params(filters)}`)).data.data,
  });
}

export function useEmailReport() {
  return useMutation({
    mutationFn: async (body: ReportFilters & { to: string }) =>
      (await api.post<ApiSuccess<{ sent: boolean }>>('/email/report', body)).data.data,
  });
}
