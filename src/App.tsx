import React, { useState, useEffect, useMemo } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  StatsOverview 
} from './components/StatsOverview';
import { 
  VipMultipleGenerator 
} from './components/VipMultipleGenerator';
import { 
  LeagueFilter 
} from './components/LeagueFilter';
import { 
  GameCard 
} from './components/GameCard';
import { 
  MatchAnalysisModal 
} from './components/MatchAnalysisModal';
import { 
  BetslipDrawer 
} from './components/BetslipDrawer';
import { 
  AdminDashboard 
} from './components/AdminDashboard';
import { 
  AuthModal 
} from './components/AuthModal';
import { 
  VipSubscriptionModal 
} from './components/VipSubscriptionModal';
import { 
  AdminSecretLoginModal 
} from './components/AdminSecretLoginModal';
import { 
  OrlaAIChat 
} from './components/OrlaAIChat';
import { 
  ToastContainer, 
  ToastMessage 
} from './components/Toast';

import { 
  GameFixture, 
  BetSelection, 
  Subscriber 
} from './types';
import { 
  fetchDailyGames 
} from './services/apiSports';
import { 
  getStoredCurrentUser, 
  logoutSubscriber 
} from './services/firebase';
import { 
  Sparkles, 
  Radio, 
  AlertCircle, 
  RefreshCw, 
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

export function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<'app' | 'admin'>('app');
  const [currentUser, setCurrentUser] = useState<Subscriber | null>(null);
  
  // Games & Filter State
  const [games, setGames] = useState<GameFixture[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyLive, setOnlyLive] = useState<boolean>(false);

  // Modals & Drawers State
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameFixture | null>(null);
  const [isBetslipOpen, setIsBetslipOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPlansOpen, setIsPlansOpen] = useState<boolean>(false);
  const [isSecretAdminOpen, setIsSecretAdminOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatGameContext, setChatGameContext] = useState<GameFixture | undefined>(undefined);

  // Betslip Store
  const [betslip, setBetslip] = useState<BetSelection[]>([]);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initial user auth check
  useEffect(() => {
    const stored = getStoredCurrentUser();
    if (stored) {
      if (stored.status === 'bloqueado') {
        logoutSubscriber();
        showToast('Sua assinatura foi bloqueada. Contate o administrador.', 'error');
      } else {
        setCurrentUser(stored);
      }
    }
  }, []);

  // Fetch Games on Date Change
  const loadGames = async (dateStr: string) => {
    setLoading(true);
    try {
      const fetched = await fetchDailyGames(dateStr);
      setGames(fetched);
    } catch (err: any) {
      showToast('Aviso: exibindo jogos em modo de resiliência esportiva.', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames(selectedDate);
  }, [selectedDate]);

  // Live match counter
  const liveMatchesCount = useMemo(() => {
    return games.filter(g => ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(g.fixture.status.short)).length;
  }, [games]);

  // Filtered Games Logic
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // 1. League Filter
      if (selectedLeague !== 'all' && String(game.league.id) !== selectedLeague) {
        return false;
      }

      // 2. Only Live Filter
      if (onlyLive) {
        const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(game.fixture.status.short);
        if (!isLive) return false;
      }

      // 3. Search Query (Home, Away, League, Mascot Nickname)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const homeName = game.teams.home.name.toLowerCase();
        const awayName = game.teams.away.name.toLowerCase();
        const leagueName = game.league.name.toLowerCase();
        if (!homeName.includes(q) && !awayName.includes(q) && !leagueName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [games, selectedLeague, onlyLive, searchQuery]);

  // Betslip Management
  const handleToggleBet = (bet: BetSelection) => {
    setBetslip(prev => {
      const exists = prev.some(b => b.fixtureId === bet.fixtureId && b.selection === bet.selection);
      if (exists) {
        showToast(`Seleção "${bet.selection}" removida da caderneta.`, 'info');
        return prev.filter(b => !(b.fixtureId === bet.fixtureId && b.selection === bet.selection));
      } else {
        showToast(`Seleção "${bet.selection}" (@${bet.odd.toFixed(2)}) adicionada!`, 'success');
        return [...prev, bet];
      }
    });
  };

  const handleAddMultipleToBetslip = (selections: BetSelection[]) => {
    setBetslip(prev => {
      const existingKeys = new Set(prev.map(p => `${p.fixtureId}-${p.selection}`));
      const newItems = selections.filter(s => !existingKeys.has(`${s.fixtureId}-${s.selection}`));
      return [...prev, ...newItems];
    });
    setIsBetslipOpen(true);
  };

  const handleRemoveBet = (fixtureId: number, selection: string) => {
    setBetslip(prev => prev.filter(b => !(b.fixtureId === fixtureId && b.selection === selection)));
  };

  const handleClearBetslip = () => {
    setBetslip([]);
    showToast('Caderneta de apostas limpa.', 'info');
  };

  const isBetSelected = (fixtureId: number, selection: string) => {
    return betslip.some(b => b.fixtureId === fixtureId && b.selection === selection);
  };

  const handleLogout = async () => {
    await logoutSubscriber();
    setCurrentUser(null);
    setCurrentView('app');
    showToast('Você saiu da sua conta com sucesso.', 'info');
  };

  const handleAskAI = (game: GameFixture) => {
    setChatGameContext(game);
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-cyan-50/20 to-slate-100 text-slate-900 flex flex-col selection:bg-cyan-500 selection:text-white">
      
      {/* 1. Global Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => loadGames(selectedDate)}
        isLoading={loading}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPlans={() => setIsPlansOpen(true)}
        onLogout={handleLogout}
        currentView={currentView}
        onNavigate={setCurrentView}
        betslipCount={betslip.length}
        onToggleBetslip={() => setIsBetslipOpen(true)}
        onOpenChat={() => {
          setChatGameContext(undefined);
          setIsChatOpen(true);
        }}
        onOpenSecretAdmin={() => setIsSecretAdminOpen(true)}
      />

      {/* 2. Main Content Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        
        {currentView === 'admin' ? (
          <AdminDashboard
            onBackToApp={() => setCurrentView('app')}
            onShowToast={showToast}
          />
        ) : (
          <div className="space-y-6">
            
            {/* KPI Performance Bar */}
            <StatsOverview gamesCount={games.length} />

            {/* VIP Multiple Generator Banner */}
            <VipMultipleGenerator
              games={games}
              onAddMultipleToBetslip={handleAddMultipleToBetslip}
              onShowToast={showToast}
            />

            {/* Filters: Dates, Leagues, Live */}
            <LeagueFilter
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedLeague={selectedLeague}
              onLeagueChange={setSelectedLeague}
              onlyLive={onlyLive}
              onToggleOnlyLive={() => setOnlyLive(!onlyLive)}
              liveCount={liveMatchesCount}
            />

            {/* Games Grid Container */}
            <section id="games-grid-section">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <span>Confrontos em Destaque</span>
                  <span className="bg-cyan-100 text-cyan-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                    {filteredGames.length} {filteredGames.length === 1 ? 'partida' : 'partidas'}
                  </span>
                </h3>

                {searchQuery && (
                  <span className="text-xs text-slate-500 font-semibold">
                    Filtrando por: <strong className="text-cyan-700">"{searchQuery}"</strong>
                  </span>
                )}
              </div>

              {/* Loading Skeletons */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm animate-pulse space-y-4">
                      <div className="h-4 bg-slate-200 rounded-full w-1/3" />
                      <div className="flex justify-between items-center py-4">
                        <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
                        <div className="w-12 h-8 bg-slate-200 rounded-xl" />
                        <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full w-full" />
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-10 bg-slate-200 rounded-xl" />
                        <div className="h-10 bg-slate-200 rounded-xl" />
                        <div className="h-10 bg-slate-200 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 shadow-sm max-w-lg mx-auto my-8">
                  <div className="w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center text-3xl mx-auto mb-4">
                    🔍
                  </div>
                  <h4 className="text-base font-black text-slate-800 uppercase">
                    Nenhum confronto encontrado
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {onlyLive 
                      ? 'Não há partidas ao vivo neste momento. Desative o filtro "Ao Vivo" para visualizar os próximos jogos.' 
                      : 'Experimente selecionar outra liga ou data nos filtros acima.'}
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    {onlyLive && (
                      <button
                        onClick={() => setOnlyLive(false)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 font-black px-4 py-2 rounded-2xl text-xs uppercase"
                      >
                        Ver Todos os Jogos
                      </button>
                    )}
                    {selectedLeague !== 'all' && (
                      <button
                        onClick={() => setSelectedLeague('all')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-4 py-2 rounded-2xl text-xs uppercase"
                      >
                        Limpar Filtro de Liga
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredGames.map((game) => (
                    <GameCard
                      key={game.fixture.id}
                      game={game}
                      onOpenAnalysis={(g) => setSelectedGameForModal(g)}
                      onToggleBet={handleToggleBet}
                      isBetSelected={isBetSelected}
                    />
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

      </main>

      {/* 3. Floating Quick Action for Orla IA */}
      <button
        id="floating-ai-btn"
        onClick={() => {
          setChatGameContext(undefined);
          setIsChatOpen(true);
        }}
        className="fixed bottom-5 left-5 z-40 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3.5 rounded-full shadow-2xl shadow-purple-600/30 flex items-center gap-2.5 transition-transform hover:scale-105 border-2 border-white/50 group"
      >
        <span className="text-xl">🦁</span>
        <span className="hidden sm:inline text-xs font-black uppercase tracking-wider pr-1">
          Orla IA Universal
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </button>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦁</span>
            <span className="font-black text-slate-700 uppercase tracking-tight">Orla Bet Pro</span>
            <span className="text-[10px] text-slate-400">© {new Date().getFullYear()} Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
            <span className="hover:text-cyan-600 cursor-pointer">API-Sports Football</span>
            <span>•</span>
            <span className="hover:text-cyan-600 cursor-pointer">Firebase Modular v10</span>
            <span>•</span>
            <span className="hover:text-cyan-600 cursor-pointer">Gemini AI</span>
            <span>•</span>
            {/* Subtle owner lock trigger in footer */}
            <button
              onClick={() => setIsSecretAdminOpen(true)}
              className="text-slate-300 hover:text-red-500 transition cursor-pointer p-1"
              title="Acesso Restrito"
            >
              🔒
            </button>
          </div>
        </div>
      </footer>

      {/* 5. Modals & Drawers */}
      <MatchAnalysisModal
        game={selectedGameForModal}
        onClose={() => setSelectedGameForModal(null)}
        onAddToBetslip={(bet) => {
          handleToggleBet(bet);
          setIsBetslipOpen(true);
        }}
        onAskAI={handleAskAI}
      />

      <BetslipDrawer
        isOpen={isBetslipOpen}
        onClose={() => setIsBetslipOpen(false)}
        selections={betslip}
        onRemoveSelection={handleRemoveBet}
        onClearAll={handleClearBetslip}
        onShowToast={showToast}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Autenticado como ${user.name}`, 'success');
        }}
        onShowToast={showToast}
        onOpenPlans={() => {
          setIsAuthOpen(false);
          setIsPlansOpen(true);
        }}
      />

      <VipSubscriptionModal
        isOpen={isPlansOpen}
        onClose={() => setIsPlansOpen(false)}
        onOpenRegister={() => setIsAuthOpen(true)}
      />

      <AdminSecretLoginModal
        isOpen={isSecretAdminOpen}
        onClose={() => setIsSecretAdminOpen(false)}
        onSuccess={(admin) => {
          setCurrentUser(admin);
          setCurrentView('admin');
          showToast(`Painel Master Admin liberado com sucesso!`, 'success');
        }}
        onShowToast={showToast}
      />

      <OrlaAIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        games={games}
        selectedMatch={chatGameContext}
        onShowToast={showToast}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />

    </div>
  );
}

export default App;
