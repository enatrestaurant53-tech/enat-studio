import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { GuestMenu } from './components/GuestMenu';
import { ChefDashboard } from './components/ChefDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { Login } from './components/Login';
import { db } from './services/dataService';
import { User, UserRole } from './types';
import { Utensils, LogOut, Globe, ShieldAlert, Lock } from 'lucide-react';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'GUEST' | 'STAFF'>('GUEST');
  const [urlTableId, setUrlTableId] = useState<string>('');
  const [lang, setLang] = useState<'EN' | 'AM'>('EN');
  
  // Maintenance State
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    // Check for user session
    const user = db.getCurrentUser();
    if (user) setCurrentUser(user);

    // Check Maintenance Status
    const settings = db.getSystemSettings();
    setIsMaintenance(settings.isMaintenanceMode);

    // Check URL params for QR code ?table=kilimanjaro
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    if (table) setUrlTableId(table);
  }, []);

  // Poll for maintenance status changes (e.g. if developer toggles it in another tab)
  useEffect(() => {
    const interval = setInterval(() => {
        const settings = db.getSystemSettings();
        if (settings.isMaintenanceMode !== isMaintenance) {
            setIsMaintenance(settings.isMaintenanceMode);
        }
    }, 2000);
    return () => clearInterval(interval);
  }, [isMaintenance]);

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
    
    // If under maintenance, only Developer can see dashboards. Others see maintenance screen.
    if (isMaintenance && currentUser.role !== UserRole.DEVELOPER) {
         return (
             <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                 <ShieldAlert size={64} className="text-africa-sunset" />
                 <h2 className="text-3xl font-serif text-white">{t('appUnderMaintenance')}</h2>
                 <p className="text-stone-400 max-w-md">{t('maintenanceMessage')}</p>
                 <button onClick={handleLogout} className="text-sm text-stone-500 underline hover:text-white">{t('logout')}</button>
             </div>
         );
    }

    switch (currentUser.role) {
      case UserRole.CHEF:
        return <ChefDashboard lang={lang} />;
      case UserRole.ADMIN:
        return <AdminDashboard lang={lang} />;
      case UserRole.OWNER:
        return <OwnerDashboard lang={lang} />;
      case UserRole.DEVELOPER:
        return <DeveloperDashboard lang={lang} />;
      default:
        return <div>Access Denied</div>;
    }
  };

  // Maintenance View for Guests
  if (isMaintenance && !currentUser && view === 'GUEST') {
      return (
          <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-4">
              <ShieldAlert size={80} className="text-africa-sunset mb-6 animate-pulse" />
              <h1 className="text-4xl font-serif font-bold text-white mb-4 text-center">{t('appUnderMaintenance')}</h1>
              <p className="text-stone-400 text-center max-w-lg text-lg leading-relaxed mb-10">
                  {t('maintenanceMessage')}
              </p>
              {/* Backdoor for staff to log in during maintenance */}
              <button onClick={() => setView('STAFF')} className="text-stone-600 hover:text-africa-gold flex items-center gap-2 text-sm transition-colors">
                  <Lock size={14}/> Staff Access
              </button>
          </div>
      );
  }

  return (
    <Layout>
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between mb-8 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('GUEST')}>
            <div className="bg-africa-sunset p-2 rounded-lg">
                <Utensils className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-xl font-serif font-bold text-white leading-none">ENAT</h1>
                <span className="text-xs text-africa-gold tracking-[0.2em] uppercase">Restaurant Dubai</span>
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