
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { GuestMenu } from './components/GuestMenu';
import { ChefDashboard } from './components/ChefDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { Login } from './components/Login';
import { db } from './services/dataService';
import { User, UserRole, SystemSettings } from './types';
import { Utensils, LogOut, ShieldAlert, Lock, Loader2 } from 'lucide-react';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'GUEST' | 'STAFF'>('GUEST');
  const [urlTableId, setUrlTableId] = useState<string>('');
  const [lang, setLang] = useState<'EN' | 'AM' | 'TI' | 'ES' | 'FR'>('EN');
  const [isLoading, setIsLoading] = useState(true);
  
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const initApp = async () => {
        try {
            // Initialize the database (seeds if necessary)
            await db.ensureInitialized();
            
            const user = db.getCurrentUser();
            if (user) setCurrentUser(user);

            const initialSettings = await db.getSystemSettings();
            setSettings(initialSettings);
            document.title = `${initialSettings.restaurantName} | ${initialSettings.restaurantLocation}`;

            const params = new URLSearchParams(window.location.search);
            const table = params.get('table');
            if (table) setUrlTableId(table);
        } catch (error) {
            console.error("Initialization error:", error);
            // Fallback to local defaults if API is completely unavailable
            const fallbackSettings: SystemSettings = {
                isMaintenanceMode: false,
                maintenanceMessage: '',
                restaurantName: 'Enat Restaurant',
                restaurantLocation: 'Dubai, UAE',
                restaurantLogo: '',
                totalTables: 17,
                theme: 'SAVANNA',
                tableSelectionMode: 'WHEEL',
                receiptPrinterName: ''
            };
            setSettings(fallbackSettings);
        } finally {
            setIsLoading(false);
        }
    };
    initApp();
  }, []);

  // Theme effect
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.theme === 'MIDNIGHT') {
        root.style.setProperty('--color-dark', '#0f172a');
        root.style.setProperty('--color-earth', '#334155');
        root.style.setProperty('--color-clay', '#475569');
        root.style.setProperty('--color-sand', '#f8fafc');
        root.style.setProperty('--color-sunset', '#7c3aed');
        root.style.setProperty('--color-gold', '#f59e0b');
        root.style.setProperty('--color-leaf', '#10b981');
    } else if (settings.theme === 'GARDEN') {
        root.style.setProperty('--color-dark', '#052e16');
        root.style.setProperty('--color-earth', '#14532d');
        root.style.setProperty('--color-clay', '#166534');
        root.style.setProperty('--color-sand', '#ecfccb');
        root.style.setProperty('--color-sunset', '#15803d');
        root.style.setProperty('--color-gold', '#a3e635');
        root.style.setProperty('--color-leaf', '#4ade80');
    } else {
        root.style.setProperty('--color-dark', '#1c1917');
        root.style.setProperty('--color-earth', '#78350f');
        root.style.setProperty('--color-clay', '#92400e');
        root.style.setProperty('--color-sand', '#f5f5f4');
        root.style.setProperty('--color-sunset', '#ea580c');
        root.style.setProperty('--color-gold', '#d97706');
        root.style.setProperty('--color-leaf', '#15803d');
    }
  }, [settings?.theme]);

  // Poll for settings
  useEffect(() => {
    const interval = setInterval(async () => {
        try {
            const newSettings = await db.getSystemSettings();
            if (JSON.stringify(newSettings) !== JSON.stringify(settings)) {
                setSettings(newSettings);
            }
        } catch (e) {
            // Ignore polling errors to prevent UI disruption
        }
    }, 5000);
    return () => clearInterval(interval);
  }, [settings]);

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
    setView('GUEST');
  };

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  if (isLoading || !settings) {
    return (
        <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-africa-sunset" size={48} />
            <p className="text-africa-sand font-serif text-xl animate-pulse">Loading Enat...</p>
        </div>
    );
  }

  if (settings.isMaintenanceMode && !currentUser && view === 'GUEST') {
      return (
          <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-4">
              <ShieldAlert size={80} className="text-africa-sunset mb-6 animate-pulse" />
              <h1 className="text-4xl font-serif font-bold text-white mb-4 text-center">{t('appUnderMaintenance')}</h1>
              <p className="text-stone-400 text-center max-w-lg text-lg mb-10">{settings.maintenanceMessage || t('maintenanceMessage')}</p>
              <div className="flex flex-col items-center gap-4">
                <button onClick={() => setView('STAFF')} className="text-stone-600 hover:text-africa-gold flex items-center gap-2 text-sm transition-colors">
                    <Lock size={14}/> Staff Access
                </button>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-stone-800 rounded-lg text-xs font-bold text-stone-400 hover:bg-stone-700 transition-colors">
                    Retry Connection
                </button>
              </div>
          </div>
      );
  }

  return (
    <Layout>
      <nav className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('GUEST')}>
            <div className="bg-africa-sunset p-2 rounded-lg">
                <Utensils className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-xl font-serif font-bold text-white uppercase">{settings.restaurantName}</h1>
                <span className="text-xs text-africa-gold tracking-widest uppercase">{settings.restaurantLocation}</span>
            </div>
        </div>
        
        <div className="flex gap-4 items-center">
            <button onClick={() => setLang(l => l === 'EN' ? 'AM' : 'EN')} className="text-xs font-bold text-stone-400">
                {lang === 'EN' ? 'አማ' : 'EN'}
            </button>
            {currentUser ? (
               <button onClick={handleLogout} className="text-stone-500 hover:text-red-400"><LogOut size={20}/></button>
            ) : (
                <button onClick={() => setView(v => v === 'GUEST' ? 'STAFF' : 'GUEST')} className="text-xs font-bold text-stone-500 uppercase">
                    {view === 'GUEST' ? t('login') : t('guest')}
                </button>
            )}
        </div>
      </nav>

      {view === 'GUEST' ? (
        <GuestMenu initialTableId={urlTableId} onPlaceOrder={() => {}} lang={lang} />
      ) : (
        !currentUser ? <Login onLogin={setCurrentUser} /> : (
            currentUser.role === UserRole.CHEF ? <ChefDashboard lang={lang} /> :
            currentUser.role === UserRole.ADMIN ? <AdminDashboard lang={lang} /> :
            currentUser.role === UserRole.OWNER ? <OwnerDashboard lang={lang} /> :
            <DeveloperDashboard lang={lang} />
        )
      )}
    </Layout>
  );
};

export default App;
