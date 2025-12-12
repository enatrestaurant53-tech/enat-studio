import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';
import { Order, OrderStatus, MenuItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { CheckCircle, Clock, ChefHat, Menu as MenuIcon } from 'lucide-react';

interface ChefDashboardProps {
  lang: 'EN' | 'AM';
}

export const ChefDashboard: React.FC<ChefDashboardProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'MENU'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  const refreshData = () => {
    const all = db.getOrders();
    setOrders(all.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED).reverse());
    setMenu(db.getMenu());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const updateStatus = (orderId: string, status: OrderStatus) => {
    db.updateOrderStatus(orderId, status);
    refreshData();
  };

  const toggleAvailability = (item: MenuItem) => {
    db.updateMenuItem({ ...item, isAvailable: !item.isAvailable });
    refreshData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif text-africa-sand flex items-center gap-3">
          <ChefHat className="text-africa-sunset" /> {t('kitchen')}
        </h2>
        
        <div className="flex bg-stone-800 rounded-lg p-1">
           <button 
             onClick={() => setActiveTab('ORDERS')} 
             className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'ORDERS' ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'}`}
           >
             {t('orders')}
           </button>
           <button 
             onClick={() => setActiveTab('MENU')} 
             className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 ${activeTab === 'MENU' ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'}`}
           >
             <MenuIcon size={16} /> {t('menu')}
           </button>
        </div>
      </div>

      {activeTab === 'ORDERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {orders.map(order => (
            <div key={order.id} className={`border-l-4 rounded-r-xl bg-stone-800 p-5 shadow-lg ${
              order.status === OrderStatus.PENDING ? 'border-red-500' : 
              order.status === OrderStatus.PREPARING ? 'border-yellow-500' : 'border-green-500'
            }`}>
              <div className="flex justify-between items-start mb-4 border-b border-stone-700 pb-2">
                <div>
                  <h3 className="font-bold text-xl text-white">{order.tableName}</h3>
                  <span className="text-xs text-stone-500 font-mono">#{order.id}</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-stone-400">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className={`text-xs font-bold uppercase ${
                      order.status === OrderStatus.PENDING ? 'text-red-400' : 
                      order.status === OrderStatus.PREPARING ? 'text-yellow-400' : 'text-green-400'
                  }`}>{t(order.status.toLowerCase() as any) || order.status}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-start text-sm">
                    <span className="text-stone-200"><span className="font-bold text-africa-gold">{item.quantity}x</span> {item.name}</span>
                    {item.notes && <span className="block text-xs text-stone-500 italic ml-2">{item.notes}</span>}
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                {order.status === OrderStatus.PENDING && (
                  <button 
                    onClick={() => updateStatus(order.id, OrderStatus.PREPARING)}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded font-medium flex justify-center gap-2"
                  >
                    <Clock size={18} /> Start
                  </button>
                )}
                {order.status === OrderStatus.PREPARING && (
                  <button 
                    onClick={() => updateStatus(order.id, OrderStatus.READY)}
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded font-medium flex justify-center gap-2"
                  >
                    <CheckCircle size={18} /> Ready
                  </button>
                )}
                {order.status === OrderStatus.READY && (
                  <button 
                    onClick={() => updateStatus(order.id, OrderStatus.COMPLETED)}
                    className="flex-1 bg-stone-600 hover:bg-stone-500 text-white py-2 rounded font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-stone-500 bg-stone-800/30 rounded-xl border border-dashed border-stone-700">
              <ChefHat size={48} className="mb-4 opacity-20" />
              <p>{t('noOrders')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'MENU' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
           {menu.map(item => (
             <div key={item.id} className={`p-4 rounded-lg border flex flex-col justify-between h-full ${item.isAvailable ? 'bg-stone-800 border-stone-700' : 'bg-stone-800/50 border-red-900/50 opacity-75'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-16 h-16 rounded overflow-hidden bg-stone-700 shrink-0">
                     <img src={item.imageUrl} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm leading-tight">{item.name}</h4>
                    <p className="text-xs text-stone-500 mt-1">{item.category}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleAvailability(item)}
                  className={`w-full py-2 rounded text-xs font-bold uppercase transition-colors ${
                    item.isAvailable 
                    ? 'bg-green-900/40 text-green-400 border border-green-800 hover:bg-green-900' 
                    : 'bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900'
                  }`}
                >
                  {item.isAvailable ? t('inStock') : t('soldOut')}
                </button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};