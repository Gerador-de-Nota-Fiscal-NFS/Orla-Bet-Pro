import React, { useState } from 'react';
import { Star, BarChart3, Clock, Sparkles, Check } from 'lucide-react';
import { GameFixture, BetSelection } from '../types';
import { calculateProbabilities } from '../services/apiSports';
import { getMascotData } from '../services/mascotService';

interface GameCardProps {
  game: GameFixture;
  onOpenAnalysis: (game: GameFixture) => void;
  onToggleBet: (bet: BetSelection) => void;
  isBetSelected: (fixtureId: number, selection: string) => boolean;
}

// Team Avatar with Hybrid Official Crest & Dynamic Mascot Fallback
const TeamAvatar: React.FC<{
  teamName: string;
  logoUrl?: string;
  isFavorite?: boolean;
  winProb: number;
}> = ({ teamName, logoUrl, isFavorite, winProb }) => {
  const mascot = getMascotData(teamName);
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`text-center flex-1 p-2.5 rounded-2xl relative transition-all ${
      isFavorite ? 'bg-amber-50/80 border border-amber-300 shadow-sm' : 'bg-slate-50/60 border border-slate-100'
    }`}>
      {isFavorite && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-amber-200 uppercase tracking-wide">
          <Star className="w-2.5 h-2.5 fill-amber-950" />
          <span>Favorito</span>
        </div>
      )}

      {/* Hybrid Crest / Mascot Container */}
      <div className="w-14 h-14 mx-auto mb-2 relative flex items-center justify-center">
        {!imgError && logoUrl ? (
          <img
            src={logoUrl}
            alt={teamName}
            className="w-12 h-12 object-contain drop-shadow-md transition-transform hover:scale-110"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div 
            className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shadow-md border-2 border-white transition-transform hover:scale-110"
            style={{ background: mascot.bg }}
            title={`${teamName} (${mascot.nickname})`}
          >
            <span>{mascot.emoji}</span>
          </div>
        )}
      </div>

      <p className="text-xs font-black text-slate-800 truncate" title={teamName}>
        {teamName}
      </p>
      
      <div className="mt-1 flex items-center justify-center gap-1">
        <span className={`text-[10px] font-extrabold ${isFavorite ? 'text-amber-700 font-black' : 'text-slate-500'}`}>
          {winProb}% Win
        </span>
      </div>
    </div>
  );
};

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onOpenAnalysis,
  onToggleBet,
  isBetSelected
}) => {
  const probs = calculateProbabilities(game.fixture.id, game.teams.home.id, game.teams.away.id);
  const status = game.fixture.status.short;
  const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(status);
  const isFinished = ['FT', 'AET', 'PEN'].includes(status);
  const scoreHome = game.goals.home ?? (isLive || isFinished ? 0 : '-');
  const scoreAway = game.goals.away ?? (isLive || isFinished ? 0 : '-');

  const formattedTime = new Date(game.fixture.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const homeBet: BetSelection = {
    fixtureId: game.fixture.id,
    matchName: `${game.teams.home.name} x ${game.teams.away.name}`,
    leagueName: game.league.name,
    marketName: 'Resultado Final',
    selection: `Vitória ${game.teams.home.name}`,
    odd: probs.odds.home,
    prob: probs.home,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name
  };

  const drawBet: BetSelection = {
    fixtureId: game.fixture.id,
    matchName: `${game.teams.home.name} x ${game.teams.away.name}`,
    leagueName: game.league.name,
    marketName: 'Resultado Final',
    selection: 'Empate (X)',
    odd: probs.odds.draw,
    prob: probs.draw,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name
  };

  const awayBet: BetSelection = {
    fixtureId: game.fixture.id,
    matchName: `${game.teams.home.name} x ${game.teams.away.name}`,
    leagueName: game.league.name,
    marketName: 'Resultado Final',
    selection: `Vitória ${game.teams.away.name}`,
    odd: probs.odds.away,
    prob: probs.away,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name
  };

  const isHomeSelected = isBetSelected(game.fixture.id, homeBet.selection);
  const isDrawSelected = isBetSelected(game.fixture.id, drawBet.selection);
  const isAwaySelected = isBetSelected(game.fixture.id, awayBet.selection);

  return (
    <div 
      id={`game-card-${game.fixture.id}`}
      className="bg-white rounded-3xl border-2 border-slate-100 hover:border-cyan-400 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
    >
      <div>
        {/* Header: League & Status */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {game.league.logo && (
              <img 
                src={game.league.logo} 
                alt={game.league.name} 
                className="w-4 h-4 object-contain shrink-0" 
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
            <span className="text-[10px] font-black text-cyan-800 uppercase tracking-wider truncate bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded-full">
              {game.league.name}
            </span>
          </div>

          {/* Status Indicator */}
          <div>
            {isLive ? (
              <span className="flex items-center gap-1.5 text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                <span>Ao Vivo {game.fixture.status.elapsed ? `${game.fixture.status.elapsed}'` : ''}</span>
              </span>
            ) : isFinished ? (
              <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                Encerrado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-xl uppercase">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formattedTime}</span>
              </span>
            )}
          </div>
        </div>

        {/* Confronto / Mascotes & Placar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          
          {/* Mandante */}
          <TeamAvatar
            teamName={game.teams.home.name}
            logoUrl={game.teams.home.logo}
            isFavorite={probs.favorite === 'home'}
            winProb={probs.home}
          />

          {/* Placar Central */}
          <div className="bg-slate-900 text-white px-3.5 py-2 rounded-2xl font-mono text-center shrink-0 shadow-inner flex flex-col items-center justify-center min-w-[58px]">
            <div className="flex items-center gap-1 text-base font-black">
              <span>{scoreHome}</span>
              <span className="text-slate-400">:</span>
              <span>{scoreAway}</span>
            </div>
            <span className="text-[8px] font-black uppercase text-cyan-400 tracking-wider">
              {isLive ? 'Em Jogo' : isFinished ? 'Final' : 'Vs'}
            </span>
          </div>

          {/* Visitante */}
          <TeamAvatar
            teamName={game.teams.away.name}
            logoUrl={game.teams.away.logo}
            isFavorite={probs.favorite === 'away'}
            winProb={probs.away}
          />

        </div>

        {/* Probability Gauge Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[9px] font-black mb-1 px-1">
            <span className="text-emerald-700">Casa: {probs.home}%</span>
            <span className="text-slate-500">Empate: {probs.draw}%</span>
            <span className="text-cyan-700">Fora: {probs.away}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden p-0.5 border border-slate-200">
            <div className="bg-emerald-500 h-full rounded-l-full transition-all duration-500" style={{ width: `${probs.home}%` }} title={`Casa: ${probs.home}%`} />
            <div className="bg-slate-400 h-full transition-all duration-500" style={{ width: `${probs.draw}%` }} title={`Empate: ${probs.draw}%`} />
            <div className="bg-cyan-500 h-full rounded-r-full transition-all duration-500" style={{ width: `${probs.away}%` }} title={`Fora: ${probs.away}%`} />
          </div>
        </div>

        {/* Interactive Odds Chips (Click to bet) */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          
          {/* Casa (1) */}
          <button
            id={`odd-home-${game.fixture.id}`}
            onClick={() => onToggleBet(homeBet)}
            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
              isHomeSelected
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-300'
                : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <span className={`text-[9px] font-black uppercase ${isHomeSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
              Casa (1)
            </span>
            <span className="text-xs font-black font-mono mt-0.5">
              @{probs.odds.home.toFixed(2)}
            </span>
          </button>

          {/* Empate (X) */}
          <button
            id={`odd-draw-${game.fixture.id}`}
            onClick={() => onToggleBet(drawBet)}
            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
              isDrawSelected
                ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-400'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className={`text-[9px] font-black uppercase ${isDrawSelected ? 'text-slate-300' : 'text-slate-400'}`}>
              Empate (X)
            </span>
            <span className="text-xs font-black font-mono mt-0.5">
              @{probs.odds.draw.toFixed(2)}
            </span>
          </button>

          {/* Fora (2) */}
          <button
            id={`odd-away-${game.fixture.id}`}
            onClick={() => onToggleBet(awayBet)}
            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
              isAwaySelected
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-500/20 ring-2 ring-cyan-300'
                : 'bg-slate-50 hover:bg-cyan-50 text-slate-700 border-slate-200 hover:border-cyan-300'
            }`}
          >
            <span className={`text-[9px] font-black uppercase ${isAwaySelected ? 'text-cyan-100' : 'text-slate-400'}`}>
              Fora (2)
            </span>
            <span className="text-xs font-black font-mono mt-0.5">
              @{probs.odds.away.toFixed(2)}
            </span>
          </button>

        </div>
      </div>

      {/* Actions */}
      <button
        id={`btn-analysis-${game.fixture.id}`}
        onClick={() => onOpenAnalysis(game)}
        className="w-full py-2.5 bg-slate-100 hover:bg-gradient-to-r hover:from-cyan-600 hover:to-blue-600 hover:text-white border border-slate-200 hover:border-cyan-500 rounded-2xl text-[10px] font-black text-cyan-800 uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span>Análise Avançada & IA</span>
      </button>

    </div>
  );
};
