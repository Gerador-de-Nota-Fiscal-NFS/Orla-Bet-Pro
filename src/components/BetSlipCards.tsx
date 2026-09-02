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
          gradient: 'from-emerald-500 to-teal-600',
          bgGradient: 'from-emerald-950/40 to-teal-950/40',
          borderColor: 'border-emerald-500/50',
          glowColor: 'shadow-emerald-500/20',
          emoji: '️'
        };
      case 'equilibrado':
        return {
          icon: Target,
          gradient: 'from-cyan-500 to-blue-600',
          bgGradient: 'from-cyan-950/40 to-blue-950/40',
          borderColor: 'border-cyan-500/50',
          glowColor: 'shadow-cyan-500/20',
          emoji: '⚖️'
        };
      case 'ousado':
        return {
          icon: Zap,
          gradient: 'from-purple-500 to-pink-600',
          bgGradient: 'from-purple-950/40 to-pink-950/40',
          borderColor: 'border-purple-500/50',
          glowColor: 'shadow-purple-500/20',
          emoji: ''
        };
      default:
        return {
          icon: Award,
          gradient: 'from-slate-500 to-gray-600',
          bgGradient: 'from-slate-950/40 to-gray-950/40',
          borderColor: 'border-slate-500/50',
          glowColor: 'shadow-slate-500/20',
          emoji: '🎯'
        };
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'Alta': return 'text-emerald-400 bg-emerald-950/50 border-emerald-500/50';
      case 'Média': return 'text-amber-400 bg-amber-950/50 border-amber-500/50';
      case 'Baixa': return 'text-red-400 bg-red-950/50 border-red-500/50';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6 w-full">
      {slips.map((slip, index) => {
        const config = getCardConfig(slip.type);
        const IconComponent = config.icon;

        return (
          <div key={index} className={`bg-gradient-to-r ${config.bgGradient} border-2 ${config.borderColor} rounded-3xl overflow-hidden shadow-2xl ${config.glowColor} backdrop-blur-md`}>
            {/* Header do Card - MAIS VISÍVEL */}
            <div className={`bg-gradient-to-r ${config.gradient} p-5 border-b border-white/10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg">
                    {config.emoji}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider drop-shadow-lg">
                      {slip.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/90 font-bold">Odd Total:</span>
                      <span className="text-2xl font-black text-white bg-black/30 px-4 py-1 rounded-xl border border-white/20 shadow-lg">
                        {slip.totalOdd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border-2 ${getConfidenceColor(slip.confidence)} backdrop-blur-md`}>
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4" />
                    <span className="text-xs font-black uppercase">{slip.confidence}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seleções - CARDS MAIORES E MAIS VISÍVEIS */}
            <div className="p-5 space-y-3">
              {slip.selections.map((selection, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-700/50 rounded-2xl p-4 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10 group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl"></span>
                        <span className="text-base font-bold text-white group-hover:text-cyan-300 transition">{selection.game}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-bold text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded-lg border border-cyan-500/30">{selection.market}</span>
                        {selection.source && (
                          <span className="text-[10px] text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-lg">({selection.source})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
                        {selection.odd.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Odd</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer com Stake e Opinião */}
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center justify-between bg-slate-950/60 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-bold text-slate-300">Stake Sugerida:</span>
                </div>
                <span className="text-base font-black text-amber-400 bg-amber-950/30 px-3 py-1 rounded-xl border border-amber-500/30">{slip.stake}</span>
              </div>

              {slip.opinion && (
                <div className="bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-black text-cyan-400 uppercase mb-2">💡 Opinião da IA:</div>
                      <p className="text-sm text-slate-300 leading-relaxed">{slip.opinion}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Aviso Final */}
      <div className="bg-amber-950/40 border-2 border-amber-500/50 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-base font-black text-amber-400 uppercase mb-2">⚠️ Aviso Importante:</div>
            <p className="text-sm text-slate-300 leading-relaxed">
              As odds podem variar. Sempre verifique no site da casa de apostas antes de confirmar. 
              A decisão final é do cliente. Aposte com responsabilidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
