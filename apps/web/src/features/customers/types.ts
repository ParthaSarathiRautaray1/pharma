import type { PaymentMethod, Sale } from '@/features/billing/types';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  loyaltyPoints: number;
  notes?: string | null;
  isActive: boolean;
  outstanding?: string;
  _count?: { sales: number; prescriptions: number };
}

export interface OutstandingSale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  grandTotal: string;
  paidAmount: string;
  paymentStatus: string;
}

export interface CustomerOutstanding {
  totalOutstanding: string;
  sales: OutstandingSale[];
}

export interface Prescription {
  id: string;
  customerId: string;
  saleId?: string | null;
  fileUrl: string;
  note?: string | null;
  createdAt: string;
  sale?: { invoiceNumber: string } | null;
}

export interface CustomerAnalytics {
  total: number;
  active: number;
  outstandingAmount: string;
  customersWithDue: number;
  topCustomers: { id: string; name: string; phone: string; total: string; invoices: number }[];
}

export interface CustomerPayment {
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export type CustomerSale = Sale;
