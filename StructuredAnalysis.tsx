import React from 'react';
import { 
  Calendar, Clock, MapPin, Activity, AlertTriangle, 
  TrendingUp, Shield, ExternalLink, CheckCircle2, XCircle 
} from 'lucide-react';
import { AnalysisResponse } from '../services/aiService';

interface StructuredAnalysisProps {
  data: AnalysisResponse;
}

export const StructuredAnalysis: React.FC<StructuredAnalysisProps> = ({ data }) => {
  const getConfidenceColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'alta': return 'text-emerald-400 bg-emerald-900/30 border-emerald-700';
      case 'moderada': return 'text-amber-400 bg-amber-900/30 border-amber-700';
      case 'baixa': return 'text-red-400 bg-red-900/30 border-red-700';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getImpactColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'alto': return 'text-red-400';
      case 'medio': return 'text-amber-400';
      case 'baixo': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="w-full space-y-4 text-left">
      {/* Cabeçalho da Análise */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-purple-900/40 border border-cyan-700/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-cyan-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
            {data.tipo.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-slate-400">
            Atualizado em: {new Date(data.consultado_em || '').toLocaleTimeString('pt-BR')}
          </span>
        </div>
        <h3 className="text-lg font-black text-white mb-1">{data.titulo}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{data.resumo}</p>
      </div>

      {/* Dados da Partida (se houver) */}
      {data.partida && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> Detalhes da Partida
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>{data.partida.competicao}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{data.partida.estadio || 'Estádio não informado'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{data.partida.data}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{data.partida.horario}</span>
            </div>
          </div>
        </div>
      )}

      {/* Desfalques */}
      {data.desfalques && data.desfalques.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Desfalques Confirmados
          </h4>
          <div className="space-y-2">
            {data.desfalques.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                <div>
                  <span className="font-bold text-white">{d.jogador}</span>
                  <span className="text-slate-500 mx-1">•</span>
                  <span className="text-slate-400">{d.motivo}</span>
                </div>
                <span className={`text-[10px] font-black uppercase ${getImpactColor(d.impacto)}`}>
                  Impacto {d.impacto}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análise Tática */}
      {data.analise_tatica && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-wider mb-2">
            🧠 Análise Tática
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {data.analise_tatica}
          </p>
        </div>
      )}

      {/* Mercados e Odds */}
      {data.mercados && data.mercados.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" /> Mercados Recomendados
          </h4>
          <div className="space-y-3">
            {data.mercados.map((m, i) => (
              <div key={i} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{m.nome}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${getConfidenceColor(m.confianca)}`}>
                    {m.confianca}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                  <span>Odd: <strong className="text-cyan-400">{m.odd || 'N/A'}</strong></span>
                  <span>Prob: <strong className="text-purple-400">{m.probabilidade_estimada || 0}%</strong></span>
                </div>
                {m.argumentos.length > 0 && (
                  <div className="space-y-1 mt-2 pt-2 border-t border-slate-800">
                    {m.argumentos.map((arg, j) => (
                      <div key={j} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{arg}</span>
                      </div>
                    ))}
                  </div>
                )}
                {m.riscos.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {m.riscos.map((risk, j) => (
                      <div key={j} className="flex items-start gap-1.5 text-[11px] text-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conclusão */}
      {data.conclusao && (
        <div className="bg-gradient-to-r from-cyan-950/30 to-slate-900/50 border border-cyan-800/50 rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-2">
            🎯 Conclusão
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
            {data.conclusao}
          </p>
        </div>
      )}

      {/* Fontes */}
      {data.fontes && data.fontes.length > 0 && (
        <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
          <span className="font-bold uppercase">Fontes consultadas:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {data.fontes.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md transition">
                <ExternalLink className="w-2.5 h-2.5" />
                {f.nome}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};