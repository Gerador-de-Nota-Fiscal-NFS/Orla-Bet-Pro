import React, { useState } from 'react';
import { 
  Crown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  Flame, 
  Lock, 
  ArrowRight,
  TrendingUp,
  Award,
  HelpCircle
} from 'lucide-react';
import { getWhatsAppPaymentLink } from '../services/firebase';

interface VipSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
}

export const VipSubscriptionModal: React.FC<VipSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'quarterly' | 'monthly'>('annual');

  if (!isOpen) return null;

  const plans = {
    annual: {
      name: 'Plano Anual Master VIP',
      tag: 'Mais Popular • Melhor Custo-Benefício',
      price: 'R$ 349,90',
      period: 'por ano (menos de R$ 29,15/mês)',
      badge: 'Economize 42%',
      savings: 'Economia de R$ 248,90 ao ano',
      popular: true,
      features: [
        'Acesso 100% Ilimitado à Orla IA & Consultas Diárias',
        'Gerador de Bilhetes Múltiplos com xG e +EV Diário',
        'Todos os Mascotes e Identidades Oficiais dos Clubes',
        'Projeções de Escanteios, Ambas Marcam e Mercados de Gols',
        'Suporte Prioritário VIP no WhatsApp Direto com Especialista',
        'Acesso aos Novos Recursos e Algoritmos Preditivos'
      ]
    },
    quarterly: {
      name: 'Plano Trimestral Pro',
      tag: 'Plano Trimestral',
      price: 'R$ 119,90',
      period: 'a cada 3 meses (~R$ 39,90/mês)',
      badge: 'Economize 20%',
      savings: 'Economia de R$ 29,80 no período',
      popular: false,
      features: [
        'Acesso Completo à Inteligência Artificial Orla Bet',
        'Gerador de Bilhetes Múltiplos e Probabilidades',
        'Cobertura de Todas as Principais Ligas do Mundo',
        'Estatísticas e Gráficos de Confronto Direto (H2H)'
      ]
    },
    monthly: {
      name: 'Plano Mensal VIP',
      tag: 'Plano Básico Recorrente',
      price: 'R$ 49,90',
      period: 'por mês',
      badge: 'Flexibilidade',
      savings: 'Sem fidelidade, renove quando quiser',
      popular: false,
      features: [
        'Acesso ao Painel de Jogos e Probabilidades',
        'Consultas Diárias com a IA Esportiva',
        'Caderneta de Apostas com Cálculo Instantâneo'
      ]
    }
  };

  const currentPlan = plans[selectedPlan];

  const handleGoToWhatsApp = () => {
    const link = getWhatsAppPaymentLink(currentPlan.name, currentPlan.price);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 my-auto">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 relative text-slate-950">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-slate-950 flex items-center justify-center font-black text-sm transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-slate-950 text-amber-400 rounded-2xl shadow-lg">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-950/80 block">
                Acesso Exclusivo para Apostadores
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">
                Planos & Assinaturas VIP
              </h2>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-950/90 max-w-lg mt-1">
            Escolha seu plano, realize o pagamento via PIX no WhatsApp e tenha seu acesso liberado imediatamente com toda a inteligência preditiva!
          </p>
        </div>

        {/* Plan Selectors */}
        <div className="p-5 sm:p-6 space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Annual Plan Card */}
            <div
              onClick={() => setSelectedPlan('annual')}
              className={`relative p-4 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between ${
                selectedPlan === 'annual'
                  ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                42% OFF
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase">Anual Master</span>
                </div>
                <div className="text-lg font-black text-white">R$ 349,90</div>
                <div className="text-[10px] text-amber-300 font-bold">~R$ 29,15/mês</div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
                <span>12 meses de acesso</span>
                <Crown className="w-3 h-3 text-amber-400" />
              </div>
            </div>

            {/* Quarterly Plan Card */}
            <div
              onClick={() => setSelectedPlan('quarterly')}
              className={`relative p-4 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between ${
                selectedPlan === 'quarterly'
                  ? 'bg-gradient-to-b from-blue-950/40 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-1 text-cyan-400 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase">Trimestral Pro</span>
                </div>
                <div className="text-lg font-black text-white">R$ 119,90</div>
                <div className="text-[10px] text-cyan-300 font-bold">~R$ 39,90/mês</div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
                <span>3 meses de acesso</span>
                <Award className="w-3 h-3 text-cyan-400" />
              </div>
            </div>

            {/* Monthly Plan Card */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`relative p-4 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between ${
                selectedPlan === 'monthly'
                  ? 'bg-gradient-to-b from-slate-800/40 to-slate-900 border-slate-400 shadow-lg scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-1 text-slate-300 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase">Mensal VIP</span>
                </div>
                <div className="text-lg font-black text-white">R$ 49,90</div>
                <div className="text-[10px] text-slate-400 font-bold">por mês</div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
                <span>Renovação mensal</span>
                <Sparkles className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Selected Plan Details */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-white">{currentPlan.name}</h4>
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {currentPlan.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{currentPlan.savings}</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-2xl font-black text-amber-400">{currentPlan.price}</span>
                <span className="text-[11px] text-slate-400 block">{currentPlan.period}</span>
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
          <div className="bg-amber-950/30 border border-amber-600/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300 mb-0.5">Como funciona a ativação da sua conta VIP?</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                1️⃣ Clique no botão abaixo para abrir a conversa de contratação no WhatsApp.<br />
                2️⃣ Efetue a transferência segura via <strong>PIX</strong> e envie o comprovante.<br />
                3️⃣ Seu usuário será cadastrado e ativado no sistema na hora!
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleGoToWhatsApp}
              className="flex-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Pagar via PIX no WhatsApp ({currentPlan.price})</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-2xl text-xs uppercase transition flex items-center justify-center gap-1.5"
            >
              <span>Já paguei / Criar Conta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
