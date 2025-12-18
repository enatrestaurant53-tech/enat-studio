import { INITIAL_MENU, DEMO_USERS } from "../constants";
import { Expense, MenuItem, Order, OrderStatus, User, WaiterCall, SystemSettings, LoginLog, TableInfo } from "../types";

const API_BASE = '/api/store';

class DataService {
  private currentUser: User | null = null;
  private initialized: boolean = false;
  private memoryStore: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('savanna_session');
      if (s) this.currentUser = JSON.parse(s);
    }
  }

  async ensureInitialized() {
    if (this.initialized) return;
    
    try {
      // Warm up the store
      const store = await this.getStore();
      this.memoryStore = store;
      
      // If menu is empty, seed initial data
      if (!store.menu || store.menu.length === 0) {
          await this.post('sync', {
              menu: INITIAL_MENU,
              users: DEMO_USERS,
              categories: Array.from(new Set(INITIAL_MENU.map(i => i.category))),
              settings: {
                  isMaintenanceMode: false,
                  maintenanceMessage: 'Updating for you.',
                  restaurantName: 'Enat Restaurant',
                  restaurantLocation: 'Dubai, UAE',
                  totalTables: 17,
                  theme: 'SAVANNA',
                  tableSelectionMode: 'WHEEL',
                  receiptPrinterName: ''
              }
          });
      }
      this.initialized = true;
    } catch (e) {
      console.warn("Backend unavailable, using simulated data.");
      // Don't throw, just allow fallback logic in component
      this.initialized = true; 
    }
  }

  private async fetchWithRetry(url: string, options?: RequestInit) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`Fetch failed for ${url}:`, e);
      throw e;
    }
  }

  private async get(type: string) {
    try {
      return await this.fetchWithRetry(`${API_BASE}?type=${type}`);
    } catch (e) {
      // Fallback: If we have memory store from init, return that slice
      if (this.memoryStore && this.memoryStore[type]) return this.memoryStore[type];
      return type === 'settings' ? {} : [];
    }
  }

  private async post(type: string, data: any) {
    try {
      const res = await this.fetchWithRetry(`${API_BASE}?type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res;
    } catch (e) {
      console.warn("Could not save to cloud.");
      return { success: false };
    }
  }

  async getStore() {
      return this.fetchWithRetry(API_BASE);
  }

  // --- Auth ---
  async login(username: string, password: string): Promise<User | null> {
    try {
      const users: User[] = await this.get('users');
      const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password);
      if (user) {
        this.currentUser = user;
        localStorage.setItem('savanna_session', JSON.stringify(user));
        return user;
      }
    } catch (e) {}
    return null;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('savanna_session');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // --- Menu ---
  async getMenu(): Promise<MenuItem[]> { return this.get('menu'); }
  async addMenuItem(item: MenuItem) { await this.post('menu', item); }
  async updateMenuItem(item: MenuItem) { await this.post('menu', item); }
  async deleteMenuItem(id: string) {
    const menu = await this.getMenu();
    await this.post('sync', { menu: menu.filter(m => m.id !== id) });
  }

  async getCategories(): Promise<string[]> { return this.get('categories'); }
  async addCategory(name: string) {
    const cats = await this.getCategories();
    if (!cats.includes(name)) {
      await this.post('sync', { categories: [...cats, name] });
    }
  }
  async removeCategory(name: string) {
    const cats = await this.getCategories();
    await this.post('sync', { categories: cats.filter(c => c !== name) });
  }
  async renameCategory(oldName: string, newName: string) {
    const cats = await this.getCategories();
    const updatedCats = cats.map(c => c === oldName ? newName : c);
    const menu = await this.getMenu();
    const updatedMenu = menu.map(item => item.category === oldName ? { ...item, category: newName } : item);
    await this.post('sync', { categories: updatedCats, menu: updatedMenu });
  }

  // --- Orders ---
  async getOrders(): Promise<Order[]> { return this.get('orders'); }
  async placeOrder(order: Order) { await this.post('orders', order); }
  async updateOrder(order: Order) { await this.post('orders', order); }
  async updateOrderStatus(orderId: string, status: OrderStatus) {
      const orders = await this.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (order) {
          order.status = status;
          await this.updateOrder(order);
      }
  }

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> { return this.get('expenses'); }
  async addExpense(expense: Expense) { await this.post('expenses', expense); }

  // --- Settings ---
  async getSystemSettings(): Promise<SystemSettings> { 
    const s = await this.get('settings');
    // Ensure we always return a valid object structure
    return {
        isMaintenanceMode: s.isMaintenanceMode ?? false,
        maintenanceMessage: s.maintenanceMessage ?? '',
        restaurantName: s.restaurantName ?? 'Enat Restaurant',
        restaurantLocation: s.restaurantLocation ?? 'Dubai, UAE',
        restaurantLogo: s.restaurantLogo ?? '',
        totalTables: s.totalTables ?? 17,
        theme: s.theme ?? 'SAVANNA',
        tableSelectionMode: s.tableSelectionMode ?? 'WHEEL',
        receiptPrinterName: s.receiptPrinterName ?? ''
    };
  }
  async updateSystemSettings(settings: SystemSettings) { await this.post('settings', settings); }
  async toggleMaintenanceMode(status: boolean) {
      const settings = await this.getSystemSettings();
      settings.isMaintenanceMode = status;
      await this.updateSystemSettings(settings);
  }

  async getTables(): Promise<TableInfo[]> {
      const settings = await this.getSystemSettings();
      const count = settings.totalTables || 17;
      return Array.from({ length: count }, (_, i) => ({
        id: String(i + 1),
        name: `Table ${i + 1}`
      }));
  }

  // --- Waiter Calls ---
  async getWaiterCalls(): Promise<WaiterCall[]> { return this.get('waiterCalls'); }
  async addWaiterCall(call: WaiterCall) { await this.post('waiterCalls', call); }
  async resolveWaiterCall(id: string) { await this.post('waiterCalls', { resolveId: id }); }

  async getLoginLogs(): Promise<LoginLog[]> { return this.get('logs'); }
  async getUsers(): Promise<User[]> { return this.get('users'); }
  async addUser(user: User) {
    const users = await this.getUsers();
    await this.post('sync', { users: [...users, user] });
  }
  async updateUser(user: User) {
    const users = await this.getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, ...user, password: user.password || u.password } : u);
    await this.post('sync', { users: updatedUsers });
  }
  async removeUser(id: string) {
    const users = await this.getUsers();
    await this.post('sync', { users: users.filter(u => u.id !== id) });
  }
}

export const db = new DataService();
