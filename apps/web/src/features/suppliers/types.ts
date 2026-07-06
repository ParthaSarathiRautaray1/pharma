export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone: string;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  isActive: boolean;
  outstanding?: string;
  _count?: { purchases: number };
}

export interface SupplierOutstanding {
  totalOutstanding: string;
  purchases: {
    id: string;
    purchaseNumber: string;
    orderDate: string;
    grandTotal: string;
    paidAmount: string;
    paymentStatus: string;
  }[];
}

export interface SupplierReports {
  total: number;
  active: number;
  outstandingAmount: string;
  suppliersWithDue: number;
  topSuppliers: { id: string; name: string; phone: string; total: string; purchases: number }[];
}
