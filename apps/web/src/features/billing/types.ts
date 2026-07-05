import type { Batch, MedicineDetail } from '@/features/inventory/types';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type DiscountType = 'PERCENTAGE' | 'FLAT';

export interface SaleItem {
  id: string;
  medicineId: string;
  batchId: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: string;
  mrp: string;
  costPrice: string;
  gstRate: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  medicine?: { id: string; name: string; unit: string };
  batch?: { id: string; batchNumber: string; expiryDate: string };
}

export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference?: string | null;
  receivedAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  subtotal: string;
  discountType?: DiscountType | null;
  discountValue: string;
  discountAmount: string;
  taxAmount: string;
  roundOff: string;
  grandTotal: string;
  paidAmount: string;
  paymentStatus: PaymentStatus;
  status: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'RETURNED';
  notes?: string | null;
  customer?: { id: string; name: string; phone: string; email?: string | null } | null;
  cashier?: { id: string; name: string };
  items?: SaleItem[];
  payments?: Payment[];
  returns?: SaleReturn[];
  _count?: { items: number };
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  reason?: string | null;
  refundAmount: string;
  refundMethod: PaymentMethod;
  createdAt: string;
  sale?: { invoiceNumber: string };
  createdBy?: { name: string };
  _count?: { items: number };
}

export interface CartLine {
  id: string;
  medicine: MedicineDetail;
  batch: Batch;
  quantity: number;
  unitPrice: number;
}
