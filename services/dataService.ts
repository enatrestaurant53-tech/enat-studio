import { INITIAL_MENU, DEMO_USERS } from "../constants";
import { Expense, MenuItem, Order, OrderStatus, User, UserRole, WaiterCall, SystemSettings, LoginLog } from "../types";

// Keys for LocalStorage
const K_MENU = 'savanna_menu';
const K_ORDERS = 'savanna_orders';
const K_EXPENSES = 'savanna_expenses';
const K_USER = 'savanna_user';
const K_USERS_DB = 'savanna_users_db'; // Stores the list of users
const K_WAITER_CALLS = 'savanna_waiter_calls';
const K_SYSTEM_SETTINGS = 'savanna_system_settings';
const K_LOGIN_LOGS = 'savanna_login_logs';

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
    if (!localStorage.getItem(K_WAITER_CALLS)) {
      localStorage.setItem(K_WAITER_CALLS, JSON.stringify([]));
    }
    if (!localStorage.getItem(K_SYSTEM_SETTINGS)) {
      localStorage.setItem(K_SYSTEM_SETTINGS, JSON.stringify({ isMaintenanceMode: false, maintenanceMessage: '' }));
    }
    if (!localStorage.getItem(K_LOGIN_LOGS)) {
      localStorage.setItem(K_LOGIN_LOGS, JSON.stringify([]));
    }

    // Initialize or Fix Users DB
    // We check if DB exists, AND if it contains the new 'dev' user, AND if users have passwords.
    // If not, we overwrite with the fresh DEMO_USERS to fix login issues.
    const storedUsersRaw = localStorage.getItem(K_USERS_DB);
    let shouldReseed = !storedUsersRaw;

    if (storedUsersRaw) {
        try {
            const users = JSON.parse(storedUsersRaw);
            const hasDev = users.some((u: User) => u.role === UserRole.DEVELOPER);
            const hasPasswords = users.every((u: User) => !!u.password);
            if (!hasDev || !hasPasswords) {
                shouldReseed = true;
            }
        } catch (e) {
            shouldReseed = true;
        }
    }

    if (shouldReseed) {
      localStorage.setItem(K_USERS_DB, JSON.stringify(DEMO_USERS));
    }
  }

  // --- Auth & User Management ---
  
  getUsers(): User[] {
    return JSON.parse(localStorage.getItem(K_USERS_DB) || '[]');
  }

  login(username: string, password: string): User | null {
    const users = this.getUsers();
    
    // Normalize input
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = users.find(u => 
        u.username.toLowerCase() === cleanUsername && 
        u.password === cleanPassword
    );
    
    // Log the attempt
    this.logLoginEvent(username, user ? user.role : UserRole.GUEST, user ? 'SUCCESS' : 'FAILED');

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

  updateUserCredentials(userId: string, newUsername: string, newPassword?: string) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      users[idx].username = newUsername;
      if (newPassword) {
        users[idx].password = newPassword;
      }
      localStorage.setItem(K_USERS_DB, JSON.stringify(users));
    }
  }

  // --- System Settings (Maintenance Mode) ---

  getSystemSettings(): SystemSettings {
    return JSON.parse(localStorage.getItem(K_SYSTEM_SETTINGS) || '{"isMaintenanceMode": false}');
  }

  toggleMaintenanceMode(status: boolean) {
    const settings = this.getSystemSettings();
    settings.isMaintenanceMode = status;
    localStorage.setItem(K_SYSTEM_SETTINGS, JSON.stringify(settings));
  }

  // --- Logging ---

  private logLoginEvent(username: string, role: UserRole, status: 'SUCCESS' | 'FAILED') {
    const logs: LoginLog[] = JSON.parse(localStorage.getItem(K_LOGIN_LOGS) || '[]');
    const newLog: LoginLog = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      role,
      timestamp: Date.now(),
      status
    };
    logs.push(newLog);
    // Keep only last 100 logs
    if (logs.length > 100) logs.shift();
    localStorage.setItem(K_LOGIN_LOGS, JSON.stringify(logs));
  }

  getLoginLogs(): LoginLog[] {
    return JSON.parse(localStorage.getItem(K_LOGIN_LOGS) || '[]');
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

  // --- Waiter Calls ---
  getWaiterCalls(): WaiterCall[] {
    return JSON.parse(localStorage.getItem(K_WAITER_CALLS) || '[]');
  }

  addWaiterCall(call: WaiterCall) {
    const calls = this.getWaiterCalls();
    calls.push(call);
    localStorage.setItem(K_WAITER_CALLS, JSON.stringify(calls));
  }

  resolveWaiterCall(id: string) {
    const calls = this.getWaiterCalls();
    const call = calls.find(c => c.id === id);
    if (call) {
      call.status = 'RESOLVED';
      localStorage.setItem(K_WAITER_CALLS, JSON.stringify(calls));
    }
  }
}

export const db = new DataService();