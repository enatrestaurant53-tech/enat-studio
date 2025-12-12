import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Minus, Info } from 'lucide-react';
import { MenuCategory, MenuItem, CartItem, TableLandmark, Order, OrderStatus } from '../types';
import { LANDMARKS, VAT_RATE, SERVICE_FEE_RATE, TRANSLATIONS } from '../constants';
import { db } from '../services/dataService';

export interface GuestMenuProps {
  initialTableId?: string;
  onPlaceOrder: (order: Order) => void;
  lang: 'EN' | 'AM';
  isPhoneOrder?: boolean;
}

export const GuestMenu: React.FC<GuestMenuProps> = ({ initialTableId, onPlaceOrder, lang, isPhoneOrder = false }) => {
  // State
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || '');
  const [activeCategory, setActiveCategory] = useState<MenuCategory>(MenuCategory.STARTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  // Load menu
  useEffect(() => {
    setMenuItems(db.getMenu());
    if (initialTableId && LANDMARKS.find(l => l.id === initialTableId)) {
        setSelectedTableId(initialTableId);
    }
  }, [initialTableId]);

  // Derived state
  const selectedTable = LANDMARKS.find(l => l.id === selectedTableId);
  
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => 
      item.category === activeCategory &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      item.isAvailable
    );
  }, [menuItems, activeCategory, searchQuery]);

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * VAT_RATE;
    const service = subtotal * SERVICE_FEE_RATE;
    return { subtotal, tax, service, total: subtotal + tax + service };
  }, [cart]);

  // Handlers
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const handleCheckout = () => {
    if (!isPhoneOrder && !selectedTable) return alert('Please select a table first!');
    
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      tableId: isPhoneOrder ? 'PHONE' : selectedTable!.id,
      tableName: isPhoneOrder ? t('phoneOrder') : selectedTable!.name,
      items: cart,
      subtotal: cartTotal.subtotal,
      tax: cartTotal.tax,
      serviceFee: cartTotal.service,
      total: cartTotal.total,
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      paymentMethod: isPhoneOrder ? 'CASH' : 'ONLINE',
    };

    db.placeOrder(newOrder);
    setOrderPlaced(newOrder);
    setCart([]);
    setIsCartOpen(false);
    onPlaceOrder(newOrder);
  };

  // Views
  if (!selectedTableId && !isPhoneOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-fade-in">
        <h1 className="text-4xl font-serif text-africa-gold">Karibu to Savanna Eats</h1>
        <p className="text-stone-400 max-w-md">{t('selectLandmark')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
          {LANDMARKS.map(landmark => (
            <button
              key={landmark.id}
              onClick={() => setSelectedTableId(landmark.id)}
              className="group relative overflow-hidden rounded-xl border border-stone-800 hover:border-africa-sunset transition-all text-left bg-stone-800"
            >
              <div className="h-32 w-full overflow-hidden">
                <img src={landmark.imagePlaceholder} alt={landmark.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-africa-sand">{landmark.name}</h3>
                <p className="text-sm text-stone-400 mt-1">{landmark.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-6">
        <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center text-green-400">
          <ShoppingBag size={40} />
        </div>
        <h2 className="text-3xl font-serif text-africa-gold">{t('orderPlaced')}</h2>
        <p className="text-stone-300">
          {isPhoneOrder ? 'Phone order recorded successfully.' : <span>Thank you. Your order for table <span className="text-africa-sunset font-bold">{selectedTable?.name}</span> is being prepared.</span>}
        </p>
        <div className="bg-stone-800 p-6 rounded-lg w-full max-w-md border border-stone-700">
          <h3 className="text-sm text-stone-500 uppercase tracking-widest mb-4">{t('status')}</h3>
          <div className="flex items-center justify-between text-xl font-bold">
            <span className="text-white">#{orderPlaced.id.toUpperCase()}</span>
            <span className="text-africa-sunset animate-pulse">
               {orderPlaced.status}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setOrderPlaced(null)} 
          className="mt-8 text-stone-500 underline hover:text-africa-gold"
        >
          {isPhoneOrder ? 'Place another phone order' : 'Place another order'}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      {!isPhoneOrder && (
        <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-sm border-b border-stone-800 pb-4 pt-2">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-africa-gold">
                      <img src={selectedTable?.imagePlaceholder} className="w-full h-full object-cover" />
                  </div>
                  <div>
                      <h2 className="text-sm text-stone-400 uppercase tracking-wider">{t('table')}</h2>
                      <h1 className="font-serif font-bold text-xl text-africa-sand">{selectedTable?.name}</h1>
                  </div>
              </div>
              <button 
                  onClick={() => setSelectedTableId('')}
                  className="text-xs text-stone-500 hover:text-white"
              >
                  {t('changeTable')}
              </button>
          </div>
        </header>
      )}
      
      {/* Categories (Tabs) */}
      <div className={`flex overflow-x-auto gap-4 pb-2 no-scrollbar ${!isPhoneOrder ? '' : 'pt-4'}`}>
        {Object.values(MenuCategory).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat 
                ? 'bg-africa-sunset text-white shadow-lg shadow-orange-900/50' 
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative my-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
        <input 
          type="text" 
          placeholder={t('search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-stone-800 border-none rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-africa-gold outline-none"
        />
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredItems.map(item => (
          <div key={item.id} className="flex gap-4 bg-stone-800/50 p-4 rounded-xl border border-stone-800 hover:border-stone-700 transition-colors">
            <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-stone-700">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-africa-sand">{item.name}</h3>
                        <span className="font-mono text-africa-gold font-bold">AED {item.price}</span>
                    </div>
                    <p className="text-sm text-stone-400 mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex gap-2 mt-2">
                        {item.tags.map(tag => (
                            <span key={tag} className="text-[10px] uppercase px-2 py-0.5 rounded bg-stone-700 text-stone-300 font-medium">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={() => addToCart(item)}
                    className="self-end mt-2 bg-stone-700 hover:bg-africa-gold text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                >
                    <Plus size={14} /> {t('add')}
                </button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
            <div className="text-center py-10 text-stone-500">
                No items found.
            </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className={`fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50 ${isPhoneOrder ? 'absolute' : 'fixed'}`}>
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-md bg-africa-sunset text-white py-4 rounded-xl shadow-xl shadow-orange-900/40 flex items-center justify-between px-6 hover:bg-orange-500 transition-all transform hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
                <div className="bg-white/20 px-2 py-1 rounded text-sm font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</div>
                <span className="font-medium">{t('viewCart')}</span>
            </div>
            <span className="font-bold text-lg">AED {cartTotal.subtotal}</span>
          </button>
        </div>
      )}

      {/* Cart Modal/Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-stone-900 h-full flex flex-col animate-slide-in-right">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h2 className="text-xl font-serif font-bold text-white">{t('myOrder')}</h2>
                    <button onClick={() => setIsCartOpen(false)} className="text-stone-400 hover:text-white">{t('close')}</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-stone-800 p-3 rounded-lg">
                            <div className="flex-1">
                                <h4 className="font-bold text-stone-200">{item.name}</h4>
                                <p className="text-stone-500 text-xs">AED {item.price}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-stone-700 rounded-lg p-1">
                                <button onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)} className="p-1 hover:text-red-400"><Minus size={14}/></button>
                                <span className="text-sm font-mono w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-green-400"><Plus size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-stone-800 border-t border-stone-700">
                    <div className="space-y-2 text-sm text-stone-400 mb-6">
                        <div className="flex justify-between"><span>{t('subtotal')}</span><span>AED {cartTotal.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>{t('vat')} (5%)</span><span>AED {cartTotal.tax.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>{t('service')} (5%)</span><span>AED {cartTotal.service.toFixed(2)}</span></div>
                        <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-stone-700"><span>{t('total')}</span><span>AED {cartTotal.total.toFixed(2)}</span></div>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        className="w-full bg-africa-sunset hover:bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg transition-colors"
                    >
                        {isPhoneOrder ? t('payCash') : t('payOnline')}
                    </button>
                    {!isPhoneOrder && <p className="text-center text-xs text-stone-500 mt-2 flex items-center justify-center gap-1">
                        <Info size={12} /> Secure PCI-Compliant Payment
                    </p>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};