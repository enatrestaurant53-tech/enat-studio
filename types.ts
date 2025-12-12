export enum UserRole {
  GUEST = 'GUEST',
  CHEF = 'CHEF',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
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
  category: MenuCategory;
  imageUrl: string;
  isAvailable: boolean;
  tags: ('spicy' | 'vegan' | 'halal' | 'gf')[];
  allergens?: string[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: string; // The landmark ID
  tableName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  timestamp: number;
  paymentMethod: 'ONLINE' | 'CASH';
}

export interface TableLandmark {
  id: string;
  name: string;
  description: string;
  imagePlaceholder: string;
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
  role: UserRole;
  name: string;
}
