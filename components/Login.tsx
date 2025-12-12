import React, { useState } from 'react';
import { db } from '../services/dataService';
import { User } from '../types';
import { DEMO_USERS } from '../constants';
import { Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.login(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md bg-stone-800 p-8 rounded-2xl shadow-2xl border border-stone-700">
        <div className="flex justify-center mb-6 text-africa-gold">
            <Lock size={40} />
        </div>
        <h2 className="text-2xl font-serif text-center text-white mb-6">Staff Access</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-stone-900 border border-stone-600 rounded p-3 text-white focus:border-africa-sunset outline-none"
              placeholder="e.g. chef, admin, owner"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-stone-900 border border-stone-600 rounded p-3 text-white focus:border-africa-sunset outline-none"
              placeholder="Demo: (any)"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-africa-sunset text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors">
            Login
          </button>
        </form>
        <div className="mt-6 pt-6 border-t border-stone-700 text-xs text-stone-500">
           <p className="mb-2 font-bold">Demo Credentials:</p>
           <ul className="list-disc pl-4 space-y-1">
             {DEMO_USERS.map(u => (
               <li key={u.id}>User: <span className="text-stone-300">{u.username}</span> ({u.role})</li>
             ))}
           </ul>
        </div>
      </div>
    </div>
  );
};