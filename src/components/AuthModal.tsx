import React, { useState } from 'react';
import { Lock, Mail, User, Phone, CheckCircle, Sparkles, AlertCircle, MessageSquare, ShieldCheck, Timer } from 'lucide-react';
import { Subscriber } from '../types';
import { loginSubscriber, registerSubscriber, loginWithGoogle, getWhatsAppPaymentLink, SUBSCRIPTION_PLANS } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: Subscriber) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenPlans?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
  onOpenPlans
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('Plano Avançado (Pro)');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const currentPlanObj = SUBSCRIPTION_PLANS.find(p => p.name === plan) || SUBSCRIPTION_PLANS[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const user = await loginSubscriber(email, password);
        onSuccess(user);
        onShowToast(`Bem-vindo de volta, ${user.name}!`, 'success');
        onClose();
      } else {
        const user = await registerSubscriber(email, password, name, plan, phone);
        onSuccess(user);
        onShowToast(`Conta criada com sucesso! Você tem 15 minutos de teste gratuito liberados!`, 'success');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onSuccess(user);
      onShowToast(`Conectado com sucesso via Google!`, 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao logar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div 
        id="auth-modal-content"
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
      >
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-xs transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⚽</span>
            <h3 className="text-xl font-black uppercase tracking-tight">
              Orla Bet <span className="text-cyan-300">PRO</span>
            </h3>
          </div>
          <p className="text-xs text-cyan-100 font-medium">
            Palpites diários com IA, bilhetes prontos e suporte a todas as ligas
          </p>

          {/* Switch Tab */}
          <div className="flex bg-black/20 p-1 rounded-2xl mt-4">
            <button
              onClick={() => { setTab('login'); setErrorMsg(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition ${
                tab === 'login' ? 'bg-white text-blue-700 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              Já sou Assinante
            </button>
            <button
              onClick={() => { setTab('register'); setErrorMsg(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition ${
                tab === 'register' ? 'bg-white text-blue-700 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              Criar Conta / Teste
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Trial Notice when in Register tab */}
          {tab === 'register' && (
            <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-start gap-2.5 text-xs text-cyan-900">
              <Timer className="w-4 h-4 shrink-0 text-cyan-600 mt-0.5" />
              <div>
                <span className="font-bold block text-cyan-950">🎉 15 Minutos de Teste Gratuito!</span>
                <span className="text-[11px] text-cyan-800 leading-tight">
                  Ao criar sua conta, você ganha acesso experimental imediato com cronômetro para testar todos os palpites e análises.
                </span>
              </div>
            </div>
          )}

          {/* 1-Click Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs border border-slate-200 shadow-sm hover:shadow transition flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{tab === 'login' ? 'Entrar direto com o Google' : 'Criar conta com o Google'}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-3 text-[10px] uppercase font-bold text-slate-400">ou com e-mail</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {tab === 'register' && (
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Seu Nome
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 shadow-inner"
                  />
                  <User className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                <Mail className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {tab === 'register' && (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    WhatsApp (Para liberação do PIX)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 shadow-inner"
                    />
                    <Phone className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Plano Desejado
                    </label>
                    {onOpenPlans && (
                      <button
                        type="button"
                        onClick={onOpenPlans}
                        className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 underline"
                      >
                        Comparar Planos
                      </button>
                    )}
                  </div>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="Plano Básico">Plano Básico — R$ 10,00/mês (1 Palpite)</option>
                    <option value="Plano Avançado (Pro)">Plano Avançado (Pro) — R$ 20,00/mês (4 Palpites + 1 Bilhete)</option>
                    <option value="Plano VIP">Plano VIP — R$ 49,00/mês (10 Palpites, IA Ilimitada + Bilhetes)</option>
                  </select>
                </div>

                {/* Direct WhatsApp Payment helper */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Pagamento via PIX ({currentPlanObj.formattedPrice})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-snug mb-2">
                    Faça o PIX para o administrador e ative sua conta definitiva sem interrupções.
                  </p>
                  <a
                    href={getWhatsAppPaymentLink(currentPlanObj.name, currentPlanObj.formattedPrice, name)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition text-center shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Abrir WhatsApp para Pagar PIX</span>
                  </a>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/25 disabled:opacity-50 mt-2"
            >
              {loading ? 'Processando...' : tab === 'login' ? 'Entrar no Sistema' : 'Criar Conta & Iniciar Teste Grátis'}
            </button>

          </form>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>🔒 Criptografia de ponta a ponta</span>
              <span className="font-semibold text-emerald-600">Liberação Imediata</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
