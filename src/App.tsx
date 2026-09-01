import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OrlaAIChat } from './components/OrlaAIChat';
import { WelcomeAuthScreen } from './components/WelcomeAuthScreen';
import { AuthModal } from './components/AuthModal';
import { VipSubscriptionModal } from './components/VipSubscriptionModal';
import { AdminSecretLoginModal } from './components/AdminSecretLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Subscriber } from './types';
import { 
  getStoredCurrentUser, 
  logoutSubscriber, 
  checkAndUpdateUserTrial, 
  getRemainingTrialHours 
} from './services/firebase';
import { Brain, Sparkles } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'app' | 'admin'>('app');
  const [currentUser, setCurrentUser] = useState<Subscriber | null>(null);
  const [trialTimeLeft, setTrialTimeLeft] = useState<number>(0);
  
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPlansOpen, setIsPlansOpen] = useState<boolean>(false);
  const [isSecretAdminOpen, setIsSecretAdminOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const stored = getStoredCurrentUser();
    if (stored) {
      const updated = checkAndUpdateUserTrial(stored);
      setCurrentUser(updated);
      if (updated.status === 'teste') setTrialTimeLeft(getRemainingTrialHours(updated));
    }
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.status !== 'teste') return;
    const interval = setInterval(() => {
      const remaining = getRemainingTrialHours(currentUser);
      setTrialTimeLeft(remaining);
      if (remaining <= 0) {
        const updated = checkAndUpdateUserTrial(currentUser);
        setCurrentUser(updated);
        showToast('Seu período de teste de 24h chegou ao fim. Assine o plano para continuar!', 'error');
        clearInterval(interval);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = async () => {
    await logoutSubscriber();
    setCurrentUser(null);
    setCurrentView('app');
    showToast('Você saiu da sua conta com sucesso.', 'info');
  };

  const isUserBlockedOrExpired = currentUser && (currentUser.status === 'teste_expirado' || currentUser.status === 'bloqueado');

  if (!currentUser && currentView !== 'admin') {
    return (
      <>
        <WelcomeAuthScreen
          onSuccess={(user) => {
            setCurrentUser(user);
            if (user.status === 'teste') setTrialTimeLeft(getRemainingTrialHours(user));
            showToast(`Bem-vindo à ZAP BET IA, ${user.name}!`, 'success');
          }}
          onShowToast={showToast}
          onOpenSecretAdmin={() => setIsSecretAdminOpen(true)}
        />
        <AdminSecretLoginModal
          isOpen={isSecretAdminOpen}
          onClose={() => setIsSecretAdminOpen(false)}
          onSuccess={(admin) => {
            setCurrentUser(admin);
            setCurrentView('admin');
            showToast(`Painel Master Admin liberado!`, 'success');
          }}
          onShowToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPlans={() => setIsPlansOpen(true)}
        onLogout={handleLogout}
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSecretAdmin={() => setIsSecretAdminOpen(true)}
      />

      {currentUser && currentUser.status === 'teste' && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-md sticky top-[65px] z-30 animate-fadeIn">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span>🎉 <strong>Teste Grátis Ativo:</strong> restam ~<span className="bg-black/30 px-2 py-0.5 rounded-md font-mono text-sm tracking-wider">{trialTimeLeft}h</span></span>
            </div>
            <button onClick={() => setIsPlansOpen(true)} className="bg-white text-orange-700 hover:bg-orange-50 font-black px-3 py-1 rounded-xl uppercase tracking-wider text-[11px] shadow transition hover:scale-105">
              Assinar Agora (R$ 9,90)
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {currentView === 'admin' ? (
          <AdminDashboard onBackToApp={() => setCurrentView('app')} onShowToast={showToast} />
        ) : isUserBlockedOrExpired ? (
          <div className="max-w-2xl mx-auto my-6 bg-slate-900 rounded-3xl p-6 sm:p-10 border border-amber-700/50 shadow-2xl animate-fadeIn text-center">
            <div className="w-20 h-20 rounded-full bg-amber-950/50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-4 border-4 border-amber-900/50 shadow-inner">
              <Brain className="w-9 h-9" />
            </div>
            <div className="inline-block bg-amber-950/50 text-amber-400 font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-full mb-3 border border-amber-800">
              {currentUser?.status === 'teste_expirado' ? 'Teste de 24h Expirado' : 'Acesso Bloqueado'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Desbloqueie toda a inteligência da ZAP BET IA
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
              Tenha acesso completo às análises, relatórios e recursos inteligentes em um único plano por apenas R$ 9,90/mês.
            </p>
            <div className="mt-8">
              <button onClick={() => setIsPlansOpen(true)} className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-8 py-3 rounded-2xl text-sm uppercase tracking-wider shadow-lg transition hover:scale-105">
                Assinar Plano Avançado (R$ 9,90/mês)
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-140px)] flex flex-col">
            {!isChatOpen ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fadeIn">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-cyan-400 p-1 shadow-2xl shadow-cyan-500/25 mb-6">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                    <Brain className="w-12 h-12 text-cyan-400" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-white mb-2">ZAP BET IA</h2>
                <p className="text-slate-400 max-w-md mb-8">Sua central premium de inteligência artificial para análises táticas, comparação de times e interpretação de odds.</p>
                <button onClick={() => setIsChatOpen(true)} className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black px-8 py-3 rounded-2xl text-sm uppercase tracking-wider shadow-lg transition hover:scale-105">
                  Iniciar Nova Análise
                </button>
              </div>
            ) : (
              <div className="flex-1 bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                {/* ✅ CORREÇÃO: Prop 'games' removida daqui */}
                <OrlaAIChat 
                  isOpen={true} 
                  onClose={() => setIsChatOpen(false)} 
                  onShowToast={showToast} 
                />
              </div>
            )}
          </div>
        )}
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={(user) => { setCurrentUser(user); if (user.status === 'teste') setTrialTimeLeft(getRemainingTrialHours(user)); showToast(`Autenticado como ${user.name}`, 'success'); }} onShowToast={showToast} onOpenPlans={() => { setIsAuthOpen(false); setIsPlansOpen(true); }} />
      <VipSubscriptionModal isOpen={isPlansOpen} onClose={() => setIsPlansOpen(false)} onOpenRegister={() => setIsAuthOpen(true)} userName={currentUser?.name} />
      <AdminSecretLoginModal isOpen={isSecretAdminOpen} onClose={() => setIsSecretAdminOpen(false)} onSuccess={(admin) => { setCurrentUser(admin); setCurrentView('admin'); showToast(`Painel Master Admin liberado!`, 'success'); }} onShowToast={showToast} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}