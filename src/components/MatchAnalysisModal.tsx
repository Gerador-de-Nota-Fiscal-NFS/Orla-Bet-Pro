import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, Sparkles, BarChart2, CornerRightDown, PlusCircle, MessageSquare, History } from 'lucide-react';
import { GameFixture, H2HMatch, BetSelection } from '../types';
import { calculateProbabilities, fetchHeadToHead } from '../services/apiSports';
import { getMascotData } from '../services/mascotService';

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
  const [h2hList, setH2hList] = useState<H2HMatch[]>([]);
  const [loadingH2h, setLoadingH2h] = useState(false);

  useEffect(() => {
    if (game) {
      setLoadingH2h(true);
      fetchHeadToHead(game.teams.home.id, game.teams.away.id)
        .then(res => setH2hList(res))
        .catch(() => setH2hList([]))
        .finally(() => setLoadingH2h(false));
    }
  }, [game]);

  if (!game) return null;

  const probs = calculateProbabilities(game.fixture.id, game.teams.home.id, game.teams.away.id, h2hList);
  const homeMascot = getMascotData(game.teams.home.name);
  const awayMascot = getMascotData(game.teams.away.name);

  const vipBetSelection: BetSelection = {
    fixtureId: game.fixture.id,
    matchName: `${game.teams.home.name} x ${game.teams.away.name}`,
    leagueName: game.league.name,
    marketName: 'Dica VIP Algorítmica',
    selection: probs.vipSuggestion,
    odd: 1.85,
    prob: probs.confidenceScore,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4 animate-fadeIn">
      <div 
        id="match-analysis-modal-content"
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-cyan-100 flex flex-col custom-scrollbar"
      >
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
              {game.league.name}
            </span>
            <h3 className="text-lg md:text-xl font-black uppercase tracking-tight mt-1 flex items-center gap-2">
              <span>{game.teams.home.name}</span>
              <span className="text-cyan-200">vs</span>
              <span>{game.teams.away.name}</span>
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-6">
          
          {/* Teams / Mascots Visual Banner */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-center">
              <div 
                className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-md mb-2 border-2 border-white"
                style={{ background: homeMascot.bg }}
              >
                {homeMascot.emoji}
              </div>
              <p className="text-xs font-black text-slate-800">{game.teams.home.name}</p>
              <p className="text-[10px] text-cyan-600 font-bold">{homeMascot.nickname}</p>
              <p className="text-sm font-black text-emerald-600 mt-1">{probs.home}% Chance</p>
            </div>

            <div className="text-center">
              <div 
                className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-2xl shadow-md mb-2 border-2 border-white"
                style={{ background: awayMascot.bg }}
              >
                {awayMascot.emoji}
              </div>
              <p className="text-xs font-black text-slate-800">{game.teams.away.name}</p>
              <p className="text-[10px] text-cyan-600 font-bold">{awayMascot.nickname}</p>
              <p className="text-sm font-black text-cyan-600 mt-1">{probs.away}% Chance</p>
            </div>
          </div>

          {/* Statistical Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-cyan-50/70 border border-cyan-200 p-3 rounded-2xl text-center">
              <span className="text-[9px] font-black text-cyan-800 uppercase tracking-wider block">
                Expectativa Gols (xG)
              </span>
              <span className="text-xl font-black text-slate-800 mt-1 block">
                {probs.expectedGoals}
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                {probs.over25Prob > 50 ? 'Over 1.5 Favorável' : 'Under 3.5 Favorável'}
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl text-center">
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider block">
                Escanteios Previstos
              </span>
              <span className="text-xl font-black text-emerald-700 mt-1 block">
                {probs.expectedCorners}+
              </span>
              <span className="text-[9px] text-slate-500 font-medium">Linha Asiática</span>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-2xl text-center">
              <span className="text-[9px] font-black text-purple-800 uppercase tracking-wider block">
                Ambas Marcam (BTTS)
              </span>
              <span className="text-xl font-black text-purple-700 mt-1 block">
                {probs.bttsProb}%
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                Odd @{probs.odds.bttsYes.toFixed(2)}
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-2xl text-center">
              <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider block">
                Maior Favorito
              </span>
              <span className="text-sm font-black text-amber-900 mt-1.5 block truncate">
                {probs.favorite === 'home' ? game.teams.home.name : probs.favorite === 'away' ? game.teams.away.name : 'Equilíbrio'}
              </span>
              <span className="text-[9px] text-amber-700 font-bold">Confiança {probs.confidenceScore}%</span>
            </div>
          </div>

          {/* Sugestão VIP Card */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                Recomendação Algorítmica Orla Bet
              </span>
              <p className="text-sm font-black uppercase mt-1">
                {probs.vipSuggestion}
              </p>
            </div>
            <button
              onClick={() => {
                onAddToBetslip(vipBetSelection);
                onClose();
              }}
              className="bg-white hover:bg-slate-100 text-emerald-800 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Apostar na Dica</span>
            </button>
          </div>

          {/* Histórico Direto (Head-to-Head) */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2.5 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-600" />
              <span>Últimos Confrontos Diretos (H2H)</span>
            </h4>

            {loadingH2h ? (
              <div className="text-center py-4 text-xs text-cyan-600 font-bold animate-pulse">
                Buscando histórico...
              </div>
            ) : h2hList.length > 0 ? (
              <div className="space-y-2">
                {h2hList.slice(0, 4).map((h, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-medium">
                    <span className="text-slate-500 text-[10px]">
                      {new Date(h.fixture.date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-bold text-slate-800">
                      {h.teams.home.name} <span className="font-mono text-cyan-700">{h.goals.home} x {h.goals.away}</span> {h.teams.away.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{h.league.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">Nenhum confronto direto recente registrado.</p>
            )}
          </div>

          {/* AI Shortcut Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                onAskAI(game);
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition shadow-md shadow-purple-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Pedir Parecer Tático à Orla IA Universal</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
