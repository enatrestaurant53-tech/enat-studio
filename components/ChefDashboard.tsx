
import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';
import { Order, OrderStatus, MenuItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { CheckCircle, Clock, ChefHat, Menu as MenuIcon, Loader2 } from 'lucide-react';

interface ChefDashboardProps {
  lang: 'EN' | 'AM' | 'TI' | 'ES' | 'FR';
}

export const ChefDashboard: React.FC<ChefDashboardProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MENU'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  const refreshData = async () => {
    try {
        const all = await db.getOrders();
        setOrders(all.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED).reverse());
        const m = await db.getMenu();
        setMenu(m);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000); 
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await db.updateOrderStatus(orderId, status);
    refreshData();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await db.updateMenuItem({ ...item, isAvailable: !item.isAvailable });
    refreshData();
  };

  if (isLoading && orders.length === 0) {
    return (
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-africa-sunset" size={40} />
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif text-africa-sand flex items-center gap-3">
          <ChefHat className="text-africa-sunset" /> {t('kitchen')}
        </h2>
        <div className="flex bg-stone-800 rounded-lg p-1">
           <button onClick={() => setActiveTab('ORDERS')} className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'ORDERS' ? 'bg-stone-600 text-white' : 'text-stone-400'}`}>{t('orders')}</button>
           <button onClick={() => setActiveTab('MENU')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 ${activeTab === 'MENU' ? 'bg-stone-600 text-white' : 'text-stone-400'}`}><MenuIcon size={16} /> {t('menu')}</button>
        </div>
      </div>

      {activeTab === 'ORDERS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <div key={order.id} className={`border-l-4 rounded-r-xl bg-stone-800 p-5 shadow-lg ${
              order.status === OrderStatus.PENDING ? 'border-red-500' : 'border-yellow-500'
            }`}>
              <div className="flex justify-between items-start mb-4 border-b border-stone-700 pb-2">
                <div>
                  <h3 className="font-bold text-xl text-white">{order.tableName}</h3>
                  <span className="text-xs text-stone-500 font-mono">#{order.id.substr(0, 6)}</span>
                </div>
                <span className="text-xs text-stone-400">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-start text-sm">
                    <span className="text-stone-200"><span className="font-bold text-africa-gold">{item.quantity}x</span> {item.name}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                {order.status === OrderStatus.PENDING && (
                  <button onClick={() => updateStatus(order.id, OrderStatus.PREPARING)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded font-medium flex justify-center gap-2"><Clock size={18} /> Start</button>
                )}
                {order.status === OrderStatus.PREPARING && (
                  <button onClick={() => updateStatus(order.id, OrderStatus.READY)} className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded font-medium flex justify-center gap-2"><CheckCircle size={18} /> Ready</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {menu.map(item => (
             <div key={item.id} className={`p-4 rounded-lg border flex flex-col justify-between ${item.isAvailable ? 'bg-stone-800 border-stone-700' : 'bg-stone-800/50 border-red-900/50'}`}>
                <h4 className="font-bold text-white text-sm">{item.name}</h4>
                <button onClick={() => toggleAvailability(item)} className={`mt-3 w-full py-2 rounded text-xs font-bold uppercase ${item.isAvailable ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                  {item.isAvailable ? t('inStock') : t('soldOut')}
                </button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};
