import React from 'react';
import { TrendingUp, CheckCircle2, Zap, DollarSign, Award, Info } from 'lucide-react';

interface StatsOverviewProps {
  gamesCount: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ gamesCount }) => {
  return (
    <section id="stats-overview-section" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 mb-6 md:mb-8">
      
      {/* 1. Assertividade IA */}
      <div 
        id="stat-card-accuracy"
        className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-emerald-100 border-l-4 border-l-emerald-500 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Assertividade IA
          </span>
          <Award className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tight">
            86.4%
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> 4.2%
          </span>
        </div>
        <p className="text-[9px] font-semibold text-slate-400 mt-2">
          Taxa diária de acerto em entradas recomendadas
        </p>
      </div>

      {/* 2. Greens de Hoje */}
      <div 
        id="stat-card-greens"
        className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-cyan-100 border-l-4 border-l-cyan-500 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Greens de Hoje
          </span>
          <CheckCircle2 className="w-4 h-4 text-cyan-500" />
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            21 / 24
          </span>
          <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-md">
            87.5%
          </span>
        </div>
        <p className="text-[9px] font-semibold text-slate-400 mt-2">
          {gamesCount} confrontos analisados no dia
        </p>
      </div>

      {/* 3. Média Odd Múltipla */}
      <div 
        id="stat-card-avg-odd"
        className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-purple-100 border-l-4 border-l-purple-500 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Média Odd Múltipla
          </span>
          <Zap className="w-4 h-4 text-purple-500" />
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl md:text-3xl font-black text-purple-600 tracking-tight">
            @3.95
          </span>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md">
            +EV
          </span>
        </div>
        <p className="text-[9px] font-semibold text-slate-400 mt-2">
          Valor esperado positivo ajustado por risco
        </p>
      </div>

      {/* 4. ROI Mês Projetado */}
      <div 
        id="stat-card-roi"
        className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-pink-100 border-l-4 border-l-pink-500 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            ROI Mês Projetado
          </span>
          <DollarSign className="w-4 h-4 text-pink-500" />
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl md:text-3xl font-black text-pink-600 tracking-tight">
            +31.8%
          </span>
          <span className="text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded-md">
            Consistente
          </span>
        </div>
        <p className="text-[9px] font-semibold text-slate-400 mt-2">
          Gestão sugerida de 2% de Stake Fixa
        </p>
      </div>

    </section>
  );
};
