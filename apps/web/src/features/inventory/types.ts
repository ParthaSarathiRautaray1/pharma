export interface Category {
  id: string;
  name: string;
  description?: string | null;
  _count?: { medicines: number };
}

export interface Brand {
  id: string;
  name: string;
  manufacturer?: string | null;
  _count?: { medicines: number };
}

export interface Medicine {
  id: string;
  name: string;
  genericName?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  unit: string;
  packSize?: string | null;
  hsnCode?: string | null;
  gstRate: string;
  barcode?: string | null;
  rackNumber?: string | null;
  minStockLevel: number;
  requiresPrescription: boolean;
  description?: string | null;
  isActive: boolean;
  category?: { id?: string; name: string } | null;
  brand?: { id?: string; name: string } | null;
  stock: number;
  nearestExpiry?: string | null;
}

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  mfgDate?: string | null;
  expiryDate: string;
  purchasePrice: string;
  sellingPrice: string;
  mrp: string;
  quantity: number;
  medicine?: { name: string; unit?: string };
}

export interface MedicineDetail extends Medicine {
  batches: Batch[];
}

export interface StockAlerts {
  lowStock: { medicineId: string; name: string; minStockLevel: number; stock: number }[];
  nearExpiry: Batch[];
  expired: Batch[];
}

export interface LedgerEntry {
  id: string;
  movementType: string;
  quantityChange: number;
  balanceAfter: number;
  refType?: string | null;
  note?: string | null;
  createdAt: string;
  medicine?: { name: string };
  batch?: { batchNumber: string };
}
