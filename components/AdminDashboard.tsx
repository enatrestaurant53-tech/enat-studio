import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { db } from '../services/dataService';
import { Expense, Order, MenuItem, OrderStatus, CartItem } from '../types';
import { TRANSLATIONS, VAT_RATE, SERVICE_FEE_RATE } from '../constants';
import { GuestMenu } from './GuestMenu';
import { FileText, DollarSign, Upload, Printer, Phone, Edit as EditIcon, Save, X, Trash2, Plus, Minus } from 'lucide-react';

interface AdminDashboardProps {
  lang: 'EN' | 'AM';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'EXPENSES' | 'MENU' | 'PHONE'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;
  
  // Expense Form State
  const [expenseReason, setExpenseReason] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseImage, setExpenseImage] = useState<string>('');

  // Editing Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [itemToAddId, setItemToAddId] = useState<string>("");

  const refreshData = () => {
    setOrders(db.getOrders().reverse());
    setExpenses(db.getExpenses().reverse());
    setMenu(db.getMenu());
  };

  useEffect(() => {
    refreshData();
  }, [activeTab]); 

  const handlePrintBill = (order: Order) => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SAVANNA EATS", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Dubai, UAE", 105, 28, { align: "center" });
    doc.text(`Table: ${order.tableName}`, 20, 40);
    doc.text(`Order #${order.id.toUpperCase()}`, 20, 48);
    doc.text(`Date: ${new Date(order.timestamp).toLocaleDateString()}`, 150, 48);

    doc.line(20, 55, 190, 55);

    let y = 65;
    order.items.forEach(item => {
      doc.text(`${item.quantity}x ${item.name}`, 20, y);
      doc.text(`AED ${(item.price * item.quantity).toFixed(2)}`, 160, y);
      y += 8;
    });

    doc.line(20, y + 5, 190, y + 5);
    y += 15;

    doc.text(`${t('subtotal')}:`, 120, y);
    doc.text(`AED ${order.subtotal.toFixed(2)}`, 160, y);
    y += 8;
    doc.text(`${t('vat')} (5%):`, 120, y);
    doc.text(`AED ${order.tax.toFixed(2)}`, 160, y);
    y += 8;
    doc.text(`${t('service')} (5%):`, 120, y);
    doc.text(`AED ${order.serviceFee.toFixed(2)}`, 160, y);
    y += 10;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${t('total')}: AED ${order.total.toFixed(2)}`, 120, y);

    doc.save(`Bill_${order.id}.pdf`);
  };

  const handleEditClick = (order: Order) => {
    setEditingOrder(JSON.parse(JSON.stringify(order))); // Deep copy
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

    // Check if exists
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
    
    // Recalculate totals
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExpenseImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAvailability = (item: MenuItem) => {
    db.updateMenuItem({ ...item, isAvailable: !item.isAvailable });
    refreshData();
  };

  return (
    <div className="bg-stone-800 rounded-xl p-6 min-h-[80vh]">
      <div className="flex space-x-4 mb-8 border-b border-stone-700 pb-4 overflow-x-auto">
        <button onClick={() => setActiveTab('ORDERS')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'ORDERS' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}>{t('orders')}</button>
        <button onClick={() => setActiveTab('PHONE')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'PHONE' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}><Phone size={16}/> {t('phoneOrder')}</button>
        <button onClick={() => setActiveTab('EXPENSES')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'EXPENSES' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}>{t('expenses')}</button>
        <button onClick={() => setActiveTab('MENU')} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'MENU' ? 'bg-africa-sunset text-white' : 'text-stone-400 hover:bg-stone-700'}`}>{t('manageMenu')}</button>
      </div>

      {/* Orders View */}
      {activeTab === 'ORDERS' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-300">
            <thead className="bg-stone-900 text-stone-500 uppercase font-mono">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">{t('table')}</th>
                <th className="p-4">{t('status')}</th>
                <th className="p-4">{t('total')}</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-700">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-stone-700/50">
                  <td className="p-4 font-mono">{order.id.substr(0, 6)}</td>
                  <td className="p-4 font-bold text-white">{order.tableName}</td>
                  <td className="p-4 uppercase text-xs font-bold">{order.status}</td>
                  <td className="p-4 text-africa-gold font-bold">AED {order.total.toFixed(2)}</td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => handleEditClick(order)}
                      className="text-stone-400 hover:text-white flex items-center gap-2 border border-stone-600 px-3 py-1 rounded hover:bg-stone-600 transition-colors"
                      title={t('edit')}
                    >
                      <EditIcon size={14} /> {t('edit')}
                    </button>
                    <button 
                      onClick={() => handlePrintBill(order)}
                      className="text-stone-400 hover:text-white flex items-center gap-2 border border-stone-600 px-3 py-1 rounded hover:bg-stone-600 transition-colors"
                      title="Bill"
                    >
                      <Printer size={14} /> Bill
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                   <td colSpan={5} className="p-8 text-center text-stone-500">{t('noOrders')}</td>
                </tr>
              )}
            </tbody>
          </table>
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
                   <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
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

      {/* Menu Management */}
      {activeTab === 'MENU' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {menu.map(item => (
             <div key={item.id} className="bg-stone-900 p-4 rounded-lg border border-stone-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={item.imageUrl} className="w-16 h-16 rounded object-cover opacity-80" />
                  <div>
                    <h4 className="font-bold text-white">{item.name}</h4>
                    <p className="text-xs text-stone-500">{item.category}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleAvailability(item)}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase ${item.isAvailable ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}
                >
                  {item.isAvailable ? t('inStock') : t('soldOut')}
                </button>
             </div>
           ))}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 w-full max-w-2xl rounded-xl border border-stone-700 shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800">
                <h3 className="font-bold text-white flex items-center gap-2"><EditIcon size={18}/> {t('editOrder')} #{editingOrder.id.substr(0, 6)}</h3>
                <button onClick={() => setEditingOrder(null)}><X className="text-stone-400 hover:text-white" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Section */}
              <div>
                <label className="block text-xs text-stone-500 uppercase mb-2">{t('status')}</label>
                <div className="flex gap-2">
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
    </div>
  );
};