export type ReportKind = 'sales' | 'purchases' | 'stock' | 'profit' | 'gst' | 'expiry' | 'customers' | 'suppliers';

export interface ReportResponse {
  kind: ReportKind;
  format: string;
  data: unknown;
}
