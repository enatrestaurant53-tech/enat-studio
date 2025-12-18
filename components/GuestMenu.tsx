
import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Minus, Bell, ChevronLeft, ChevronRight, Check, Sparkles, Flame, Leaf, Utensils, ArrowRight, Coffee, MapPin } from 'lucide-react';
import { MenuCategory, MenuItem, CartItem, Order, OrderStatus, TableInfo, TableMode } from '../types';
import { VAT_RATE, SERVICE_FEE_RATE, TRANSLATIONS } from '../constants';
import { db } from '../services/dataService';

export interface GuestMenuProps {
  initialTableId?: string;
  onPlaceOrder: (order: Order) => void;
  lang: 'EN' | 'AM' | 'TI' | 'ES' | 'FR';
  isPhoneOrder?: boolean;
}

// Background floating elements component
const FloatingIngredients = () => {
  const icons = [Flame, Leaf, Utensils, Sparkles];
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      Icon: icons[i % icons.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${10 + Math.random() * 20}s`,
      size: 16 + Math.random() * 24,
      opacity: 0.1 + Math.random() * 0.2,
    }));
  }, [icons]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-bounce text-africa-gold"
          style={{
            left: p.left,
            top: p.top,
            opacity: p.opacity,
            animation: `float ${p.duration} infinite ease-in-out`,
            animationDelay: p.delay,
          }}
        >
          <p.Icon size={p.size} />
        </div>
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
};

const getCategoryIcon = (cat: string) => {
  const lower = cat.toLowerCase();
  if (lower.includes('starter') || lower.includes('soup')) return Flame;
  if (lower.includes('main') || lower.includes('rice')) return Utensils;
  if (lower.includes('side') || lower.includes('grain')) return Leaf;
  if (lower.includes('dessert') || lower.includes('sweet')) return Sparkles;
  if (lower.includes('drink') || lower.includes('beverage')) return Coffee;
  return Utensils;
};

export const GuestMenu: React.FC<GuestMenuProps> = ({ initialTableId, onPlaceOrder, lang, isPhoneOrder = false }) => {
  // State
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || '');
  const [activeCategory, setActiveCategory] = useState<string>(MenuCategory.STARTERS); 
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);
  const [waiterCalled, setWaiterCalled] = useState(false);
  
  // Dynamic Config State
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [restaurantName, setRestaurantName] = useState('Enat');
  const [tableMode, setTableMode] = useState<TableMode>('WHEEL');
  
  // Wheel State
  const [wheelRotation, setWheelRotation] = useState(0);
  const [activeWheelIndex, setActiveWheelIndex] = useState(0);

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  // Load menu and settings
  useEffect(() => {
    // Fix: db methods return Promises, must be awaited in an async function
    const loadData = async () => {
      setMenuItems(await db.getMenu());
      const fetchedTables = await db.getTables();
      setTables(fetchedTables);
      const settings = await db.getSystemSettings();
      setRestaurantName(settings.restaurantName);
      setTableMode(settings.tableSelectionMode);

      if (initialTableId && fetchedTables.find(l => l.id === initialTableId)) {
          setSelectedTableId(initialTableId);
      }
    };
    loadData();
  }, [initialTableId]);

  // Dynamic Categories from Items
  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(menuItems.map(i => i.category)));
    if (uniqueCats.length > 0) return uniqueCats;
    return Object.values(MenuCategory);
  }, [menuItems]);

  useEffect(() => {
      if (categories.length > 0 && !categories.includes(activeCategory)) {
          setActiveCategory(categories[0]);
      }
  }, [categories, activeCategory]);

  // Wheel Logic
  useEffect(() => {
    if (tables.length === 0) return;
    const degPerItem = 360 / tables.length;
    const targetRotation = 180 - (activeWheelIndex * degPerItem);
    const currentMod = wheelRotation % 360;
    let diff = targetRotation - currentMod;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    setWheelRotation(prev => prev + diff);
  }, [activeWheelIndex, tables]);

  const rotateWheel = (direction: 'LEFT' | 'RIGHT') => {
    if (tables.length === 0) return;
    if (direction === 'LEFT') {
      setActiveWheelIndex(prev => (prev === 0 ? tables.length - 1 : prev - 1));
    } else {
      setActiveWheelIndex(prev => (prev === tables.length - 1 ? 0 : prev + 1));
    }
  };

  const selectWheelItem = (index: number) => {
    setActiveWheelIndex(index);
  };

  const confirmSelection = () => {
    if (tables[activeWheelIndex]) {
        setSelectedTableId(tables[activeWheelIndex].id);
    }
  };

  // Derived state
  const selectedTable = tables.find(l => l.id === selectedTableId);
  
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
      paymentStatus: 'UNPAID', // Default to UNPAID
      timestamp: Date.now(),
      paymentMethod: isPhoneOrder ? 'CASH' : 'ONLINE',
    };

    db.placeOrder(newOrder);
    setOrderPlaced(newOrder);
    setCart([]);
    setIsCartOpen(false);
    onPlaceOrder(newOrder);
  };

  const handleCallWaiter = () => {
    if (!selectedTable && !isPhoneOrder) return alert('Please select a table first.');
    db.addWaiterCall({
      id: Math.random().toString(36).substr(2, 9),
      tableId: isPhoneOrder ? 'PHONE' : selectedTable!.id,
      tableName: isPhoneOrder ? t('phoneOrder') : selectedTable!.name,
      timestamp: Date.now(),
      status: 'PENDING'
    });
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 3000);
  };

  // Views
  if (!selectedTableId && !isPhoneOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] text-center overflow-hidden relative">
        <FloatingIngredients />
        
        <div className="space-y-4 mb-10 z-10 animate-fade-in relative">
            <h1 className="text-5xl sm:text-6xl font-serif text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                Welcome to <span className="text-africa-sunset">{restaurantName}</span>
            </h1>
            <p className="text-stone-300 max-w-md mx-auto text-lg font-light tracking-wide">{t('selectLandmark')}</p>
        </div>

        {/* --- TABLE SELECTION UI VARIANTS --- */}

        {/* VARIANT 1: WHEEL (Default) */}
        {tableMode === 'WHEEL' && tables.length > 0 && (
            <div className="relative w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] flex items-center justify-center z-10">
                <div 
                    className="absolute w-full h-full rounded-full border-[12px] border-africa-earth bg-africa-dark/90 backdrop-blur-md shadow-[0_0_60px_rgba(var(--color-sunset),0.3)] transition-transform ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ 
                        transform: `rotate(${wheelRotation}deg)`,
                        transitionDuration: '0.7s'
                    }}
                >
                    <div className="absolute inset-4 rounded-full border border-dashed border-white/10 opacity-50"></div>
                    <div className="absolute inset-16 rounded-full border border-white/5 opacity-30"></div>
                    {tables.map((tbl, index) => {
                        const angle = index * (360 / tables.length);
                        return (
                            <div
                                key={tbl.id}
                                onClick={() => selectWheelItem(index)}
                                className="absolute top-0 left-1/2 -ml-[25px] origin-[50%_175px] sm:origin-[50%_225px] pt-2 cursor-pointer"
                                style={{ transform: `rotate(${angle}deg)`, height: '50%' }}
                            >
                                <div 
                                    className={`w-[50px] h-[50px] rounded-full flex items-center justify-center font-bold text-lg shadow-lg transition-all duration-300 ${
                                        activeWheelIndex === index 
                                        ? 'bg-gradient-to-br from-africa-gold to-africa-sunset text-white scale-125 border-4 border-africa-dark z-10 shadow-africa-gold/50' 
                                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white'
                                    }`}
                                    style={{ transform: `rotate(${-wheelRotation - angle}deg)` }}
                                >
                                    {tbl.id}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="absolute z-20 flex flex-col items-center justify-center w-40 h-40 bg-gradient-to-b from-stone-800 to-africa-dark rounded-full border-4 border-africa-sunset shadow-2xl group">
                    <span className="text-stone-400 text-[10px] uppercase tracking-[0.2em] mb-1">{t('table')}</span>
                    <span className="text-5xl font-serif font-bold text-white mb-2 group-hover:scale-110 transition-transform">
                        {tables[activeWheelIndex] ? tables[activeWheelIndex].id : ''}
                    </span>
                    <button 
                        onClick={confirmSelection}
                        className="group relative px-8 py-3 bg-africa-sunset text-white rounded-full font-bold uppercase tracking-widest text-xs overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(234,88,12,0.6)]"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="relative flex items-center gap-2">
                            {t('select')} <ArrowRight size={16} />
                        </span>
                    </button>
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-africa-gold animate-bounce">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-africa-gold rotate-180 filter drop-shadow-[0_0_8px_rgba(234,88,12,0.8)]"></div>
                </div>
            </div>
        )}

        {/* VARIANT 2: GRID / FLOOR PLAN */}
        {tableMode === 'GRID' && (
            <div className="z-10 w-full max-w-4xl p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 animate-fade-in">
                    {tables.map(tbl => (
                        <button
                            key={tbl.id}
                            onClick={() => setSelectedTableId(tbl.id)}
                            className="bg-stone-800/80 backdrop-blur border border-white/10 hover:border-africa-gold/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 hover:bg-stone-700 group"
                        >
                            <div className="w-12 h-12 rounded-full border-2 border-stone-600 group-hover:border-africa-gold flex items-center justify-center bg-stone-900 text-stone-300 group-hover:text-white font-bold text-xl">
                                {tbl.id}
                            </div>
                            <span className="text-xs uppercase tracking-wider text-stone-400 group-hover:text-africa-gold">{t('table')}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* VARIANT 3: LIST / MINIMAL */}
        {tableMode === 'LIST' && (
            <div className="z-10 w-full max-w-md animate-fade-in">
                <div className="bg-stone-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-white/10 bg-black/20">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MapPin className="text-africa-gold" size={20}/> {t('selectLandmark')}
                        </h3>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {tables.map(tbl => (
                            <button
                                key={tbl.id}
                                onClick={() => setSelectedTableId(tbl.id)}
                                className="w-full text-left p-4 hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors group"
                            >
                                <span className="font-bold text-lg text-stone-300 group-hover:text-white">{tbl.name}</span>
                                <ChevronRight className="text-stone-600 group-hover:text-africa-sunset transition-transform group-hover:translate-x-1" size={20}/>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Wheel Controls */}
        {tableMode === 'WHEEL' && (
            <div className="flex items-center gap-12 mt-16 z-10">
                <button 
                    onClick={() => rotateWheel('LEFT')} 
                    className="p-4 rounded-full bg-stone-800/80 backdrop-blur text-white hover:bg-africa-sunset hover:scale-110 transition-all border border-white/10 shadow-lg"
                >
                    <ChevronLeft size={24} />
                </button>
                
                <button 
                    onClick={() => rotateWheel('RIGHT')} 
                    className="p-4 rounded-full bg-stone-800/80 backdrop-blur text-white hover:bg-africa-sunset hover:scale-110 transition-all border border-white/10 shadow-lg"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        )}
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-green-900/50 backdrop-blur rounded-full flex items-center justify-center text-green-400 shadow-2xl shadow-green-900/50">
          <ShoppingBag size={48} />
        </div>
        <div>
            <h2 className="text-4xl font-serif text-africa-gold mb-2">{t('orderPlaced')}</h2>
            <p className="text-stone-300 text-lg">
            {isPhoneOrder ? 'Phone order recorded successfully.' : <span>Thank you. Your order for <span className="text-africa-sunset font-bold">{selectedTable?.name}</span> is being prepared.</span>}
            </p>
        </div>
        <div className="bg-stone-900/80 backdrop-blur p-6 rounded-xl w-full max-w-md border border-stone-700/50 shadow-xl">
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
          className="mt-8 text-stone-400 underline hover:text-africa-gold transition-colors"
        >
          {isPhoneOrder ? 'Place another phone order' : 'Place another order'}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Header */}
      {!isPhoneOrder && (
        <header className="sticky top-0 z-40 bg-africa-dark/80 backdrop-blur-xl border-b border-white/10 pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:rounded-b-2xl mb-6 shadow-lg">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-africa-gold shadow-lg flex items-center justify-center bg-stone-900 text-africa-gold font-bold text-xl relative group">
                      <div className="absolute inset-0 bg-africa-gold/20 animate-pulse"></div>
                      <span className="relative z-10">{selectedTable?.id}</span>
                  </div>
                  <div>
                      <h2 className="text-xs text-stone-400 uppercase tracking-wider">{t('table')}</h2>
                      <h1 className="font-serif font-bold text-xl text-africa-sand leading-none">{selectedTable?.name}</h1>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCallWaiter}
                  className={`flex items-center gap-1 text-xs px-3 py-2 rounded-full border transition-all ${waiterCalled ? 'bg-green-900 border-green-700 text-green-300' : 'bg-stone-800/80 border-stone-600 text-stone-300 hover:text-white hover:border-stone-400 hover:bg-stone-700/80'}`}
                >
                    <Bell size={14} className={waiterCalled ? 'animate-swing' : ''}/> {waiterCalled ? t('waiterCalled') : t('callWaiter')}
                </button>
                <button 
                    onClick={() => setSelectedTableId('')}
                    className="text-xs text-stone-500 hover:text-white underline px-2"
                >
                    {t('changeTable')}
                </button>
              </div>
          </div>
        </header>
      )}
      
      {/* Categories (Tabs) - Redesigned */}
      <div className={`flex overflow-x-auto gap-3 pb-6 no-scrollbar ${!isPhoneOrder ? '' : 'pt-4'}`}>
        {categories.map(cat => {
            const Icon = getCategoryIcon(cat);
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 whitespace-nowrap px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 transform ${
                  isActive
                    ? 'bg-gradient-to-r from-africa-sunset to-africa-gold text-white shadow-lg shadow-orange-900/40 scale-105 translate-y-[-2px]' 
                    : 'bg-africa-dark/80 text-stone-400 hover:bg-stone-800 hover:text-white border border-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'animate-bounce' : ''} />
                {cat}
              </button>
            );
        })}
      </div>

      {/* Search Bar - Floating Style */}
      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-africa-gold/5 rounded-2xl blur-lg group-hover:bg-africa-gold/10 transition-all duration-500"></div>
        <div className="relative flex items-center bg-africa-dark/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 transition-all group-hover:border-africa-gold/30 group-focus-within:border-africa-gold group-focus-within:ring-1 group-focus-within:ring-africa-gold/50 shadow-xl">
            <Search className="ml-3 text-stone-500 group-focus-within:text-africa-gold transition-colors" size={20} />
            <input 
              type="text" 
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none rounded-xl px-4 py-2 text-white focus:outline-none placeholder:text-stone-600 text-lg"
            />
        </div>
      </div>

      {/* Menu Grid - Card Redesign */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item, index) => (
          <div 
            key={item.id} 
            className="group relative flex flex-col bg-africa-dark/40 backdrop-blur-md rounded-[2rem] border border-white/5 hover:border-africa-gold/30 hover:bg-stone-800/60 transition-all duration-500 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{
                animation: `fadeInUp 0.5s ease-out forwards`,
                animationDelay: `${index * 0.05}s`,
                opacity: 0
            }}
          >
            {/* Image Section */}
            <div className="relative h-52 w-full overflow-hidden">
                <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-africa-dark via-transparent to-transparent opacity-80"></div>
                
                {/* Price Tag */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                    <span className="text-xs text-africa-gold font-bold">AED</span>
                    <span className="text-lg font-serif text-white font-bold">{item.price}</span>
                </div>

                {/* Tags Overlay */}
                <div className="absolute bottom-3 left-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 backdrop-blur text-white border border-white/10">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-5 pt-4 flex flex-col relative">
                {/* Floating Add Button */}
                <button 
                    onClick={(e) => {
                        // Create ripple effect or simple feedback
                        const btn = e.currentTarget;
                        btn.classList.add('scale-90');
                        setTimeout(() => btn.classList.remove('scale-90'), 150);
                        addToCart(item);
                    }}
                    className="absolute -top-6 right-4 w-12 h-12 bg-gradient-to-br from-africa-sunset to-africa-gold rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-900/50 hover:scale-110 active:scale-95 transition-all duration-300 border-4 border-africa-dark group-hover:border-stone-800 z-10"
                >
                    <Plus size={24} strokeWidth={3} />
                </button>

                <h3 className="font-serif font-bold text-xl text-stone-100 mb-2 leading-tight group-hover:text-africa-sand transition-colors pr-12">
                    {item.name}
                </h3>
                <p className="text-sm text-stone-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                    {item.description}
                </p>

                {/* Decorative bottom line */}
                <div className="w-12 h-1 bg-stone-800 rounded-full group-hover:w-full group-hover:bg-africa-gold/30 transition-all duration-500"></div>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center text-stone-500 bg-stone-900/30 backdrop-blur rounded-3xl border border-dashed border-stone-800">
                <p className="text-lg">No items found in this category.</p>
                <button onClick={() => setActiveCategory(categories[0])} className="text-africa-gold hover:underline mt-2">View all items</button>
            </div>
        )}
      </div>

      {/* Floating Cart Bar - Redesigned */}
      {cart.length > 0 && (
        <div className={`fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none ${isPhoneOrder ? 'absolute' : 'fixed'}`}>
          <button
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto w-full max-w-lg bg-africa-dark/90 backdrop-blur-xl border border-white/10 text-white p-2 pr-6 pl-2 rounded-[2rem] shadow-2xl shadow-black/50 flex items-center justify-between hover:bg-stone-800 transition-all transform hover:scale-[1.02] group"
          >
            <div className="flex items-center gap-4">
                <div className="bg-africa-sunset w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:rotate-12 transition-transform">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                </div>
                <div className="text-left">
                    <span className="block text-xs text-stone-400 uppercase tracking-wider">{t('total')}</span>
                    <span className="block font-serif font-bold text-xl text-white">AED {cartTotal.total.toFixed(2)}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 text-africa-gold font-bold uppercase tracking-widest text-xs">
                {t('viewCart')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </div>
          </button>
        </div>
      )}

      {/* Cart Modal - Enhanced */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-stone-950 h-full flex flex-col animate-slide-in-right shadow-2xl border-l border-white/10">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-stone-900">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
                            {t('myOrder')}
                        </h2>
                        <p className="text-xs text-stone-500 mt-1">{selectedTable?.name}</p>
                    </div>
                    <button 
                        onClick={() => setIsCartOpen(false)} 
                        className="text-stone-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Plus size={24} className="rotate-45"/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex gap-4 bg-stone-900/50 p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                            <div className="w-16 h-16 rounded-xl bg-stone-800 overflow-hidden shrink-0">
                                <img src={item.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-stone-200 line-clamp-1">{item.name}</h4>
                                    <span className="text-sm font-bold text-africa-gold">{(item.price * item.quantity).toFixed(0)}</span>
                                </div>
                                <p className="text-stone-500 text-xs mb-3">AED {item.price} each</p>
                                
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center bg-stone-950 rounded-lg p-1 border border-white/5">
                                        <button onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)} className="p-1.5 hover:text-red-400 transition-colors hover:bg-white/5 rounded"><Minus size={14}/></button>
                                        <span className="text-sm font-mono w-8 text-center font-bold">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:text-green-400 transition-colors hover:bg-white/5 rounded"><Plus size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-stone-500 opacity-50">
                            <ShoppingBag size={48} className="mb-4"/>
                            <p>Your cart is empty</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-stone-900 border-t border-white/10 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
                    <div className="space-y-3 text-sm text-stone-400 bg-black/20 p-4 rounded-xl">
                        <div className="flex justify-between"><span>{t('subtotal')}</span><span>AED {cartTotal.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>{t('vat')} (5%)</span><span>AED {cartTotal.tax.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>{t('service')} (5%)</span><span>AED {cartTotal.service.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-white/10 mt-2">
                            <span>{t('total')}</span>
                            <span className="text-africa-gold">AED {cartTotal.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full bg-gradient-to-r from-africa-sunset to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {t('placeOrder')} <Check size={20} />
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* Styles for animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
            animation: swing 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
