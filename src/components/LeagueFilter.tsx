import React from 'react';
import { Calendar, Radio } from 'lucide-react';
import { LEAGUE_LABELS } from '../services/apiSports';

interface LeagueFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedLeague: string;
  onLeagueChange: (leagueId: string) => void;
  onlyLive: boolean;
  onToggleOnlyLive: () => void;
  liveCount: number;
}

export const LeagueFilter: React.FC<LeagueFilterProps> = ({
  selectedDate,
  onDateChange,
  selectedLeague,
  onLeagueChange,
  onlyLive,
  onToggleOnlyLive,
  liveCount
}) => {
  // Generate next 6 dates starting from today
  const dateOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const formatted = `${d.getDate()}/${d.getMonth() + 1}`;
    return { dateStr, dayName, formatted };
  });

  const leaguesList = [
    { id: 'all', name: 'Todas as Ligas', flag: '🌍' },
    { id: '71', name: 'Série A', flag: '🇧🇷' },
    { id: '72', name: 'Série B', flag: '🇧🇷' },
    { id: '2', name: 'Champions League', flag: '🏆' },
    { id: '39', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: '140', name: 'La Liga', flag: '🇪🇸' },
    { id: '13', name: 'Libertadores', flag: '🌎' },
    { id: '253', name: 'MLS', flag: '🇺🇸' }
  ];

  return (
    <div className="space-y-4 mb-6">
      
      {/* 1. Date Selector + Live Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Date options */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold pl-1 pr-2 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Data:</span>
          </div>

          {dateOptions.map(({ dateStr, dayName, formatted }) => {
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                id={`date-btn-${dateStr}`}
                onClick={() => onDateChange(dateStr)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-500 shadow-md shadow-cyan-500/20 scale-105'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-slate-50'
                }`}
              >
                <span>{formatted}</span>
                <span className={`text-[10px] font-semibold opacity-90`}>
                  ({dayName})
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Filter Toggle */}
        <button
          id="btn-toggle-live-filter"
          onClick={onToggleOnlyLive}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 shrink-0 self-end sm:self-auto ${
            onlyLive
              ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/30 ring-2 ring-red-300'
              : 'bg-white border-slate-200 text-slate-700 hover:border-red-300 hover:bg-red-50/50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${onlyLive ? 'bg-white' : 'bg-red-500'} ${liveCount > 0 ? 'animate-ping' : ''}`} />
          <Radio className="w-3.5 h-3.5 text-red-500" />
          <span>Ao Vivo ({liveCount})</span>
        </button>

      </div>

      {/* 2. League Category Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar" id="filterContainer">
        {leaguesList.map((lg) => {
          const isSelected = selectedLeague === lg.id;
          return (
            <button
              key={lg.id}
              data-filter={lg.id}
              id={`league-filter-${lg.id}`}
              onClick={() => onLeagueChange(lg.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300 hover:text-slate-900'
              }`}
            >
              <span className="mr-1.5">{lg.flag}</span>
              <span>{lg.name}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
