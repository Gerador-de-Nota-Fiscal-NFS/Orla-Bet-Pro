import React, { useState } from 'react';
import { 
  Crown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  Flame, 
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle2
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionTier, getWhatsAppPaymentLink } from '../services/firebase';

interface VipSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  userName?: string;
}

export const VipSubscriptionModal: React.FC<VipSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
  userName
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');

  if (!isOpen) return null;

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1];

  const handleGoToWhatsApp = () => {
    const link = getWhatsAppPaymentLink(currentPlan.name, currentPlan.formattedPrice, userName);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-100 my-auto">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 relative text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-black text-sm transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-slate-950 text-cyan-400 rounded-2xl shadow-lg border border-cyan-500/30">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-200 block">
                Escolha seu Plano • Liberação Instantânea via PIX
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                Planos & Assinaturas Orla Bet Pro
              </h2>
            </div>
          </div>
          <p className="text-xs font-medium text-cyan-100 max-w-xl mt-1">
            Selecione o plano ideal para a sua banca, faça o PIX e receba seus palpites, bilhetes prontos e análises de IA em tempo real!
          </p>
        </div>

        {/* Plan Selectors (3 Official Tiers) */}
        <div className="p-5 sm:p-6 space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative p-4 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/20 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                      Mais Popular
                    </div>
                  )}
                  {plan.id === 'vip' && (
                    <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                      VIP Ilimitado
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1 text-cyan-400 mb-1">
                      {plan.id === 'basico' ? (
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      ) : plan.id === 'pro' ? (
                        <Flame className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="text-[10px] font-black uppercase text-slate-200">{plan.name}</span>
                    </div>

                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-2xl font-black text-white">{plan.formattedPrice}</span>
                      <span className="text-[10px] text-slate-400 font-bold">/ mês</span>
                    </div>

                    <div className="text-[10px] font-extrabold text-cyan-300 mb-2">
                      {plan.badge}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] flex items-center justify-between text-slate-300">
                    <span className="font-bold">
                      {plan.palpitesCount} {plan.palpitesCount === 1 ? 'Palpite Diário' : 'Palpites Diários'}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <span className="text-slate-500">Selecionar</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Plan In-depth Features */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-white">{currentPlan.name}</h4>
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {currentPlan.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Cobrança mensal flexível sem fidelidade</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-2xl font-black text-cyan-400">{currentPlan.formattedPrice}</span>
                <span className="text-[11px] text-slate-400 block">/ mensal</span>
              </div>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
              {currentPlan.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Payment Notice */}
          <div className="bg-emerald-950/30 border border-emerald-600/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-200">
            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-300 mb-0.5">Como funciona a liberação imediata?</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                1️⃣ Clique no botão verde abaixo para abrir a mensagem de pagamento no <strong>WhatsApp</strong>.<br />
                2️⃣ Faça a transferência via <strong>PIX</strong> no valor de <strong>{currentPlan.formattedPrice}</strong> e envie o comprovante.<br />
                3️⃣ O administrador autorizará e ativará sua conta na mesma hora!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleGoToWhatsApp}
              className="flex-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Fazer PIX no WhatsApp ({currentPlan.formattedPrice})</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase transition flex items-center justify-center gap-1.5"
            >
              <span>Cadastrar / Entrar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
