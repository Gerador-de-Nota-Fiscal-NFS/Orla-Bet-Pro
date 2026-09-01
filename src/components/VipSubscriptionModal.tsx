import React from 'react';
import { Crown, Check, ShieldCheck, MessageSquare, X } from 'lucide-react';
import { SUBSCRIPTION_PLANS, getWhatsAppPaymentLink } from '../services/firebase';

interface VipSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  userName?: string;
}

export const VipSubscriptionModal: React.FC<VipSubscriptionModalProps> = ({ isOpen, onClose, onOpenRegister, userName }) => {
  if (!isOpen) return null;
  const currentPlan = SUBSCRIPTION_PLANS[0]; // Único plano

  const handleGoToWhatsApp = () => {
    const link = getWhatsAppPaymentLink(currentPlan.name, currentPlan.formattedPrice, userName);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 my-auto">
        <div className="p-6 bg-gradient-to-r from-cyan-600 via-purple-600 to-cyan-600 relative text-white">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-black text-sm transition">✕</button>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-slate-950 text-cyan-400 rounded-2xl shadow-lg border border-cyan-500/30"><Crown className="w-6 h-6" /></div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-200 block">Acesso Completo • Liberação via PIX</span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">ZAP BET IA</h2>
            </div>
          </div>
          <p className="text-xs font-medium text-cyan-100 max-w-xl mt-1">Tenha acesso completo às análises, relatórios e recursos inteligentes em um único plano.</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative p-5 rounded-2xl bg-gradient-to-b from-cyan-950/60 to-slate-900 border-2 border-cyan-400 shadow-xl shadow-cyan-500/20">
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-sm">Plano Único</div>
            <div className="flex items-center gap-2 text-cyan-400 mb-2"><Crown className="w-4 h-4" /><span className="text-sm font-black uppercase text-white">{currentPlan.name}</span></div>
            <div className="flex items-baseline gap-1 my-2"><span className="text-3xl font-black text-white">{currentPlan.formattedPrice}</span><span className="text-xs text-slate-400 font-bold">/ mês</span></div>
            <p className="text-xs text-slate-300 leading-snug mb-4">{currentPlan.description}</p>
            <div className="grid grid-cols-1 gap-2">
              {currentPlan.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-2.5 h-2.5" /></div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-600/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-200">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-300 mb-0.5">Como funciona a liberação?</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">1️⃣ Clique no botão abaixo para abrir o WhatsApp.<br/>2️⃣ Faça o PIX de <strong>{currentPlan.formattedPrice}</strong> e envie o comprovante.<br/>3️⃣ O administrador ativará sua conta na mesma hora!</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button onClick={handleGoToWhatsApp} className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Assinar por {currentPlan.formattedPrice}/mês</span>
            </button>
            <button onClick={() => { onClose(); onOpenRegister(); }} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase transition">
              Já sou assinante / Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};