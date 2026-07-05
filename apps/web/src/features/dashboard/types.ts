export interface DashboardSummary {
  totalSales: number;
  todaySales: number;
  monthlySales: number;
  totalPurchase: number;
  profit: number;
  monthlyProfit: number;
  lowStock: number;
  expiredMedicines: number;
  nearExpiry: number;
  pendingPayments: { amount: number; count: number };
  activeCustomers: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  profit: number;
}

export interface SalesPurchasePoint {
  month: string;
  sales: number;
  purchases: number;
}

export interface TopMedicine {
  name: string;
  quantity: number;
  revenue: number;
}

export interface CustomerPoint {
  month: string;
  newCustomers: number;
  returning: number;
}
