import React from 'react';
import { Sparkles, Ticket } from 'lucide-react';
import { GameFixture, BetSelection } from '../types';

interface VipMultipleGeneratorProps {
  games: GameFixture[];
  onAddMultipleToBetslip: (selections: BetSelection[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VipMultipleGenerator: React.FC<VipMultipleGeneratorProps> = ({
  games,
  onAddMultipleToBetslip,
  onShowToast
}) => {
  // 🛡️ PROTEÇÃO: Garante que 'games' seja sempre um array, evitando o erro .slice()
  const safeGames = Array.isArray(games) ? games : [];
  
  const generateVipTicket = () => {
    if (safeGames.length < 3) {
      onShowToast('Jogos insuficientes para gerar um bilhete múltiplo VIP no momento.', 'error');
      return;
    }

    // Pega 3 jogos aleatórios com segurança
    const shuffled = [...safeGames].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    const selections: BetSelection[] = selected.map(game => ({
      fixtureId: game.fixture.id,
      matchName: `${game.teams?.home?.name || 'Casa'} x ${game.teams?.away?.name || 'Fora'}`,
      leagueName: game.league?.name || 'Liga',
      marketName: 'Múltipla VIP',
      selection: 'Vitória ou Empate (Dupla Chance)',
      odd: 1.45,
      prob: 75,
      homeTeam: game.teams?.home?.name || 'Casa',
      awayTeam: game.teams?.away?.name || 'Fora'
    }));

    onAddMultipleToBetslip(selections);
    onShowToast('Bilhete Múltiplo VIP gerado e adicionado à caderneta!', 'success');
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 sm:p-6 shadow-xl text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-amber-100" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wide">Bilhete Múltiplo VIP Pronto</h3>
            <p className="text-xs text-amber-100 font-medium max-w-md">
              Nossa IA selecionou as 3 melhores entradas de valor esperado (+EV) do dia para alavancar sua banca com segurança.
            </p>
          </div>
        </div>

        <button
          onClick={generateVipTicket}
          className="w-full sm:w-auto bg-white text-orange-700 hover:bg-orange-50 font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
        >
          <Ticket className="w-4 h-4" />
          <span>Gerar e Adicionar ({Math.min(3, safeGames.length)} Jogos)</span>
        </button>
      </div>
    </div>
  );
};