
export enum UserRole {
  GUEST = 'GUEST',
  CHEF = 'CHEF',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  DEVELOPER = 'DEVELOPER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MenuCategory {
  STARTERS = 'Starters & Soups',
  MAINS = 'Mains',
  SIDES = 'Sides & Grains',
  DESSERTS = 'Desserts',
  BEVERAGES = 'Beverages & Drinks',
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string; // Changed from MenuCategory to string to allow dynamic categories
  imageUrl: string;
  isAvailable: boolean;
  tags: string[]; // Simplified to string array for flexibility
  allergens?: string[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: string;
  tableName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'PAID' | 'UNPAID';
  timestamp: number;
  readyTimestamp?: number;
  completedTimestamp?: number;
  paymentMethod: 'ONLINE' | 'CASH';
}

export interface TableInfo {
  id: string;
  name: string;
  description?: string; 
}

export interface Expense {
  id: string;
  reason: string;
  amount: number;
  receiptImage?: string; // Base64 or URL
  timestamp: number;
  submittedBy: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
}

export interface WaiterCall {
  id: string;
  tableId: string;
  tableName: string;
  timestamp: number;
  status: 'PENDING' | 'RESOLVED';
}

export type AppTheme = 'SAVANNA' | 'MIDNIGHT' | 'GARDEN';
export type TableMode = 'WHEEL' | 'GRID' | 'LIST';

export interface SystemSettings {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  restaurantName: string;
  restaurantLocation: string; 
  restaurantLogo: string; // URL
  totalTables: number;
  theme: AppTheme;
  tableSelectionMode: TableMode;
  receiptPrinterName: string; // Name of the printer in QZ Tray/OS
}

export interface LoginLog {
  id: string;
  username: string;
  role: UserRole;
  timestamp: number;
  status: 'SUCCESS' | 'FAILED';
}
