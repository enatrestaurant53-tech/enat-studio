
import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';
import { printerService } from '../services/printerService';
import { User, SystemSettings, LoginLog, UserRole, AppTheme, TableMode } from '../types';
import { TRANSLATIONS } from '../constants';
import { ShieldAlert, Power, Users, Activity, Save, RefreshCcw, Plus, Trash2, Edit as EditIcon, X, Settings, Palette, Printer } from 'lucide-react';

interface DeveloperDashboardProps {
  lang: 'EN' | 'AM' | 'TI' | 'ES' | 'FR';
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ lang }) => {
  const [settings, setSettings] = useState<SystemSettings>({ 
      isMaintenanceMode: false, 
      maintenanceMessage: '',
      restaurantName: '',
      restaurantLocation: '',
      restaurantLogo: '',
      totalTables: 0,
      theme: 'SAVANNA',
      tableSelectionMode: 'WHEEL',
      receiptPrinterName: ''
  });
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'USERS' | 'LOGS'>('SYSTEM');
  
  // Printer State
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [printerError, setPrinterError] = useState('');
  
  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({
      name: '', username: '', password: '', role: UserRole.CHEF
  });
  const [formError, setFormError] = useState('');

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  const refreshData = async () => {
    // Fix: db methods return Promises
    setSettings(await db.getSystemSettings());
    setUsers(await db.getUsers());
    const rawLogs = await db.getLoginLogs();
    setLogs(rawLogs.reverse()); // Newest first
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleMaintenance = async () => {
    const newStatus = !settings.isMaintenanceMode;
    await db.toggleMaintenanceMode(newStatus);
    refreshData();
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
      e.preventDefault();
      await db.updateSystemSettings(settings);
      alert('Settings updated successfully. Refresh page to see changes in all components.');
      refreshData();
  };

  const handleScanPrinters = async () => {
      setIsScanningPrinters(true);
      setPrinterError('');
      try {
          await printerService.connect();
          const printers = await printerService.getPrinters();
          setAvailablePrinters(printers);
      } catch (e: any) {
          setPrinterError(e.message || "Failed to connect to QZ Tray");
      } finally {
          setIsScanningPrinters(false);
      }
  };

  // --- User Management Handlers ---

  const handleAddUserClick = () => {
      setUserForm({ name: '', username: '', password: '', role: UserRole.CHEF });
      setIsEditingUser(false);
      setFormError('');
      setIsUserModalOpen(true);
  };

  const handleEditUserClick = (user: User) => {
      setUserForm({ 
          id: user.id, 
          name: user.name, 
          username: user.username, 
          role: user.role, 
          password: '' // Don't show old password
      });
      setIsEditingUser(true);
      setFormError('');
      setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
      if (window.confirm(`Are you sure you want to delete user "${user.name}"?`)) {
          try {
              await db.removeUser(user.id);
              refreshData();
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError('');

      if (!userForm.name || !userForm.username || !userForm.role) {
          setFormError("Name, Username, and Role are required.");
          return;
      }

      try {
          if (isEditingUser && userForm.id) {
              await db.updateUser({
                  id: userForm.id,
                  name: userForm.name,
                  username: userForm.username,
                  role: userForm.role,
                  password: userForm.password // Only updates if not empty
              } as User);
          } else {
              if (!userForm.password) {
                  setFormError("Password is required for new users.");
                  return;
              }
              await db.addUser({
                  id: Math.random().toString(36).substr(2, 9),
                  name: userForm.name,
                  username: userForm.username,
                  role: userForm.role,
                  password: userForm.password
              } as User);
          }
          setIsUserModalOpen(false);
          refreshData();
      } catch (e: any) {
          setFormError(e.message);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
        <h2 className="text-3xl font-serif text-africa-sand flex items-center gap-3">
            <ShieldAlert className="text-africa-gold" /> {t('developer')} Dashboard
        </h2>

        {/* Tabs */}
        <div className="flex bg-stone-800 rounded-lg p-1 w-fit">
            <button onClick={() => setActiveTab('SYSTEM')} className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 ${activeTab === 'SYSTEM' ? 'bg-stone-600 text-white' : 'text-stone-400'}`}>
                <Power size={16}/> {t('systemSettings')}
            </button>
            <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 ${activeTab === 'USERS' ? 'bg-stone-600 text-white' : 'text-stone-400'}`}>
                <Users size={16}/> {t('userManagement')}
            </button>
            <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-2 rounded font-bold text-sm flex items-center gap-2 ${activeTab === 'LOGS' ? 'bg-stone-600 text-white' : 'text-stone-400'}`}>
                <Activity size={16}/> {t('loginLogs')}
            </button>
        </div>

        {/* System Tab */}
        {activeTab === 'SYSTEM' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Maintenance Mode */}
                <div className="bg-stone-800 p-8 rounded-xl border border-stone-700">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Power className="text-africa-sunset"/> {t('maintenanceMode')}</h3>
                    
                    <div className="flex items-center justify-between bg-stone-900 p-6 rounded-lg border border-stone-600">
                        <div>
                            <h4 className="font-bold text-white text-lg">App Status</h4>
                            <p className={`mt-1 font-mono ${settings.isMaintenanceMode ? 'text-red-400' : 'text-green-400'}`}>
                                {settings.isMaintenanceMode ? 'OFFLINE (Maintenance Mode)' : 'ONLINE (Live)'}
                            </p>
                            <p className="text-xs text-stone-500 mt-2 max-w-md">
                                When offline, only Developers can access the dashboard. Guests and other staff will see a maintenance message.
                            </p>
                        </div>
                        <button 
                            onClick={handleToggleMaintenance}
                            className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-105 ${settings.isMaintenanceMode ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                        >
                            {settings.isMaintenanceMode ? 'Turn App ON' : 'Turn App OFF'}
                        </button>
                    </div>
                </div>

                {/* General Config */}
                <div className="bg-stone-800 p-8 rounded-xl border border-stone-700">
                     <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Settings className="text-africa-sunset"/> General Configuration</h3>
                     <form onSubmit={handleSettingsSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-stone-500 mb-1">Restaurant Name</label>
                                <input 
                                    type="text"
                                    value={settings.restaurantName}
                                    onChange={e => setSettings({...settings, restaurantName: e.target.value})}
                                    className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-stone-500 mb-1">Restaurant Location</label>
                                <input 
                                    type="text"
                                    value={settings.restaurantLocation}
                                    onChange={e => setSettings({...settings, restaurantLocation: e.target.value})}
                                    className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                                    placeholder="e.g. Dubai, UAE"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-stone-500 mb-1">Number of Tables</label>
                            <input 
                                type="number"
                                min="1" max="100"
                                value={settings.totalTables}
                                onChange={e => setSettings({...settings, totalTables: parseInt(e.target.value) || 17})}
                                className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-stone-500 mb-1">Logo URL (Optional)</label>
                            <input 
                                type="text"
                                value={settings.restaurantLogo}
                                onChange={e => setSettings({...settings, restaurantLogo: e.target.value})}
                                className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                                placeholder="https://example.com/logo.png"
                            />
                        </div>

                        {/* Theme & Layout Config */}
                        <div className="pt-4 border-t border-stone-700">
                            <h4 className="text-sm font-bold text-africa-gold mb-3 uppercase tracking-wider flex items-center gap-2"><Palette size={14}/> Appearance</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-stone-500 mb-1">Color Theme</label>
                                    <select
                                        value={settings.theme}
                                        onChange={e => setSettings({...settings, theme: e.target.value as AppTheme})}
                                        className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                                    >
                                        <option value="SAVANNA">Savanna (Default)</option>
                                        <option value="MIDNIGHT">Midnight Luxe</option>
                                        <option value="GARDEN">Serene Garden</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-stone-500 mb-1">Table Selection</label>
                                    <select
                                        value={settings.tableSelectionMode}
                                        onChange={e => setSettings({...settings, tableSelectionMode: e.target.value as TableMode})}
                                        className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                                    >
                                        <option value="WHEEL">Wheel (Interactive)</option>
                                        <option value="GRID">Floor Grid</option>
                                        <option value="LIST">Minimal List</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Printer Config */}
                        <div className="pt-4 border-t border-stone-700">
                            <h4 className="text-sm font-bold text-africa-gold mb-3 uppercase tracking-wider flex items-center gap-2"><Printer size={14}/> QZ Tray Receipt Printer</h4>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs text-stone-500 mb-1">Target Printer</label>
                                    {availablePrinters.length > 0 ? (
                                        <select 
                                            value={settings.receiptPrinterName}
                                            onChange={e => setSettings({...settings, receiptPrinterName: e.target.value})}
                                            className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                                        >
                                            <option value="">Select Printer...</option>
                                            {availablePrinters.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    ) : (
                                        <input 
                                            type="text"
                                            value={settings.receiptPrinterName}
                                            onChange={e => setSettings({...settings, receiptPrinterName: e.target.value})}
                                            className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                                            placeholder="Type printer name exactly..."
                                        />
                                    )}
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleScanPrinters}
                                    disabled={isScanningPrinters}
                                    className="px-4 py-2 bg-stone-600 hover:bg-stone-500 text-white rounded font-bold whitespace-nowrap"
                                >
                                    {isScanningPrinters ? 'Scanning...' : 'Scan Printers'}
                                </button>
                            </div>
                            {printerError && <p className="text-red-400 text-xs mt-2">{printerError}</p>}
                            <p className="text-stone-500 text-[10px] mt-2">Requires QZ Tray application to be running on this machine.</p>
                        </div>

                        <div className="pt-2">
                             <button type="submit" className="w-full bg-stone-700 hover:bg-stone-600 text-white font-bold py-2 rounded flex items-center justify-center gap-2">
                                <Save size={16}/> Save Settings
                             </button>
                        </div>
                     </form>
                </div>
            </div>
        )}

        {/* Users Tab */}
        {activeTab === 'USERS' && (
            <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users className="text-africa-sunset"/> {t('userManagement')}</h3>
                    <button 
                        onClick={handleAddUserClick}
                        className="bg-africa-sunset hover:bg-orange-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Add User
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                        <div key={user.id} className="bg-stone-900 p-4 rounded-lg border border-stone-600 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold bg-stone-700 text-stone-300 px-2 py-0.5 rounded uppercase">{user.role}</span>
                                </div>
                                <h4 className="font-bold text-white text-lg">{user.name}</h4>
                                <div className="mt-1 text-sm text-stone-500 flex flex-col gap-1">
                                    <span>Username: <span className="font-mono text-stone-300">{user.username}</span></span>
                                    <span className="text-xs text-stone-600">ID: {user.id}</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4 pt-3 border-t border-stone-800">
                                <button 
                                    onClick={() => handleEditUserClick(user)} 
                                    className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded text-xs font-bold border border-stone-600 flex items-center justify-center gap-1"
                                >
                                    <EditIcon size={14} /> Edit
                                </button>
                                <button 
                                    onClick={() => handleDeleteUser(user)} 
                                    className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 py-2 rounded text-xs font-bold border border-red-900/50 flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={14} /> Remove
                                </button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'LOGS' && (
            <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Activity className="text-africa-sunset"/> {t('loginLogs')}</h3>
                    <button onClick={refreshData} className="text-stone-400 hover:text-white"><RefreshCcw size={18}/></button>
                </div>

                <div className="overflow-hidden rounded-lg border border-stone-600">
                    <table className="w-full text-left text-sm text-stone-300">
                        <thead className="bg-stone-900 text-stone-500 uppercase font-mono text-xs">
                            <tr>
                                <th className="p-3">Time</th>
                                <th className="p-3">Username</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-700 bg-stone-900/50">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-stone-700/30">
                                    <td className="p-3 text-stone-400">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-3 font-bold text-white">{log.username}</td>
                                    <td className="p-3 text-xs uppercase">{log.role}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status === 'SUCCESS' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr><td colSpan={4} className="p-6 text-center text-stone-500">No logs available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* User Modal */}
        {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-stone-900 w-full max-w-md rounded-xl border border-stone-700 shadow-2xl animate-fade-in">
                    <div className="p-4 border-b border-stone-700 flex justify-between items-center bg-stone-800 rounded-t-xl">
                        <h3 className="font-bold text-white text-lg">{isEditingUser ? 'Edit User' : 'Add New User'}</h3>
                        <button onClick={() => setIsUserModalOpen(false)}><X className="text-stone-400 hover:text-white" /></button>
                    </div>
                    <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="text-xs text-stone-500 block mb-1">Full Name</label>
                            <input 
                                required 
                                type="text"
                                value={userForm.name} 
                                onChange={e => setUserForm({...userForm, name: e.target.value})}
                                className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" 
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-stone-500 block mb-1">Role</label>
                            <select 
                                required
                                value={userForm.role}
                                onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                                className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white"
                            >
                                {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-stone-500 block mb-1">Username</label>
                            <input 
                                required 
                                type="text"
                                value={userForm.username} 
                                onChange={e => setUserForm({...userForm, username: e.target.value})}
                                className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" 
                            />
                        </div>
                        <div>
                            <label className="text-xs text-stone-500 block mb-1">
                                {isEditingUser ? 'New Password (leave blank to keep)' : 'Password'}
                            </label>
                            <input 
                                type="password"
                                value={userForm.password} 
                                onChange={e => setUserForm({...userForm, password: e.target.value})}
                                className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" 
                            />
                        </div>

                        {formError && (
                            <p className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900/50">{formError}</p>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                            <button 
                                type="button"
                                onClick={() => setIsUserModalOpen(false)} 
                                className="px-4 py-2 rounded text-stone-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="px-6 py-2 bg-africa-sunset hover:bg-orange-600 text-white rounded font-bold flex items-center gap-2"
                            >
                                <Save size={16}/> {isEditingUser ? 'Update User' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
