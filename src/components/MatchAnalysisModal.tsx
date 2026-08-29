import React from 'react';
import { GameFixture, BetSelection } from '../types';
import { X, Sparkles, PlusCircle, TrendingUp, Users, Calendar } from 'lucide-react';

interface MatchAnalysisModalProps {
  game: GameFixture | null;
  onClose: () => void;
  onAddToBetslip: (bet: BetSelection) => void;
  onAskAI: (game: GameFixture) => void;
}

export const MatchAnalysisModal: React.FC<MatchAnalysisModalProps> = ({
  game,
  onClose,
  onAddToBetslip,
  onAskAI
}) => {
  if (!game) return null;

  const quickBet: BetSelection = {
    fixtureId: game.fixture.id,
    matchName: `${game.teams.home.name} x ${game.teams.away.name}`,
    leagueName: game.league.name,
    marketName: 'Análise Detalhada',
    selection: 'Vitória ou Empate (Dupla Chance)',
    odd: 1.45,
    prob: 75,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        
        {/* Header do Modal */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 p-4 sm:p-6 flex justify-between items-start z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full border border-cyan-100">
              {game.league.name}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              {game.teams.home.name} <span className="text-slate-400 font-bold">x</span> {game.teams.away.name}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 
                {new Date(game.fixture.date).toLocaleDateString('pt-BR')}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> 
                Próximo Confronto
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-900"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-4 sm:p-6 space-y-6">
          
          {/* Box de Insight da IA */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-black text-purple-900 uppercase tracking-wide text-sm">Insight da Orla IA</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              A análise algorítmica indica uma tendência de <strong>equilíbrio com leve vantagem para o mandante</strong>. 
              O histórico recente e a expectativa de gols (xG) sugerem um jogo com oportunidades claras, 
              mas com defesa sólida. O mercado de <strong>Dupla Chance</strong> ou <strong>Under 2.5 Gols</strong> apresenta o melhor Valor Esperado (+EV) neste confronto.
            </p>
          </div>

          {/* Grid de Estatísticas Rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
              <Users className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
              <span className="text-[10px] font-black uppercase text-slate-400 block">Probabilidade Casa</span>
              <span className="text-2xl font-black text-slate-900">48%</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
              <Users className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <span className="text-[10px] font-black uppercase text-slate-400 block">Probabilidade Fora</span>
              <span className="text-2xl font-black text-slate-900">27%</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onAddToBetslip(quickBet);
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar ao Bilhete (@1.45)</span>
            </button>

            <button
              onClick={() => {
                onAskAI(game);
                onClose();
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Pedir Análise Detalhada à IA</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};