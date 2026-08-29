import React, { useState } from 'react';
import { Sparkles, PlusCircle, Trash2, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { BetSelection, GameFixture } from '../types';

interface VipMultipleGeneratorProps {
  fixtures: GameFixture[];
  onAddToBetslip: (bet: BetSelection) => void;
}

export const VipMultipleGenerator: React.FC<VipMultipleGeneratorProps> = ({ fixtures, onAddToBetslip }) => {
  const [selectedMatches, setSelectedMatches] = useState<GameFixture[]>([]);

  const toggleMatch = (game: GameFixture) => {
    if (selectedMatches.some(m => m.fixture.id === game.fixture.id)) {
      setSelectedMatches(selectedMatches.filter(m => m.fixture.id !== game.fixture.id));
    } else {
      if (selectedMatches.length < 5) {
        setSelectedMatches([...selectedMatches, game]);
      }
    }
  };

  const generateMultiple = () => {
    if (selectedMatches.length === 0) return;

    const combinedName = selectedMatches.map(m => `${m.teams.home.name} x ${m.teams.away.name}`).join(' + ');
    const calculatedOdds = Number((1.50 * selectedMatches.length).toFixed(2));

    const multipleBet: BetSelection = {
      fixtureId: selectedMatches[0].fixture.id,
      matchName: `Múltipla VIP (${selectedMatches.length} jogos)`,
      leagueName: 'Orla Bet Special',
      marketName: 'Acumulada Algorítmica',
      selection: 'Seleção Mista Analisada',
      odd: calculatedOdds,
      prob: 85,
      homeTeam: 'Múltipla',
      awayTeam: 'VIP'
    };

    onAddToBetslip(multipleBet);
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-xl border border-purple-100 space-y-4">
      <div className="flex items-center justify-between border-b border-purple-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Gerador de Múltiplas VIP</h3>
            <p className="text-[10px] text-purple-600 font-bold">Monte sua acumulada com inteligência artificial</p>
          </div>
        </div>
        <span className="text-xs font-black bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
          {selectedMatches.length}/5 Jogos
        </span>
      </div>

      <p className="text-xs text-slate-500 font-medium">
        Selecione até 5 partidas abaixo para gerar uma cotação combinada de alta probabilidade:
      </p>

      {/* Lista de jogos disponíveis para seleção */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {fixtures.slice(0, 10).map((game) => {
          const isSelected = selectedMatches.some(m => m.fixture.id === game.fixture.id);
          return (
            <div
              key={game.fixture.id}
              onClick={() => toggleMatch(game)}
              className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                isSelected 
                  ? 'bg-purple-50/80 border-purple-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                  {game.league.name}
                </span>
                <span className="text-xs font-black text-slate-800">
                  {game.teams.home.name} vs {game.teams.away.name}
                </span>
              </div>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                isSelected ? 'bg-purple-600 text-white' : 'border border-slate-300 text-transparent'
              }`}>
                ✓
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão de Geração */}
      <button
        onClick={generateMultiple}
        disabled={selectedMatches.length === 0}
        className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 ${
          selectedMatches.length > 0
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Adicionar Múltipla ao Bilhete</span>
      </button>
    </div>
  );
};
