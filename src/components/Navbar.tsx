import React from 'react';
import { RefreshCw, Search, ShieldCheck, Ticket, User, LogOut, LayoutDashboard, Sparkles, Crown } from 'lucide-react';
import { Subscriber } from '../types';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  currentUser: Subscriber | null;
  onOpenAuth: () => void;
  onOpenPlans?: () => void;
  onLogout: () => void;
  currentView: 'app' | 'admin';
  onNavigate: (view: 'app' | 'admin') => void;
  betslipCount: number;
  onToggleBetslip: () => void;
  onOpenChat: () => void;
  onOpenSecretAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading,
  currentUser,
  onOpenAuth,
  onOpenPlans,
  onLogout,
  currentView,
  onNavigate,
  betslipCount,
  onToggleBetslip,
  onOpenChat,
  onOpenSecretAdmin
}) => {
  const [logoClicks, setLogoClicks] = React.useState(0);

  const handleLogoClick = (e: React.MouseEvent) => {
    // If alt key is pressed or clicked 3 times rapidly, trigger master admin login
    if (e.altKey) {
      onOpenSecretAdmin();
      return;
    }

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
    <header id="main-header" className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-cyan-100 shadow-sm shadow-cyan-900/5 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        
        {/* Brand Logo */}
        <div 
          id="brand-logo"
          className="flex items-center gap-3 cursor-pointer select-none group" 
          onClick={handleLogoClick}
          title="Orla Bet Pro"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <span className="text-2xl">🦁</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-cyan-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Orla <span className="text-cyan-500">Bet</span>
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
                PRO VIP
              </span>
            </div>
            <p className="text-[9px] font-extrabold text-emerald-600 tracking-widest uppercase">
              Inteligência Artificial Universal & Mascotes
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <input 
              id="nav-search-input"
              type="text" 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar time ou mascote..." 
              className="w-full bg-slate-100/90 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-800 placeholder-slate-400 font-medium shadow-inner transition"
            />
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button 
            id="nav-refresh-btn"
            onClick={onRefresh} 
            disabled={isLoading}
            className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 rounded-2xl transition-all text-cyan-600 shadow-sm hover:border-cyan-300 disabled:opacity-50"
            title="Atualizar Dados e Odds"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* AI Quick Chat Button */}
          <button
            id="nav-ai-chat-btn"
            onClick={onOpenChat}
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black px-3.5 py-2 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-purple-500/20 transition-all hover:scale-105"
            title="Abrir Orla IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Orla IA</span>
          </button>

          {/* Betslip Toggle Button */}
          <button
            id="nav-betslip-btn"
            onClick={onToggleBetslip}
            className="relative bg-emerald-500 hover:bg-emerald-600 text-white font-black p-2.5 md:px-4 md:py-2 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
            title="Bilhete de Apostas"
          >
            <Ticket className="w-4 h-4" />
            <span className="hidden md:inline">Caderneta</span>
            {betslipCount > 0 && (
              <span className="bg-amber-400 text-amber-950 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                {betslipCount}
              </span>
            )}
          </button>

          {/* VIP Plans Button */}
          {onOpenPlans && (
            <button
              id="nav-plans-btn"
              onClick={onOpenPlans}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black p-2.5 md:px-3.5 md:py-2 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 hover:scale-105"
              title="Planos & Assinatura VIP"
            >
              <Crown className="w-4 h-4" />
              <span className="hidden md:inline">Planos VIP</span>
            </button>
          )}

          {/* User / Auth State */}
          <div id="auth-controls">
            {currentUser ? (
              <div className="flex items-center gap-2">
                {currentUser.role === 'admin' && (
                  <button 
                    id="nav-admin-toggle-btn"
                    onClick={() => onNavigate(currentView === 'admin' ? 'app' : 'admin')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border transition ${
                      currentView === 'admin'
                        ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20'
                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{currentView === 'admin' ? 'Ver Jogos' : 'Painel Admin'}</span>
                  </button>
                )}

                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border ${
                  currentUser.status === 'teste'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    currentUser.status === 'teste' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'
                  }`} />
                  <span className="text-xs font-bold max-w-[100px] md:max-w-[140px] truncate">
                    {currentUser.name}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                    currentUser.status === 'teste' 
                      ? 'bg-amber-200 text-amber-950 font-black' 
                      : 'bg-cyan-200 text-cyan-900'
                  }`}>
                    {currentUser.status === 'teste' ? 'Teste Grátis' : currentUser.plan.replace('Plano ', '')}
                  </span>
                </div>

                <button 
                  id="nav-logout-btn"
                  onClick={onLogout} 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-2xl text-xs font-bold transition"
                  title="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                id="nav-login-btn"
                onClick={onOpenAuth} 
                className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black px-4 py-2 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all hover:scale-105"
              >
                Entrar / Assinar
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
