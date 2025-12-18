
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { db } from '../services/dataService';
import { printerService } from '../services/printerService';
import { Expense, Order, MenuItem, OrderStatus, CartItem, WaiterCall, TableInfo } from '../types';
import { TRANSLATIONS, VAT_RATE, SERVICE_FEE_RATE } from '../constants';
import { GuestMenu } from './GuestMenu';
import { FileText, DollarSign, Upload, Printer, Phone, Edit as EditIcon, Save, X, Trash2, Plus, Minus, Bell, CheckCircle, Image as ImageIcon, FolderOpen, Banknote, Download } from 'lucide-react';

interface AdminDashboardProps {
  lang: 'EN' | 'AM' | 'TI' | 'ES' | 'FR';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'EXPENSES' | 'MENU' | 'PHONE' | 'SERVICE'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Dynamic Data
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [restaurantName, setRestaurantName] = useState('Enat Restaurant');
  const [restaurantLocation, setRestaurantLocation] = useState('Dubai, UAE');

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;
  
  // Expense Form State
  const [expenseReason, setExpenseReason] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseImage, setExpenseImage] = useState<string>('');

  // Editing Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [itemToAddId, setItemToAddId] = useState<string>("");

  // Menu Management State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [menuItemForm, setMenuItemForm] = useState<Partial<MenuItem>>({
      name: '', description: '', price: 0, category: '', imageUrl: '', tags: []
  });
  const [isEditingMenu, setIsEditingMenu] = useState(false);

  // Category Management State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ old: string, current: string } | null>(null);

  const refreshData = async () => {
    // Fix: db methods return Promises, must be awaited
    const fetchedOrdersRaw = await db.getOrders();
    const fetchedOrders = fetchedOrdersRaw.map(o => ({
        ...o,
        paymentStatus: o.paymentStatus || 'UNPAID' // Migration fallback
    })).reverse();
    setOrders(fetchedOrders);
    
    const fetchedExpenses = await db.getExpenses();
    setExpenses(fetchedExpenses.reverse());
    
    setMenu(await db.getMenu());
    setCategories(await db.getCategories());
    
    const fetchedCalls = await db.getWaiterCalls();
    setWaiterCalls(fetchedCalls.filter(c => c.status === 'PENDING').reverse());
    
    setTables(await db.getTables());
    
    const settings = await db.getSystemSettings();
    setRestaurantName(settings.restaurantName);
    setRestaurantLocation(settings.restaurantLocation);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); 
    return () => clearInterval(interval);
  }, [activeTab]); 

  // --- Handlers for Order, Expense etc. ---
  
  const generatePDF = (orderList: Order[], title: string = "Bill") => {
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(restaurantName.toUpperCase(), 105, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(restaurantLocation, 105, y, { align: "center" });
    y += 15;

    // Calculate Aggregates
    let aggSubtotal = 0;
    let aggTax = 0;
    let aggService = 0;
    let aggTotal = 0;

    orderList.forEach(o => {
        aggSubtotal += o.subtotal;
        aggTax += o.tax;
        aggService += o.serviceFee;
        aggTotal += o.total;
    });

    // Combined or Single Info
    if (orderList.length > 1) {
        doc.text(`Combined Bill (${orderList.length} Orders)`, 20, y);
    } else {
        const o = orderList[0];
        doc.text(`Table: ${o.tableName}`, 20, y);
        doc.text(`Order #${o.id.substr(0, 6).toUpperCase()}`, 150, y, { align: "right" });
    }
    y += 10;
    doc.line(20, y, 190, y);
    y += 10;

    orderList.forEach((order) => {
        if (orderList.length > 1) {
            doc.setFont("helvetica", "bold");
            doc.text(`Order #${order.id.substr(0, 6)} - ${order.tableName}`, 20, y);
            y += 6;
            doc.setFont("helvetica", "normal");
        }

        order.items.forEach(item => {
            doc.text(`${item.quantity}x ${item.name}`, 20, y);
            doc.text(`AED ${(item.price * item.quantity).toFixed(2)}`, 190, y, { align: "right" });
            y += 6;
        });
        
        // Add spacing between orders
        if (orderList.length > 1) {
             y += 4;
        }
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    // Totals Section (Always show breakdown)
    doc.setFont("helvetica", "normal");
    doc.text(`${t('subtotal')}:`, 140, y);
    doc.text(`AED ${aggSubtotal.toFixed(2)}`, 190, y, { align: "right" });
    y += 6;
    
    doc.text(`${t('vat')} (${(VAT_RATE * 100).toFixed(0)}%):`, 140, y);
    doc.text(`AED ${aggTax.toFixed(2)}`, 190, y, { align: "right" });
    y += 6;

    doc.text(`${t('service')} (${(SERVICE_FEE_RATE * 100).toFixed(0)}%):`, 140, y);
    doc.text(`AED ${aggService.toFixed(2)}`, 190, y, { align: "right" });
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${t('total')}:`, 140, y);
    doc.text(`AED ${aggTotal.toFixed(2)}`, 190, y, { align: "right" });
    
    doc.save(`${title}_${Date.now()}.pdf`);
  };

  const handlePrintBill = async (order: Order) => {
      try {
          await printerService.printReceipt(order);
          // Optional: Show success notification
      } catch (err: any) {
          alert("Print Failed: " + err.message + "\nFallback to PDF download?");
          generatePDF([order], `Bill_${order.id}`);
      }
  };

  const handleDownloadPDF = (order: Order) => {
      generatePDF([order], `Bill_${order.id}`);
  };

  const handlePrintCombined = () => {
      const selected = orders.filter(o => selectedOrderIds.includes(o.id));
      if (selected.length === 0) return;
      
      // For combined, mostly PDF is better for records, but let's allow physical print loop
      if (window.confirm(`Print ${selected.length} separate receipts to thermal printer? Cancel to download Combined PDF.`)) {
          selected.forEach(o => handlePrintBill(o));
      } else {
          generatePDF(selected, "Combined_Bill");
      }
      setSelectedOrderIds([]); // Clear selection after print
  };

  const toggleOrderSelection = (id: string) => {
      setSelectedOrderIds(prev => 
        prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
      );
  };

  const handleMarkPaid = (order: Order) => {
      const updated = { ...order, paymentStatus: 'PAID' as const };
      db.updateOrder(updated);
      refreshData();
  };

  const handleEditClick = (order: Order) => {
    setEditingOrder(JSON.parse(JSON.stringify(order))); 
    setItemToAddId("");
  };

  const updateEditItemQuantity = (itemId: string, delta: number) => {
    if (!editingOrder) return;
    const updatedItems = editingOrder.items.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    setEditingOrder({ ...editingOrder, items: updatedItems });
  };

  const removeEditItem = (itemId: string) => {
    if (!editingOrder) return;
    const updatedItems = editingOrder.items.filter(item => item.id !== itemId);
    setEditingOrder({ ...editingOrder, items: updatedItems });
  };

  const addEditItem = () => {
    if (!editingOrder || !itemToAddId) return;
    const menuItem = menu.find(m => m.id === itemToAddId);
    if (!menuItem) return;
    const existing = editingOrder.items.find(i => i.id === itemToAddId);
    if (existing) {
      updateEditItemQuantity(itemToAddId, 1);
    } else {
      const newItem: CartItem = { ...menuItem, quantity: 1 };
      setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
    }
    setItemToAddId("");
  };

  const saveOrderChanges = () => {
    if (!editingOrder) return;
    const subtotal = editingOrder.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * VAT_RATE;
    const service = subtotal * SERVICE_FEE_RATE;
    const total = subtotal + tax + service;
    const finalOrder = { ...editingOrder, subtotal, tax, serviceFee: service, total };
    db.updateOrder(finalOrder);
    setEditingOrder(null);
    refreshData();
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseReason || !expenseAmount) return;
    db.addExpense({
      id: Math.random().toString(36).substr(2, 9),
      reason: expenseReason,
      amount: parseFloat(expenseAmount),
      receiptImage: expenseImage,
      timestamp: Date.now(),
      submittedBy: 'Admin'
    });
    setExpenseReason('');
    setExpenseAmount('');
    setExpenseImage('');
    refreshData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resolveCall = (id: string) => {
    db.resolveWaiterCall(id);
    refreshData();
  };

  // --- Category Management Handlers ---

  const handleAddCategory = async () => {
      if (newCategoryName.trim()) {
          await db.addCategory(newCategoryName);
          setNewCategoryName('');
          refreshData();
      }
  };

  const handleDeleteCategory = async (cat: string) => {
      if (window.confirm(`Delete category "${cat}"? Items in this category will remain but will not have a category assigned in the dashboard.`)) {
          await db.removeCategory(cat);
          refreshData();
      }
  };

  const startEditCategory = (cat: string) => {
      setEditingCategory({ old: cat, current: cat });
  };

  const saveEditCategory = async () => {
      if (editingCategory && editingCategory.current.trim()) {
          await db.renameCategory(editingCategory.old, editingCategory.current);
          setEditingCategory(null);
          refreshData();
      }
  };

  // --- Menu Management Handlers ---

  const handleAddMenuClick = () => {
      setMenuItemForm({
          name: '', description: '', price: 0, category: categories[0] || '', imageUrl: '', tags: [], isAvailable: true
      });
      setIsEditingMenu(false);
      setIsMenuModalOpen(true);
  };

  const handleEditMenuClick = (item: MenuItem) => {
      setMenuItemForm({ ...item });
      setIsEditingMenu(true);
      setIsMenuModalOpen(true);
  };

  const handleDeleteMenuClick = async (id: string) => {
      if (window.confirm("Are you sure you want to delete this item?")) {
          await db.deleteMenuItem(id);
          refreshData();
      }
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!menuItemForm.name || !menuItemForm.price || !menuItemForm.category) return;
      
      const item: MenuItem = {
          id: isEditingMenu ? menuItemForm.id! : Math.random().toString(36).substr(2, 9),
          name: menuItemForm.name,
          description: menuItemForm.description || '',
          price: Number(menuItemForm.price),
          category: menuItemForm.category,
          imageUrl: menuItemForm.imageUrl || 'https://via.placeholder.com/200',
          isAvailable: menuItemForm.isAvailable ?? true,
          tags: menuItemForm.tags || [],
          allergens: []
      };

      if (isEditingMenu) {
          await db.updateMenuItem(item);
      } else {
          await db.addMenuItem(item);
      }
      setIsMenuModalOpen(false);
      refreshData();
  };

  return (
    <div className="bg-stone-800 rounded-xl p-6 min-h-[80vh]">
      <div className="flex space-x-4 mb-8 border-b border-stone-700 pb-4 overflow-x-auto">
        <button onClick={() => setActiveTab('ORDERS')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'ORDERS' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}>{t('orders')}</button>
        <button onClick={() => setActiveTab('PHONE')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'PHONE' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}><Phone size={16}/> {t('phoneOrder')}</button>
        <button onClick={() => setActiveTab('SERVICE')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'SERVICE' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}>
          <Bell size={16}/> {t('serviceRequests')}
          {waiterCalls.length > 0 && <span className="bg-red-500 text-white text-xs px-2 rounded-full">{waiterCalls.length}</span>}
        </button>
        <button onClick={() => setActiveTab('EXPENSES')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'EXPENSES' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}>{t('expenses')}</button>
        <button onClick={() => setActiveTab('MENU')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'MENU' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}>{t('manageMenu')}</button>
      </div>

      {/* Orders View */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
            {/* Action Bar */}
            {selectedOrderIds.length > 0 && (
                <div className="bg-africa-sunset/10 border border-africa-sunset p-3 rounded-lg flex justify-between items-center animate-fade-in">
                    <span className="text-africa-gold font-bold">{selectedOrderIds.length} {t('selected')}</span>
                    <button 
                        onClick={handlePrintCombined}
                        className="bg-africa-sunset hover:bg-orange-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2"
                    >
                        <Printer size={16} /> {t('printCombined')}
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
                <thead className="bg-stone-900 text-stone-500 uppercase font-mono">
                <tr>
                    <th className="p-4 w-10">
                        <input 
                            type="checkbox" 
                            onChange={(e) => setSelectedOrderIds(e.target.checked ? orders.map(o => o.id) : [])}
                            checked={selectedOrderIds.length === orders.length && orders.length > 0}
                            className="rounded border-stone-600 bg-stone-800"
                        />
                    </th>
                    <th className="p-4">ID</th>
                    <th className="p-4">{t('table')}</th>
                    <th className="p-4">{t('status')}</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">{t('total')}</th>
                    <th className="p-4">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-stone-700">
                {orders.map(order => (
                    <tr key={order.id} className="hover:bg-stone-700/50">
                    <td className="p-4">
                        <input 
                            type="checkbox" 
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="rounded border-stone-600 bg-stone-800 accent-africa-sunset"
                        />
                    </td>
                    <td className="p-4 font-mono">{order.id.substr(0, 6)}</td>
                    <td className="p-4 font-bold text-white">{order.tableName}</td>
                    <td className="p-4 uppercase text-xs font-bold">{order.status}</td>
                    <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${order.paymentStatus === 'PAID' ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-red-900/30 border-red-800 text-red-400'}`}>
                            {order.paymentStatus || 'UNPAID'}
                        </span>
                    </td>
                    <td className="p-4 text-africa-gold font-bold">AED {order.total.toFixed(2)}</td>
                    <td className="p-4 flex gap-2">
                        {order.paymentStatus !== 'PAID' && (
                            <button 
                            onClick={() => handleMarkPaid(order)}
                            className="text-green-400 hover:text-white flex items-center gap-2 border border-green-800 bg-green-900/20 px-3 py-1 rounded hover:bg-green-800 transition-colors"
                            title={t('markPaid')}
                            >
                            <Banknote size={14} /> Pay
                            </button>
                        )}
                        <button 
                        onClick={() => handleEditClick(order)}
                        className="text-stone-400 hover:text-white flex items-center gap-2 border border-stone-600 px-3 py-1 rounded hover:bg-stone-600 transition-colors"
                        title={t('edit')}
                        >
                        <EditIcon size={14} />
                        </button>
                        <button 
                        onClick={() => handlePrintBill(order)}
                        className="text-stone-400 hover:text-white flex items-center gap-2 border border-stone-600 px-3 py-1 rounded hover:bg-stone-600 transition-colors"
                        title="Print"
                        >
                        <Printer size={14} />
                        </button>
                        <button 
                        onClick={() => handleDownloadPDF(order)}
                        className="text-stone-400 hover:text-white flex items-center gap-2 border border-stone-600 px-3 py-1 rounded hover:bg-stone-600 transition-colors"
                        title="Download PDF"
                        >
                        <Download size={14} />
                        </button>
                    </td>
                    </tr>
                ))}
                {orders.length === 0 && (
                    <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-500">{t('noOrders')}</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      )}

      {/* Phone Order View */}
      {activeTab === 'PHONE' && (
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-700 min-h-[600px]">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Phone size={20} className="text-africa-gold" /> {t('placeOrder')}</h3>
          <div className="bg-stone-800 rounded-lg p-4">
             <GuestMenu 
               isPhoneOrder={true} 
               lang={lang} 
               onPlaceOrder={() => {
                 setTimeout(() => setActiveTab('ORDERS'), 2000);
               }} 
             />
          </div>
        </div>
      )}

      {/* Service / Waiter Calls View */}
      {activeTab === 'SERVICE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {waiterCalls.map(call => (
             <div key={call.id} className="bg-stone-900 border border-red-500/50 p-6 rounded-xl shadow-lg animate-pulse flex flex-col justify-between">
                <div>
                   <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                     <Bell size={20} className="text-red-500"/> {call.tableName}
                   </h3>
                   <p className="text-stone-400 text-sm mb-4">Requesting assistance</p>
                   <p className="text-xs text-stone-500">{new Date(call.timestamp).toLocaleTimeString()}</p>
                </div>
                <button 
                  onClick={() => resolveCall(call.id)}
                  className="mt-4 w-full bg-stone-700 hover:bg-green-700 text-white py-2 rounded font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle size={16} /> {t('markResolved')}
                </button>
             </div>
           ))}
           {waiterCalls.length === 0 && (
             <div className="col-span-full py-20 text-center text-stone-500 border border-dashed border-stone-700 rounded-xl">
               <Bell size={48} className="mx-auto mb-4 opacity-20" />
               <p>{t('noServiceRequests')}</p>
             </div>
           )}
        </div>
      )}

      {/* Expenses View */}
      {activeTab === 'EXPENSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-stone-900 p-6 rounded-xl border border-stone-700 h-fit">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><DollarSign size={20} /> {t('add')} {t('expenses')}</h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Reason</label>
                <input required type="text" value={expenseReason} onChange={e => setExpenseReason(e.target.value)} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Amount (AED)</label>
                <input required type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Receipt Image</label>
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-stone-600 rounded cursor-pointer hover:border-africa-gold">
                   {expenseImage ? <img src={expenseImage} className="h-full object-contain" /> : <div className="text-stone-500 flex flex-col items-center"><Upload size={20} /><span className="text-xs mt-1">Upload</span></div>}
                   <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setExpenseImage)} />
                </label>
              </div>
              <button type="submit" className="w-full bg-africa-sunset text-white py-2 rounded font-bold hover:bg-orange-500">{t('add')}</button>
            </form>
          </div>
          <div className="lg:col-span-2 space-y-4">
             {expenses.map(exp => (
               <div key={exp.id} className="flex items-center justify-between bg-stone-900 p-4 rounded-lg border border-stone-700">
                  <div className="flex items-center gap-4">
                    {exp.receiptImage ? (
                      <img src={exp.receiptImage} className="w-12 h-12 object-cover rounded bg-stone-800" />
                    ) : <div className="w-12 h-12 bg-stone-800 rounded flex items-center justify-center"><FileText size={20} className="text-stone-600"/></div>}
                    <div>
                      <h4 className="font-bold text-white">{exp.reason}</h4>
                      <p className="text-xs text-stone-500">{new Date(exp.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-xl font-mono text-red-400 font-bold">- AED {exp.amount}</span>
               </div>
             ))}
             {expenses.length === 0 && <div className="text-stone-500 text-center py-10">{t('noExpenses')}</div>}
          </div>
        </div>
      )}

      {/* Menu Management - Updated */}
      {activeTab === 'MENU' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">{t('manageMenu')}</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-stone-700 hover:bg-stone-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2"
                    >
                        <FolderOpen size={16}/> Manage Categories
                    </button>
                    <button 
                        onClick={handleAddMenuClick}
                        className="bg-africa-sunset hover:bg-orange-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2"
                    >
                        <Plus size={16}/> {t('addItem')}
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menu.map(item => (
                    <div key={item.id} className="bg-stone-900 p-4 rounded-lg border border-stone-700 flex flex-col justify-between">
                        <div className="flex items-start gap-3 mb-4">
                            <img src={item.imageUrl} className="w-20 h-20 rounded object-cover bg-stone-800" />
                            <div>
                                <h4 className="font-bold text-white">{item.name}</h4>
                                <p className="text-xs text-africa-gold font-bold mb-1">{item.category}</p>
                                <p className="text-sm text-stone-400">AED {item.price}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-stone-800 pt-3">
                            <button 
                                onClick={() => handleEditMenuClick(item)} 
                                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-600 text-xs font-bold flex items-center gap-1"
                            >
                                <EditIcon size={12}/> {t('edit')}
                            </button>
                            <button 
                                onClick={() => handleDeleteMenuClick(item.id)}
                                className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-900/50 text-xs font-bold flex items-center gap-1"
                            >
                                <Trash2 size={12}/> {t('remove')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Edit Order Modal (Existing + Table Change) */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 w-full max-w-2xl rounded-xl border border-stone-700 shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800">
                <h3 className="font-bold text-white flex items-center gap-2"><EditIcon size={18}/> {t('editOrder')} #{editingOrder.id.substr(0, 6)}</h3>
                <button onClick={() => setEditingOrder(null)}><X className="text-stone-400 hover:text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Table Selection */}
              <div>
                  <label className="block text-xs text-stone-500 uppercase mb-2">{t('table')}</label>
                  <select 
                      value={editingOrder.tableId}
                      onChange={(e) => {
                          const table = tables.find(t => t.id === e.target.value);
                          if(table) {
                              setEditingOrder({ ...editingOrder, tableId: table.id, tableName: table.name });
                          }
                      }}
                      className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white outline-none focus:border-africa-gold"
                  >
                      {tables.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                      <option value="PHONE">{t('phoneOrder')}</option>
                  </select>
              </div>

              {/* Status Section */}
              <div>
                <label className="block text-xs text-stone-500 uppercase mb-2">{t('status')}</label>
                <div className="flex gap-2 flex-wrap">
                  {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED].map(status => (
                    <button
                      key={status}
                      onClick={() => setEditingOrder({ ...editingOrder, status })}
                      className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                        editingOrder.status === status 
                        ? 'bg-africa-gold border-africa-gold text-white' 
                        : 'border-stone-600 text-stone-400 hover:border-stone-500'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Items Section */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-stone-500 uppercase">{t('items')}</label>
                 </div>
                 <div className="space-y-2 bg-stone-950/30 p-2 rounded-lg">
                    {editingOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-stone-800 p-3 rounded border border-stone-700">
                         <div className="flex-1">
                            <h4 className="font-bold text-sm text-white">{item.name}</h4>
                            <span className="text-xs text-stone-500">AED {item.price}</span>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-stone-700 rounded p-1">
                               <button onClick={() => updateEditItemQuantity(item.id, -1)} className="p-1 hover:text-red-400"><Minus size={14}/></button>
                               <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                               <button onClick={() => updateEditItemQuantity(item.id, 1)} className="p-1 hover:text-green-400"><Plus size={14}/></button>
                            </div>
                            <span className="font-mono font-bold text-sm min-w-[60px] text-right">AED {(item.price * item.quantity).toFixed(0)}</span>
                            <button onClick={() => removeEditItem(item.id)} className="text-stone-500 hover:text-red-500"><Trash2 size={16}/></button>
                         </div>
                      </div>
                    ))}
                    {editingOrder.items.length === 0 && <p className="text-stone-500 text-sm italic p-2">No items in order.</p>}
                 </div>
              </div>
              {/* Add Item Section */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                   <label className="block text-xs text-stone-500 uppercase mb-1">{t('addItem')}</label>
                   <select 
                     value={itemToAddId} 
                     onChange={(e) => setItemToAddId(e.target.value)}
                     className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white text-sm outline-none focus:border-africa-gold"
                   >
                     <option value="">Select item...</option>
                     {menu.map(m => (
                       <option key={m.id} value={m.id}>{m.name} - AED {m.price}</option>
                     ))}
                   </select>
                </div>
                <button 
                  onClick={addEditItem} 
                  disabled={!itemToAddId}
                  className="bg-stone-700 hover:bg-stone-600 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
                >
                  {t('add')}
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-stone-700 bg-stone-800 flex justify-between items-center">
              <div className="text-right flex-1 pr-6">
                <span className="text-xs text-stone-500 uppercase block">{t('total')}</span>
                <span className="text-xl font-bold text-africa-gold">
                   AED {(editingOrder.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) * (1 + VAT_RATE + SERVICE_FEE_RATE)).toFixed(2)}
                </span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingOrder(null)} 
                  className="px-4 py-2 rounded text-stone-400 hover:text-white font-medium"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={saveOrderChanges} 
                  className="px-6 py-2 bg-africa-sunset hover:bg-orange-600 text-white rounded font-bold flex items-center gap-2"
                >
                  <Save size={16} /> {t('saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-stone-900 w-full max-w-lg rounded-xl border border-stone-700 shadow-2xl animate-fade-in flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800">
                      <h3 className="font-bold text-white text-lg flex items-center gap-2"><FolderOpen size={18}/> Manage Categories</h3>
                      <button onClick={() => setIsCategoryModalOpen(false)}><X className="text-stone-400 hover:text-white" /></button>
                  </div>
                  
                  <div className="p-4 border-b border-stone-700 bg-stone-800/50">
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              value={newCategoryName}
                              onChange={e => setNewCategoryName(e.target.value)}
                              placeholder="New Category Name..."
                              className="flex-1 bg-stone-900 border border-stone-600 rounded p-2 text-white text-sm"
                          />
                          <button 
                              onClick={handleAddCategory}
                              className="bg-africa-sunset hover:bg-orange-600 text-white px-4 py-2 rounded font-bold text-sm"
                          >
                              Add
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {categories.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-stone-800 p-3 rounded border border-stone-700">
                              {editingCategory?.old === cat ? (
                                  <div className="flex gap-2 flex-1 mr-2">
                                      <input 
                                          autoFocus
                                          type="text"
                                          value={editingCategory.current}
                                          onChange={e => setEditingCategory({ ...editingCategory, current: e.target.value })}
                                          className="flex-1 bg-stone-900 border border-stone-500 rounded px-2 py-1 text-white text-sm"
                                      />
                                      <button onClick={saveEditCategory} className="text-green-400 hover:bg-stone-700 p-1 rounded"><CheckCircle size={16}/></button>
                                      <button onClick={() => setEditingCategory(null)} className="text-stone-400 hover:bg-stone-700 p-1 rounded"><X size={16}/></button>
                                  </div>
                              ) : (
                                  <>
                                      <span className="text-white font-medium">{cat}</span>
                                      <div className="flex gap-2">
                                          <button onClick={() => startEditCategory(cat)} className="text-stone-400 hover:text-white p-1 hover:bg-stone-700 rounded" title="Rename"><EditIcon size={14}/></button>
                                          <button onClick={() => handleDeleteCategory(cat)} className="text-stone-400 hover:text-red-400 p-1 hover:bg-stone-700 rounded" title="Delete"><Trash2 size={14}/></button>
                                      </div>
                                  </>
                              )}
                          </div>
                      ))}
                      {categories.length === 0 && <p className="text-stone-500 text-center italic">No categories found.</p>}
                  </div>
                  
                  <div className="p-4 border-t border-stone-700 bg-stone-800 text-right">
                       <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded text-sm">Close</button>
                  </div>
              </div>
          </div>
      )}

      {/* Menu Item Modal */}
      {isMenuModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-stone-900 w-full max-w-lg rounded-xl border border-stone-700 shadow-2xl animate-fade-in">
                  <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800 rounded-t-xl">
                      <h3 className="font-bold text-white text-lg">{isEditingMenu ? 'Edit Menu Item' : 'Add New Item'}</h3>
                      <button onClick={() => setIsMenuModalOpen(false)}><X className="text-stone-400 hover:text-white" /></button>
                  </div>
                  <form onSubmit={handleMenuSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="text-xs text-stone-500 block mb-1">Name</label>
                              <input 
                                  required 
                                  value={menuItemForm.name} 
                                  onChange={e => setMenuItemForm({...menuItemForm, name: e.target.value})}
                                  className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" 
                              />
                          </div>
                          <div>
                              <label className="text-xs text-stone-500 block mb-1">Price (AED)</label>
                              <input 
                                  required type="number" step="0.5"
                                  value={menuItemForm.price} 
                                  onChange={e => setMenuItemForm({...menuItemForm, price: Number(e.target.value)})}
                                  className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" 
                              />
                          </div>
                          <div>
                              <label className="text-xs text-stone-500 block mb-1">Category</label>
                              <select
                                  required
                                  value={menuItemForm.category}
                                  onChange={e => setMenuItemForm({...menuItemForm, category: e.target.value})}
                                  className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white"
                              >
                                  <option value="" disabled>Select Category</option>
                                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div className="col-span-2">
                              <label className="text-xs text-stone-500 block mb-1">Description</label>
                              <textarea 
                                  value={menuItemForm.description} 
                                  onChange={e => setMenuItemForm({...menuItemForm, description: e.target.value})}
                                  className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white h-20" 
                              />
                          </div>
                          <div className="col-span-2">
                              <label className="text-xs text-stone-500 block mb-1">Image (URL or Upload)</label>
                              <div className="flex gap-2">
                                  <input 
                                      type="text" 
                                      value={menuItemForm.imageUrl}
                                      onChange={e => setMenuItemForm({...menuItemForm, imageUrl: e.target.value})}
                                      placeholder="https://..."
                                      className="flex-1 bg-stone-800 border border-stone-600 rounded p-2 text-white text-sm" 
                                  />
                                  <label className="bg-stone-700 hover:bg-stone-600 px-3 py-2 rounded cursor-pointer border border-stone-600">
                                      <Upload size={18} className="text-stone-300"/>
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setMenuItemForm({...menuItemForm, imageUrl: url}))} />
                                  </label>
                              </div>
                              {menuItemForm.imageUrl && (
                                  <div className="mt-2 w-full h-32 bg-stone-950 rounded overflow-hidden border border-stone-800 relative group">
                                      <img src={menuItemForm.imageUrl} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <ImageIcon className="text-white" size={24}/>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                          <button 
                              type="button"
                              onClick={() => setIsMenuModalOpen(false)} 
                              className="px-4 py-2 rounded text-stone-400 hover:text-white"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="px-6 py-2 bg-africa-sunset hover:bg-orange-600 text-white rounded font-bold"
                          >
                              {isEditingMenu ? 'Update Item' : 'Create Item'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
