import { INITIAL_MENU, DEMO_USERS } from "../constants";
import { Expense, MenuItem, Order, OrderStatus, User, UserRole } from "../types";

// Keys for LocalStorage
const K_MENU = 'savanna_menu';
const K_ORDERS = 'savanna_orders';
const K_EXPENSES = 'savanna_expenses';
const K_USER = 'savanna_user';

class DataService {
  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(K_MENU)) {
      localStorage.setItem(K_MENU, JSON.stringify(INITIAL_MENU));
    }
    if (!localStorage.getItem(K_ORDERS)) {
      localStorage.setItem(K_ORDERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(K_EXPENSES)) {
      localStorage.setItem(K_EXPENSES, JSON.stringify([]));
    }
  }

  // --- Auth ---
  login(username: string, password: string): User | null {
    // Demo login - password ignored for MVP simplicity, just matching username
    const user = DEMO_USERS.find(u => u.username === username);
    if (user) {
      localStorage.setItem(K_USER, JSON.stringify(user));
      return user;
    }
    return null;
  }

  logout() {
    localStorage.removeItem(K_USER);
  }

  getCurrentUser(): User | null {
    const s = localStorage.getItem(K_USER);
    return s ? JSON.parse(s) : null;
  }

  // --- Menu ---
  getMenu(): MenuItem[] {
    return JSON.parse(localStorage.getItem(K_MENU) || '[]');
  }

  updateMenuItem(item: MenuItem) {
    const menu = this.getMenu();
    const idx = menu.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      menu[idx] = item;
      localStorage.setItem(K_MENU, JSON.stringify(menu));
    }
  }

  // --- Orders ---
  getOrders(): Order[] {
    return JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
  }

  placeOrder(order: Order) {
    const orders = this.getOrders();
    orders.push(order);
    localStorage.setItem(K_ORDERS, JSON.stringify(orders));
  }

  updateOrderStatus(orderId: string, status: OrderStatus) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      localStorage.setItem(K_ORDERS, JSON.stringify(orders));
    }
  }

  updateOrder(updatedOrder: Order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === updatedOrder.id);
    if (idx >= 0) {
      orders[idx] = updatedOrder;
      localStorage.setItem(K_ORDERS, JSON.stringify(orders));
    }
  }

  // --- Expenses ---
  getExpenses(): Expense[] {
    return JSON.parse(localStorage.getItem(K_EXPENSES) || '[]');
  }

  addExpense(expense: Expense) {
    const expenses = this.getExpenses();
    expenses.push(expense);
    localStorage.setItem(K_EXPENSES, JSON.stringify(expenses));
  }
}

export const db = new DataService();