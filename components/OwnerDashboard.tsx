import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../services/dataService';
import { Order, Expense } from '../types';
import { TRANSLATIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, FileText, X } from 'lucide-react';

interface OwnerDashboardProps {
  lang: 'EN' | 'AM';
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ lang }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Modals
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  useEffect(() => {
    setOrders(db.getOrders());
    setExpenses(db.getExpenses());
  }, []);

  const stats = useMemo(() => {
    const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const profit = totalSales - totalExpenses;
    return { totalSales, totalExpenses, profit };
  }, [orders, expenses]);

  const chartData = [
    { name: 'Total', sales: stats.totalSales, expenses: stats.totalExpenses },
  ];

  return (
    <div className="space-y-8 pb-10">
      <h2 className="text-3xl font-serif text-africa-sand">{t('owner')} Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-stone-800 p-6 rounded-xl border-t-4 border-green-500">
          <p className="text-stone-400 text-sm uppercase">{t('revenue')}</p>
          <h3 className="text-3xl font-bold text-white mt-2">AED {stats.totalSales.toLocaleString()}</h3>
        </div>
        <div className="bg-stone-800 p-6 rounded-xl border-t-4 border-red-500">
          <p className="text-stone-400 text-sm uppercase">{t('expenses')}</p>
          <h3 className="text-3xl font-bold text-white mt-2">AED {stats.totalExpenses.toLocaleString()}</h3>
        </div>
        <div className="bg-stone-800 p-6 rounded-xl border-t-4 border-africa-gold">
          <p className="text-stone-400 text-sm uppercase">{t('profit')}</p>
          <h3 className={`text-3xl font-bold mt-2 ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            AED {stats.profit.toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-stone-800 p-6 rounded-xl h-96">
        <h3 className="text-lg font-bold text-white mb-6">Financial Performance</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
            <XAxis dataKey="name" stroke="#a8a29e" />
            <YAxis stroke="#a8a29e" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#292524', borderColor: '#44403c', color: '#fff' }} 
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="sales" name={t('revenue')} fill="#15803d" />
            <Bar dataKey="expenses" name={t('expenses')} fill="#b91c1c" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sales List */}
        <div className="bg-stone-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Recent Sales (Receipts)</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {orders.slice().reverse().map(o => (
              <button 
                key={o.id} 
                onClick={() => setViewOrder(o)}
                className="w-full flex justify-between items-center border-b border-stone-700 pb-3 last:border-0 hover:bg-stone-700/50 p-2 rounded transition-colors text-left"
              >
                 <div>
                    <span className="text-white font-medium block">{o.tableName}</span>
                    <span className="text-xs text-stone-500">{new Date(o.timestamp).toLocaleTimeString()} - #{o.id.substr(0,4)}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-africa-gold font-mono">+ AED {o.total.toFixed(0)}</span>
                    <Eye size={16} className="text-stone-500" />
                 </div>
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-stone-800 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-4">Expense Receipts</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {expenses.slice().reverse().map(e => (
              <button 
                key={e.id} 
                onClick={() => setViewExpense(e)}
                className="w-full flex justify-between items-center border-b border-stone-700 pb-3 last:border-0 hover:bg-stone-700/50 p-2 rounded transition-colors text-left"
              >
                 <div className="flex items-center gap-3">
                    {e.receiptImage ? (
                        <div className="w-8 h-8 rounded overflow-hidden bg-stone-900">
                           <img src={e.receiptImage} className="w-full h-full object-cover" />
                        </div>
                    ) : <FileText size={20} className="text-stone-600"/>}
                    <div>
                        <span className="text-white font-medium block">{e.reason}</span>
                        <span className="text-xs text-stone-500">{new Date(e.timestamp).toLocaleDateString()}</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-red-400 font-mono">- AED {e.amount.toFixed(0)}</span>
                    <Eye size={16} className="text-stone-500" />
                 </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-stone-900 w-full max-w-md rounded-xl border border-stone-700 shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800">
                    <h3 className="font-bold text-white">{t('receipts')}: #{viewOrder.id.toUpperCase()}</h3>
                    <button onClick={() => setViewOrder(null)}><X className="text-stone-400 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-serif text-africa-gold">ENAT RESTAURANT</h2>
                        <p className="text-stone-500 text-sm">Dubai, UAE</p>
                    </div>
                    <div className="space-y-2 border-b border-stone-800 pb-4">
                        {viewOrder.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="text-stone-300">{item.quantity}x {item.name}</span>
                                <span className="text-white">AED {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-1 text-sm pt-2">
                        <div className="flex justify-between text-stone-500"><span>{t('subtotal')}</span><span>{viewOrder.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-stone-500"><span>{t('vat')}</span><span>{viewOrder.tax.toFixed(2)}</span></div>
                        <div className="flex justify-between text-stone-500"><span>{t('service')}</span><span>{viewOrder.serviceFee.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-lg text-white mt-2"><span>{t('total')}</span><span>AED {viewOrder.total.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* View Expense Modal */}
      {viewExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-stone-900 w-full max-w-lg rounded-xl border border-stone-700 shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800">
                    <h3 className="font-bold text-white">Expense Receipt</h3>
                    <button onClick={() => setViewExpense(null)}><X className="text-stone-400 hover:text-white" /></button>
                </div>
                <div className="p-6">
                    <div className="mb-4">
                        <span className="text-stone-500 text-xs uppercase">Reason</span>
                        <h2 className="text-xl font-bold text-white">{viewExpense.reason}</h2>
                        <span className="text-stone-500 text-xs uppercase mt-2 block">Amount</span>
                        <h2 className="text-xl font-bold text-red-400">AED {viewExpense.amount}</h2>
                    </div>
                    {viewExpense.receiptImage ? (
                        <div className="w-full h-64 bg-stone-950 rounded-lg overflow-hidden border border-stone-800">
                             <img src={viewExpense.receiptImage} className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-full h-32 bg-stone-800 rounded flex items-center justify-center text-stone-500 italic">
                            No image attached
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};