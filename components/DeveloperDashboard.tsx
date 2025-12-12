import React, { useState, useEffect } from 'react';
import { db } from '../services/dataService';
import { User, SystemSettings, LoginLog, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import { ShieldAlert, Power, Users, Activity, Save, RefreshCcw } from 'lucide-react';

interface DeveloperDashboardProps {
  lang: 'EN' | 'AM';
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ lang }) => {
  const [settings, setSettings] = useState<SystemSettings>({ isMaintenanceMode: false, maintenanceMessage: '' });
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'USERS' | 'LOGS'>('SYSTEM');
  
  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const t = (key: keyof typeof TRANSLATIONS['EN']) => TRANSLATIONS[lang][key] || key;

  const refreshData = () => {
    setSettings(db.getSystemSettings());
    setUsers(db.getUsers());
    setLogs(db.getLoginLogs().reverse()); // Newest first
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleMaintenance = () => {
    db.toggleMaintenanceMode(!settings.isMaintenanceMode);
    refreshData();
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewUsername(user.username);
    setNewPassword(''); // Don't show old password, only allow reset
  };

  const handleSaveUser = (userId: string) => {
    if (newUsername) {
        db.updateUserCredentials(userId, newUsername, newPassword || undefined);
        setEditingUserId(null);
        setNewPassword('');
        refreshData();
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
        )}

        {/* Users Tab */}
        {activeTab === 'USERS' && (
            <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                 <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-africa-sunset"/> {t('userManagement')}</h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                        <div key={user.id} className="bg-stone-900 p-4 rounded-lg border border-stone-600">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-bold bg-stone-700 text-stone-300 px-2 py-0.5 rounded uppercase">{user.role}</span>
                                    <h4 className="font-bold text-white mt-1">{user.name}</h4>
                                </div>
                                {editingUserId !== user.id && (
                                    <button onClick={() => handleEditUser(user)} className="text-africa-gold hover:text-white text-xs underline">
                                        {t('changeCredentials')}
                                    </button>
                                )}
                            </div>

                            {editingUserId === user.id ? (
                                <div className="mt-4 space-y-3 bg-stone-800 p-3 rounded border border-stone-700 animate-fade-in">
                                    <div>
                                        <label className="text-xs text-stone-500 block">New Username</label>
                                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-stone-900 border border-stone-600 rounded p-1 text-sm text-white"/>
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500 block">New Password</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave empty to keep" className="w-full bg-stone-900 border border-stone-600 rounded p-1 text-sm text-white"/>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setEditingUserId(null)} className="text-xs text-stone-400 hover:text-white">Cancel</button>
                                        <button onClick={() => handleSaveUser(user.id)} className="text-xs bg-africa-sunset text-white px-3 py-1 rounded flex items-center gap-1"><Save size={12}/> Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 text-sm text-stone-500">
                                    Current Username: <span className="font-mono text-stone-300">{user.username}</span>
                                </div>
                            )}
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
    </div>
  );
};