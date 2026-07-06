import type { PaymentMethod } from '@/features/billing/types';
import type { Supplier } from '@/features/suppliers/types';

export type PurchaseStatus = 'ORDERED' | 'RECEIVED' | 'CANCELLED';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface PurchaseItem {
  id: string;
  medicineId: string;
  batchId?: string | null;
  batchNumber: string;
  mfgDate?: string | null;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  purchasePrice: string;
  sellingPrice: string;
  mrp: string;
  gstRate: string;
  taxAmount: string;
  total: string;
  medicine?: { id: string; name: string; unit: string };
  batch?: { id: string; batchNumber: string } | null;
}

export interface Purchase {
  id: string;
  supplierId: string;
  purchaseNumber: string;
  supplierInvoiceNo?: string | null;
  status: PurchaseStatus;
  orderDate: string;
  receivedDate?: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  paidAmount: string;
  paymentStatus: PaymentStatus;
  invoiceFileUrl?: string | null;
  notes?: string | null;
  supplier?: Pick<Supplier, 'id' | 'name' | 'phone' | 'gstin'>;
  createdBy?: { name: string };
  items?: PurchaseItem[];
  payments?: { id: string; amount: string; method: PaymentMethod; reference?: string | null; receivedAt: string }[];
  _count?: { items: number };
}
