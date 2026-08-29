import React from 'react';
import { GameFixture, BetSelection } from '../types';
import { Sparkles, BarChart2, PlusCircle } from 'lucide-react';
import { calculateProbabilities } from '../services/apiSports';

interface GameCardProps {
  game: GameFixture;
  onOpenAnalysis: (game: GameFixture) => void;
  onAddToBetslip: (bet: BetSelection) => void;
  onAskAI: (game: GameFixture) => void;
}

function getDynamicMascot(teamName: string) {
  const name = (teamName || 'Futebol').trim();
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  const emoji = (cleanName.substring(0, 3) || 'FUT').toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  const primaryColor = `hsl(${hue}, 70%, 45%)`;
  const secondaryColor = `hsl(${(hue + 40) % 360}, 65%, 25%)`;
  const bg = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

  return { emoji, bg };
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onOpenAnalysis,
  onAddToBetslip,
  onAskAI
}) => {
  const probs = calculateProbabilities(game.fixture.id, game.teams.home.id, game.teams.away.id, []);
  const homeMascot = getDynamicMascot(game.teams.home.name);
  const awayMascot = getDynamicMascot(game.teams.away.name);

  const quickBet: BetSelection = {
    fixtureId: game.fixture.id,
    matchName: `${game.teams.home.name} x ${game.teams.away.name}`,
    leagueName: game.league.name,
    marketName: 'Dica Algorítmica',
    selection: probs.vipSuggestion,
    odd: 1.85,
    prob: probs.confidenceScore,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100 flex flex-col justify-between hover:shadow-2xl transition duration-300">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full border border-cyan-100">
          {game.league.name}
        </span>
        <span className="text-[10px] font-bold text-slate-400">
          {new Date(game.fixture.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-7 items-center gap-2 my-2">
        <div className="col-span-3 text-center flex flex-col items-center">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm text-white font-black shadow-md mb-1.5"
            style={{ background: homeMascot.bg }}
          >
            {homeMascot.emoji}
          </div>
          <span className="text-xs font-black text-slate-800 line-clamp-1">{game.teams.home.name}</span>
          <span className="text-[10px] font-bold text-emerald-600">{probs.home}%</span>
        </div>

        <div className="col-span-1 text-center font-black text-slate-300 text-xs">
          VS
        </div>

        <div className="col-span-3 text-center flex flex-col items-center">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm text-white font-black shadow-md mb-1.5"
            style={{ background: awayMascot.bg }}
          >
            {awayMascot.emoji}
          </div>
          <span className="text-xs font-black text-slate-800 line-clamp-1">{game.teams.away.name}</span>
          <span className="text-[10px] font-bold text-cyan-600">{probs.away}%</span>
        </div>
      </div>

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 my-3 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Sugestão Orla Bet</span>
          <span className="text-xs font-black text-slate-800">{probs.vipSuggestion}</span>
        </div>
        <button
          onClick={() => onAddToBetslip(quickBet)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl transition shadow-sm flex items-center gap-1 text-[10px] font-bold uppercase"
          title="Adicionar ao Bilhete"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>@1.85</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onOpenAnalysis(game)}
          className="py-2.5 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Análise</span>
        </button>

        <button
          onClick={() => onAskAI(game)}
          className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Orla IA</span>
        </button>
      </div>
    </div>
  );
};
