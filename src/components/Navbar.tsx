import React, { useState } from 'react';
import { Brain, User, LogOut, LayoutDashboard, MessageSquare } from 'lucide-react';
import { Subscriber } from '../types';
import { getWhatsAppSupportLink, ADMIN_WHATSAPP_DISPLAY } from '../services/firebase';

interface NavbarProps {
  currentUser: Subscriber | null;
  onOpenAuth: () => void;
  onOpenPlans?: () => void;
  onLogout: () => void;
  currentView: 'app' | 'admin';
  onNavigate: (view: 'app' | 'admin') => void;
  onOpenChat: () => void;
  onOpenSecretAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser, onOpenAuth, onOpenPlans, onLogout, currentView, onNavigate, onOpenChat, onOpenSecretAdmin
}) => {
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (e.altKey) { onOpenSecretAdmin(); return; }
    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);
    if (nextClicks >= 3) {
      setLogoClicks(0);
      onOpenSecretAdmin();
    } else {
      onNavigate('app');
      setTimeout(() => setLogoClicks(0), 1200);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-cyan-900/30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        
        <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={handleLogoClick} title="ZAP BET IA">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-black tracking-tight uppercase bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                ZAP BET <span className="text-white">IA</span>
              </h1>
            </div>
            <p className="text-[9px] font-extrabold text-cyan-500 tracking-widest uppercase">
              Inteligência Artificial Esportiva
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button onClick={onOpenChat} className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black px-4 py-2 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-purple-500/20 transition-all hover:scale-105">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Nova Análise</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              {currentUser.role === 'admin' && (
                <button onClick={() => onNavigate(currentView === 'admin' ? 'app' : 'admin')} className={`flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border transition ${currentView === 'admin' ? 'bg-red-600 text-white border-red-600' : 'bg-red-950/50 text-red-400 border-red-900 hover:bg-red-900/50'}`}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{currentView === 'admin' ? 'App' : 'Admin'}</span>
                </button>
              )}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border ${currentUser.status === 'teste' ? 'bg-amber-950/50 border-amber-700 text-amber-400' : 'bg-emerald-950/50 border-emerald-700 text-emerald-400'}`}>
                <div className={`w-2 h-2 rounded-full ${currentUser.status === 'teste' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                <span className="text-xs font-bold max-w-[100px] md:max-w-[140px] truncate">{currentUser.name}</span>
              </div>
              <button onClick={onLogout} className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded-2xl text-xs font-bold transition" title="Sair">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black px-4 py-2 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all hover:scale-105">
              Entrar / Assinar
            </button>
          )}
        </div>
      </div>
    </header>
  );
};