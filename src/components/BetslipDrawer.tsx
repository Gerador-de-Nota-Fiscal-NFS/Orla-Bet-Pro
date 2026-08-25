import React, { useState } from 'react';
import { X, Trash2, Share2, Copy, Check, Ticket, DollarSign, Calculator, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BetSelection } from '../types';

interface BetslipDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selections: BetSelection[];
  onRemoveSelection: (fixtureId: number, selection: string) => void;
  onClearAll: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const BetslipDrawer: React.FC<BetslipDrawerProps> = ({
  isOpen,
  onClose,
  selections,
  onRemoveSelection,
  onClearAll,
  onShowToast
}) => {
  const [stake, setStake] = useState<number>(20);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalOdd = Number(selections.reduce((acc, curr) => acc * curr.odd, 1).toFixed(2));
  const potentialReturn = Number((stake * totalOdd).toFixed(2));
  const netProfit = Number((potentialReturn - stake).toFixed(2));

  const handleCopy = () => {
    if (selections.length === 0) return;

    const msg = `🦁 *BILHETE DE APOSTAS — ORLA BET PRO*\n` +
      `🔥 ${selections.length} Seleções | Cotação Total: @${totalOdd.toFixed(2)}\n\n` +
      selections.map((s, i) => `${i + 1}. *${s.matchName}*\n   🎯 Mercado: ${s.marketName}\n   ✅ Entrada: ${s.selection} (@${s.odd.toFixed(2)})`).join('\n\n') +
      `\n\n💵 *Valor da Entrada:* R$ ${stake.toFixed(2)}\n💰 *Retorno Potencial:* R$ ${potentialReturn.toFixed(2)} (+R$ ${netProfit.toFixed(2)})\n\n🚀 *Orla Bet — Inteligência Artificial Esportiva*`;

    navigator.clipboard.writeText(msg);
    setCopied(true);
    onShowToast('Bilhete copiado com sucesso!', 'success');
    setTimeout(() => setCopied(false), 2500);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleShareWhatsApp = () => {
    if (selections.length === 0) return;

    const msg = `🦁 *BILHETE ORLA BET PRO*\n` +
      `Cotação: @${totalOdd.toFixed(2)} (${selections.length} jogos)\n\n` +
      selections.map((s, i) => `• ${s.matchName} ➔ ${s.selection} (@${s.odd.toFixed(2)})`).join('\n') +
      `\n\n💰 Retorno Estimado: R$ ${potentialReturn.toFixed(2)} para R$ ${stake.toFixed(2)}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end animate-fadeIn">
      <div 
        id="betslip-drawer-content"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200"
      >
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">
                Caderneta de Apostas
              </h3>
              <p className="text-[10px] text-slate-400">
                {selections.length} {selections.length === 1 ? 'seleção adicionada' : 'seleções adicionadas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selections.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition px-2 py-1 bg-white/5 rounded-lg"
              >
                Limpar
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content / Selections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {selections.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-3xl mb-3 text-slate-400">
                🎟️
              </div>
              <h4 className="font-black text-sm text-slate-700 uppercase">
                Sua caderneta está vazia
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Clique nas cotações (Casa, Empate, Fora) dos cards de jogos para montar seu bilhete simples ou múltiplo.
              </p>
            </div>
          ) : (
            selections.map((s, idx) => (
              <div 
                key={`${s.fixtureId}-${s.selection}-${idx}`}
                className="bg-slate-50 border border-slate-200 p-3 rounded-2xl relative group hover:border-cyan-300 transition"
              >
                <button
                  onClick={() => onRemoveSelection(s.fixtureId, s.selection)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-red-500 transition"
                  title="Remover seleção"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                  {s.leagueName}
                </span>

                <h5 className="text-xs font-black text-slate-800 mt-1 pr-6">
                  {s.matchName}
                </h5>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">
                      {s.marketName}
                    </span>
                    <span className="text-xs font-black text-emerald-700">
                      {s.selection}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-xl">
                    @{s.odd.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Calculation & Actions */}
        {selections.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
            
            {/* Stake Input */}
            <div>
              <div className="flex justify-between items-center text-xs font-black uppercase text-slate-600 mb-1.5">
                <span>Valor da Aposta (Stake):</span>
                <span className="text-emerald-700 font-mono text-sm">
                  R$ {stake.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                {[10, 25, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => setStake(val)}
                    className={`px-2.5 py-2 rounded-xl text-[10px] font-black border transition ${
                      stake === val 
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    R${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculations Summary */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Odd Total Combinada:</span>
                <span className="font-mono font-black text-slate-800">
                  @{totalOdd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Lucro Líquido:</span>
                <span className="font-mono font-bold text-emerald-600">
                  +R$ {netProfit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-800 pt-1 border-t border-slate-100">
                <span>Retorno Potencial:</span>
                <span className="font-mono font-black text-emerald-600">
                  R$ {potentialReturn.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Share & Copy Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-md"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Bilhete'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-md shadow-emerald-600/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
