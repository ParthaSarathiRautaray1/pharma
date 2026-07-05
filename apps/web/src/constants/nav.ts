import {
  BarChart3,
  Bell,
  FlaskConical,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/api';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Roles that see this item. Mirrors API RBAC — UI convenience only. */
  roles: UserRole[];
}

const ALL: UserRole[] = ['SUPER_ADMIN', 'OWNER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER'];
const ADMINS: UserRole[] = ['SUPER_ADMIN', 'OWNER'];
const BILLING: UserRole[] = ['SUPER_ADMIN', 'OWNER', 'PHARMACIST', 'CASHIER'];
const INVENTORY: UserRole[] = ['SUPER_ADMIN', 'OWNER', 'PHARMACIST', 'INVENTORY_MANAGER'];
const CLINICAL: UserRole[] = ['SUPER_ADMIN', 'OWNER', 'PHARMACIST'];

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard, roles: CLINICAL },
  { label: 'POS Billing', path: '/app/billing', icon: ShoppingCart, roles: BILLING },
  { label: 'Sales', path: '/app/sales', icon: Receipt, roles: BILLING },
  { label: 'Inventory', path: '/app/inventory', icon: Package, roles: INVENTORY },
  { label: 'Purchases', path: '/app/purchases', icon: Truck, roles: INVENTORY },
  { label: 'Customers', path: '/app/customers', icon: Users, roles: BILLING },
  { label: 'Suppliers', path: '/app/suppliers', icon: UserRound, roles: INVENTORY },
  { label: 'Lab Samples', path: '/app/samples', icon: FlaskConical, roles: CLINICAL },
  { label: 'Reports', path: '/app/reports', icon: BarChart3, roles: CLINICAL },
  { label: 'Notifications', path: '/app/notifications', icon: Bell, roles: ALL },
  { label: 'Settings', path: '/app/settings', icon: Settings, roles: ADMINS },
];

export function navItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
