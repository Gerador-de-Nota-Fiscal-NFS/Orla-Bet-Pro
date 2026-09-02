import React from 'react';
import { TrendingUp, Shield, Target, Zap, Award, AlertCircle } from 'lucide-react';

interface BetSelection {
  game: string;
  market: string;
  odd: number;
  source?: string;
}

interface BetSlip {
  type: 'conservador' | 'equilibrado' | 'ousado';
  title: string;
  selections: BetSelection[];
  totalOdd: number;
  confidence: 'Alta' | 'Média' | 'Baixa';
  stake: string;
  opinion?: string;
}

interface BetSlipCardsProps {
  slips: BetSlip[];
}

export const BetSlipCards: React.FC<BetSlipCardsProps> = ({ slips }) => {
  const getCardConfig = (type: string) => {
    switch (type) {
      case 'conservador':
        return {
          icon: Shield,
          color: 'from-emerald-500 to-teal-600',
          bgColor: 'bg-emerald-950/30',
          borderColor: 'border-emerald-700',
          textColor: 'text-emerald-400',
          emoji: '🛡️'
        };
      case 'equilibrado':
        return {
          icon: Target,
          color: 'from-cyan-500 to-blue-600',
          bgColor: 'bg-cyan-950/30',
          borderColor: 'border-cyan-700',
          textColor: 'text-cyan-400',
          emoji: '⚖️'
        };
      case 'ousado':
        return {
          icon: Zap,
          color: 'from-purple-500 to-pink-600',
          bgColor: 'bg-purple-950/30',
          borderColor: 'border-purple-700',
          textColor: 'text-purple-400',
          emoji: ''
        };
      default:
        return {
          icon: Award,
          color: 'from-slate-500 to-gray-600',
          bgColor: 'bg-slate-950/30',
          borderColor: 'border-slate-700',
          textColor: 'text-slate-400',
          emoji: '🎯'
        };
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'Alta': return 'text-emerald-400 bg-emerald-950/50 border-emerald-700';
      case 'Média': return 'text-amber-400 bg-amber-950/50 border-amber-700';
      case 'Baixa': return 'text-red-400 bg-red-950/50 border-red-700';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6 w-full">
      {slips.map((slip, index) => {
        const config = getCardConfig(slip.type);
        const IconComponent = config.icon;

        return (
          <div key={index} className={`${config.bgColor} border ${config.borderColor} rounded-3xl overflow-hidden shadow-xl`}>
            {/* Header do Card */}
            <div className={`bg-gradient-to-r ${config.color} p-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl">
                    {config.emoji}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      {slip.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/90 font-bold">Odd Total:</span>
                      <span className="text-xl font-black text-white bg-white/20 px-3 py-0.5 rounded-lg">
                        {slip.totalOdd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border ${getConfidenceColor(slip.confidence)}`}>
                  <div className="flex items-center gap-1.5">
                    <IconComponent className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase">{slip.confidence}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seleções */}
            <div className="p-4 space-y-3">
              {slip.selections.map((selection, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-3 hover:border-slate-600 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg"></span>
                        <span className="text-sm font-bold text-white">{selection.game}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-bold text-cyan-400">{selection.market}</span>
                        {selection.source && (
                          <span className="text-[10px] text-slate-500">({selection.source})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {selection.odd.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Odd</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer com Stake e Opinião */}
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">Stake Sugerida:</span>
                </div>
                <span className="text-sm font-black text-amber-400">{slip.stake}</span>
              </div>

              {slip.opinion && (
                <div className="bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-800/50 rounded-2xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-black text-cyan-400 uppercase mb-1">💡 Opinião da IA:</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{slip.opinion}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Aviso Final */}
      <div className="bg-amber-950/30 border border-amber-700/50 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-black text-amber-400 uppercase mb-1">⚠️ Aviso Importante:</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              As odds podem variar. Sempre verifique no site da casa de apostas antes de confirmar. 
              A decisão final é do cliente. Aposte com responsabilidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
