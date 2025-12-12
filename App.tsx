import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { GuestMenu } from './components/GuestMenu';
import { ChefDashboard } from './components/ChefDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { Login } from './components/Login';
import { db } from './services/dataService';
import { User, UserRole } from './types';
import { Utensils, LogOut, Globe } from 'lucide-react';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'GUEST' | 'STAFF'>('GUEST');
  const [urlTableId, setUrlTableId] = useState<string>('');
  const [lang, setLang] = useState<'EN' | 'AM'>('EN');

  useEffect(() => {
    // Check for user session
    const user = db.getCurrentUser();
    if (user) setCurrentUser(user);

    // Check URL params for QR code ?table=kilimanjaro
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    if (table) setUrlTableId(table);
  }, []);

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
    setView('GUEST');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'EN' ? 'AM' : 'EN');
  };

  const t = (key: keyof typeof TRANSLATIONS['EN']) => {
    return TRANSLATIONS[lang][key] || key;
  };

  const renderStaffView = () => {
    if (!currentUser) return <Login onLogin={setCurrentUser} />;
    
    switch (currentUser.role) {
      case UserRole.CHEF:
        return <ChefDashboard lang={lang} />;
      case UserRole.ADMIN:
        return <AdminDashboard lang={lang} />;
      case UserRole.OWNER:
        return <OwnerDashboard lang={lang} />;
      default:
        return <div>Access Denied</div>;
    }
  };

  return (
    <Layout>
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between mb-8 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('GUEST')}>
            <div className="bg-africa-sunset p-2 rounded-lg">
                <Utensils className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-xl font-serif font-bold text-white leading-none">SAVANNA</h1>
                <span className="text-xs text-africa-gold tracking-[0.2em] uppercase">Eats Dubai</span>
            </div>
        </div>
        
        <div className="flex gap-4 items-center">
            <button 
              onClick={toggleLang}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded border border-stone-700 hover:border-africa-gold text-stone-400 hover:text-white transition-colors"
            >
              <Globe size={14} />
              {lang === 'EN' ? 'አማ' : 'EN'}
            </button>

            {currentUser ? (
               <div className="flex items-center gap-4">
                  <span className="text-sm hidden sm:block text-stone-400">{t('welcome')}, <span className="text-white font-bold">{currentUser.name}</span></span>
                  <button onClick={handleLogout} className="text-stone-500 hover:text-red-400" title={t('logout')}><LogOut size={20}/></button>
               </div>
            ) : (
                <button 
                  onClick={() => setView(view === 'GUEST' ? 'STAFF' : 'GUEST')}
                  className="text-xs font-bold text-stone-500 hover:text-africa-gold uppercase tracking-widest"
                >
                    {view === 'GUEST' ? t('login') : t('guest')}
                </button>
            )}
        </div>
      </nav>

      {/* Main Content Area */}
      {view === 'GUEST' ? (
        <GuestMenu initialTableId={urlTableId} onPlaceOrder={(o) => console.log('Order Placed', o)} lang={lang} />
      ) : (
        renderStaffView()
      )}
    </Layout>
  );
};

export default App;