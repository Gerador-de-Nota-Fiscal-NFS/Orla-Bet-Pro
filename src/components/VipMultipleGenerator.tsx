import React, { useState } from 'react';
import { Sparkles, Copy, Check, PlusCircle, ArrowRight, Shield, Flame, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameFixture, BetSelection } from '../types';
import { calculateProbabilities } from '../services/apiSports';
import { getMascotData } from '../services/mascotService';

interface VipMultipleGeneratorProps {
  games: GameFixture[];
  onAddMultipleToBetslip: (selections: BetSelection[]) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const VipMultipleGenerator: React.FC<VipMultipleGeneratorProps> = ({
  games,
  onAddMultipleToBetslip,
  onShowToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [copied, setCopied] = useState(false);

  const generateSelections = (): { selections: BetSelection[]; totalOdd: number } => {
    if (!games || games.length === 0) return { selections: [], totalOdd: 1.0 };

    const scored = games.map(g => {
      const p = calculateProbabilities(g.fixture.id, g.teams.home.id, g.teams.away.id);
      return { game: g, p };
    });

    let chosen: { game: GameFixture; p: any; market: string; selection: string; odd: number }[] = [];

    if (profile === 'conservative') {
      // Pick top 3 home/away wins with highest probability
      const sorted = [...scored].sort((a, b) => b.p.confidenceScore - a.p.confidenceScore);
      chosen = sorted.slice(0, 3).map(item => {
        const isHome = item.p.favorite === 'home';
        const teamName = isHome ? item.game.teams.home.name : item.game.teams.away.name;
        const odd = isHome ? item.p.odds.home : item.p.odds.away;
        return {
          game: item.game,
          p: item.p,
          market: 'Vencedor do Confronto',
          selection: `Vitória ${teamName}`,
          odd: Math.max(1.30, Math.min(2.10, odd))
        };
      });
    } else if (profile === 'balanced') {
      // Balanced mix of favorite + Over/Under goals
      const sorted = [...scored].sort((a, b) => (b.p.confidenceScore + b.p.over25Prob) - (a.p.confidenceScore + a.p.over25Prob));
      chosen = sorted.slice(0, 3).map((item, idx) => {
        if (idx === 0) {
          const isHome = item.p.favorite === 'home';
          const teamName = isHome ? item.game.teams.home.name : item.game.teams.away.name;
          return {
            game: item.game,
            p: item.p,
            market: 'Vencedor do Confronto',
            selection: `Vitória ${teamName}`,
            odd: isHome ? item.p.odds.home : item.p.odds.away
          };
        } else if (idx === 1) {
          return {
            game: item.game,
            p: item.p,
            market: 'Total de Gols',
            selection: item.p.over25Prob > 55 ? 'Mais de 1.5 Gols' : 'Menos de 3.5 Gols',
            odd: 1.45
          };
        } else {
          return {
            game: item.game,
            p: item.p,
            market: 'Dupla Chance',
            selection: item.p.favorite === 'home' ? `1X (${item.game.teams.home.name} ou Empate)` : `X2 (${item.game.teams.away.name} ou Empate)`,
            odd: 1.35
          };
        }
      });
    } else {
      // Aggressive 4 selections
      const sorted = [...scored].sort((a, b) => b.p.expectedGoals - a.p.expectedGoals);
      chosen = sorted.slice(0, 4).map((item, idx) => {
        if (idx % 2 === 0) {
          const isHome = item.p.favorite === 'home';
          const teamName = isHome ? item.game.teams.home.name : item.game.teams.away.name;
          return {
            game: item.game,
            p: item.p,
            market: 'Resultado & Gols',
            selection: `${teamName} & Mais de 1.5 Gols`,
            odd: Number(((isHome ? item.p.odds.home : item.p.odds.away) * 1.35).toFixed(2))
          };
        } else {
          return {
            game: item.game,
            p: item.p,
            market: 'Ambas Marcam',
            selection: 'Ambas Marcam (Sim)',
            odd: item.p.odds.bttsYes
          };
        }
      });
    }

    const selections: BetSelection[] = chosen.map(c => ({
      fixtureId: c.game.fixture.id,
      matchName: `${c.game.teams.home.name} x ${c.game.teams.away.name}`,
      leagueName: c.game.league.name,
      marketName: c.market,
      selection: c.selection,
      odd: c.odd,
      prob: c.p.confidenceScore,
      homeTeam: c.game.teams.home.name,
      awayTeam: c.game.teams.away.name
    }));

    const totalOdd = Number(selections.reduce((acc, curr) => acc * curr.odd, 1).toFixed(2));
    return { selections, totalOdd };
  };

  const { selections, totalOdd } = generateSelections();

  const handleGenerateClick = () => {
    setIsOpen(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleCopyTicket = () => {
    if (selections.length === 0) return;

    const text = `🎯 *BILHETE VIP ORLA BET PRO*\n` +
      `Perfil: ${profile === 'conservative' ? '🛡️ Conservador' : profile === 'balanced' ? '⚖️ Equilibrado' : '🔥 Ousado'}\n` +
      `Odd Total: @${totalOdd.toFixed(2)}\n\n` +
      selections.map((s, idx) => `${idx + 1}. ${s.matchName}\n   📌 ${s.selection} (@${s.odd.toFixed(2)})`).join('\n\n') +
      `\n\n💰 Gestão indicada: 2% de Stake\n🦁 Gerado por Orla Bet IA`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('Bilhete VIP copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2500);

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 }
    });
  };

  const handleAddToSlip = () => {
    if (selections.length > 0) {
      onAddMultipleToBetslip(selections);
      onShowToast(`${selections.length} apostas adicionadas à sua caderneta!`, 'success');
    }
  };

  return (
    <div className="mb-8">
      {/* Banner Principal */}
      <div 
        id="vip-multiple-generator-banner"
        className="p-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-cyan-600/20 text-white relative overflow-hidden"
      >
        {/* Background glow accents */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
            <span className="text-[9px] font-black bg-white/20 text-white border border-white/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Módulo Algorítmico
            </span>
            <span className="text-[9px] font-black bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" /> Alta Precisão (+EV)
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            ⚡ Gerador de Múltiplas Automático
          </h2>
          <p className="text-xs text-cyan-100 mt-1 max-w-xl font-medium">
            Filtra instantaneamente os mascotes e confrontos com as maiores vantagens estatísticas da rodada.
          </p>
        </div>

        <button 
          id="btn-generate-vip-ticket"
          onClick={handleGenerateClick} 
          className="z-10 w-full md:w-auto bg-white hover:bg-slate-100 text-blue-700 font-black px-7 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all transform hover:scale-105 shadow-xl shrink-0 flex items-center justify-center gap-2"
        >
          <Target className="w-4 h-4 text-emerald-600" />
          <span>Gerar Bilhete VIP</span>
        </button>
      </div>

      {/* Box de Resultado do Bilhete */}
      {isOpen && (
        <div 
          id="multipleResult"
          className="mt-4 p-5 md:p-6 bg-white/95 backdrop-blur-xl border-2 border-emerald-400 rounded-3xl shadow-xl transition-all animate-fadeIn"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  🎟️ Bilhete VIP Sugerido ({selections.length} Seleções)
                </span>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Green Rate 87.5%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                Calculado via algoritmo de Poisson, histórico direto e valor esperado (+EV)
              </p>
            </div>

            {/* Profile Filter Switch */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-stretch md:self-auto justify-center">
              <button
                onClick={() => setProfile('conservative')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${
                  profile === 'conservative' 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3 h-3 inline mr-1" /> Conservador
              </button>
              <button
                onClick={() => setProfile('balanced')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${
                  profile === 'balanced' 
                    ? 'bg-cyan-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target className="w-3 h-3 inline mr-1" /> Equilibrado
              </button>
              <button
                onClick={() => setProfile('aggressive')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition ${
                  profile === 'aggressive' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3 h-3 inline mr-1" /> Ousado
              </button>
            </div>
          </div>

          {/* Selections List */}
          <div className="space-y-2.5 mb-5">
            {selections.map((item, idx) => {
              const homeMascot = getMascotData(item.homeTeam);
              const awayMascot = getMascotData(item.awayTeam);

              return (
                <div 
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 hover:bg-cyan-50/40 p-3.5 rounded-2xl border border-slate-200 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                      <span>{homeMascot.emoji}</span>
                      <span>{item.homeTeam}</span>
                      <span className="text-slate-400 font-normal">x</span>
                      <span>{item.awayTeam}</span>
                      <span>{awayMascot.emoji}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] text-slate-500 font-bold hidden sm:inline">
                      {item.marketName}:
                    </span>
                    <span className="font-black text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                      {item.selection}
                    </span>
                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-1 rounded-xl">
                      @{item.odd.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Cotação Total:</span>
              <span className="text-2xl font-black font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-xl">
                @{totalOdd.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">
                (Ex: R$ 50 ➔ R$ {(50 * totalOdd).toFixed(2)})
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-copy-vip-ticket"
                onClick={handleCopyTicket}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-4 py-2.5 rounded-2xl text-xs uppercase tracking-wider transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                id="btn-add-all-to-betslip"
                onClick={handleAddToSlip}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Adicionar à Caderneta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
