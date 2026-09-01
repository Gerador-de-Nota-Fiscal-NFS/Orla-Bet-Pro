import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  MessageSquare, 
  ShieldCheck, 
  Timer, 
  ArrowRight,
  KeyRound,
  Brain
} from 'lucide-react';
import { Subscriber } from '../types';
import { 
  loginSubscriber, 
  registerSubscriber, 
  loginWithGoogle, 
  getWhatsAppPaymentLink,
  getWhatsAppSupportLink,
  ADMIN_WHATSAPP_DISPLAY,
  SUBSCRIPTION_PLANS 
} from '../services/firebase';

interface WelcomeAuthScreenProps {
  onSuccess: (user: Subscriber) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenSecretAdmin: () => void;
}

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({
  onSuccess,
  onShowToast,
  onOpenSecretAdmin
}) => {
  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Agora temos apenas um plano, pegamos o primeiro (e único) do array
  const currentPlanObj = SUBSCRIPTION_PLANS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const user = await loginSubscriber(email, password);
        onSuccess(user);
        onShowToast(`Bem-vindo de volta, ${user.name}!`, 'success');
      } else {
        // Atualizado para a nova assinatura do firebase.ts (sem o parâmetro de plano)
        const user = await registerSubscriber(email, password, name, phone);
        onSuccess(user);
        onShowToast(`Conta criada! Você tem 24 horas de teste gratuito liberadas!`, 'success');
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao logar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950 text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      
      {/* Top Header Bar */}
      <header className="w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                ZAP BET <span className="bg-gradient-to-r from-cyan-400 to-purple-500 text-transparent bg-clip-text font-black">IA</span>
              </span>
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider -mt-1">
                Inteligência Artificial Esportiva
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={getWhatsAppSupportLink()}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp: {ADMIN_WHATSAPP_DISPLAY}</span>
            </a>

            <button
              onClick={onOpenSecretAdmin}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 px-3 py-1 rounded-xl transition flex items-center gap-1"
              title="Acesso exclusivo da Administração"
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        
        {/* Big Welcome Headline */}
        <div className="text-center max-w-3xl mb-8 md:mb-12 animate-fadeIn">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 px-4 py-1.5 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Central Premium de Análises com IA</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight">
            Boas-vindas à{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text">
              ZAP BET IA
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Análises táticas, comparação de times e interpretação de odds com <strong>Inteligência Artificial</strong> e Google Search em tempo real.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              24 Horas de Teste Grátis
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Sem Cartão de Crédito
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Ativação Imediata via PIX
            </span>
          </div>
        </div>

        {/* Auth Card & Plan Presentation Container */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Feature Highlights & Single Plan */}
          <div className="lg:col-span-6 space-y-6 order-2 lg:order-1">
            
            {/* Quick Benefits Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-400" />
                O que você encontra na ZAP BET IA:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="font-bold text-cyan-300 mb-1">🧠 Análise de Confrontos</div>
                  <p className="text-slate-400 leading-relaxed">
                    A IA pesquisa notícias, lesões e forma recente para analisar qualquer jogo que você pedir.
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="font-bold text-cyan-300 mb-1">📊 Interpretação de Odds</div>
                  <p className="text-slate-400 leading-relaxed">
                    Cole as odds e a IA calcula o valor esperado (+EV) e a probabilidade implícita.
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="font-bold text-cyan-300 mb-1">⚖️ Comparação de Times</div>
                  <p className="text-slate-400 leading-relaxed">
                    Histórico de confrontos (H2H), estatísticas de ataque/defesa e tendências táticas.
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="font-bold text-cyan-300 mb-1">💬 Chat Ilimitado</div>
                  <p className="text-slate-400 leading-relaxed">
                    Tire dúvidas sobre gestão de banca, mercados e estratégias com respostas em tempo real.
                  </p>
                </div>
              </div>
            </div>

            {/* Single Plan Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Plano de Acesso
                </h3>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  PIX Direto
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-cyan-500/50 bg-gradient-to-r from-cyan-950/60 to-purple-950/60 shadow-md flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">{currentPlanObj.name}</span>
                    <span className="bg-cyan-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                      Acesso Total
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {currentPlanObj.features[0]} • {currentPlanObj.features[1]}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-base text-cyan-300">{currentPlanObj.formattedPrice}</div>
                  <a
                    href={getWhatsAppPaymentLink(currentPlanObj.name, currentPlanObj.formattedPrice)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase mt-0.5 transition"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Chamar PIX</span>
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Main Auth Box */}
          <div className="lg:col-span-6 w-full order-1 lg:order-2">
            
            <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 relative overflow-hidden">
              
              {/* Top Selector Tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button
                  onClick={() => { setTab('register'); setErrorMsg(''); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    tab === 'register' 
                      ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎉 Criar Conta (24h Grátis)
                </button>
                <button
                  onClick={() => { setTab('login'); setErrorMsg(''); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    tab === 'login' 
                      ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Entrar na Conta
                </button>
              </div>

              {/* Error Box */}
              {errorMsg && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Free Trial Banner in Register Mode */}
              {tab === 'register' && (
                <div className="mb-5 p-3.5 bg-gradient-to-r from-cyan-50 to-purple-50 border border-cyan-200 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-xs text-cyan-950 block">
                      Acesso Imediato de Degustação
                    </span>
                    <p className="text-[11px] text-cyan-800 leading-tight mt-0.5">
                      Crie sua conta e ganhe <strong>24 horas de teste gratuito</strong> para usar todas as ferramentas da IA!
                    </p>
                  </div>
                </div>
              )}

              {/* Google 1-Click Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold py-3.5 px-4 rounded-2xl text-xs border border-slate-200 shadow-sm hover:shadow transition flex items-center justify-center gap-3 disabled:opacity-50 mb-5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{tab === 'register' ? 'Criar Conta com Google' : 'Entrar com Google'}</span>
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-bold text-slate-400 uppercase">ou via e-mail</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {tab === 'register' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Seu Nome Completo
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Ex: Carlos Silva"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        WhatsApp com DDD (para suporte e PIX)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Ex: (11) 99999-9999"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-cyan-600 hover:from-cyan-700 hover:to-purple-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 hover:scale-[1.01]"
                >
                  {loading ? (
                    <span>Processando...</span>
                  ) : (
                    <>
                      <span>{tab === 'register' ? 'Iniciar Teste Grátis de 24 Horas' : 'Acessar Minha Conta'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>

              {/* Direct WhatsApp Callout */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Deseja ativar o Plano Avançado diretamente com o administrador?
                </p>
                <a
                  href={getWhatsAppPaymentLink(currentPlanObj.name, currentPlanObj.formattedPrice, name || undefined)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Falar com o Admin ({ADMIN_WHATSAPP_DISPLAY})</span>
                </a>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* Bottom Footer */}
      <footer className="w-full border-t border-white/10 bg-slate-950 py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">ZAP BET IA</span>
            <span>•</span>
            <span className="text-[11px]">Central de Inteligência Artificial Esportiva</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
            <a 
              href={getWhatsAppSupportLink()} 
              target="_blank" 
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition"
            >
              WhatsApp: {ADMIN_WHATSAPP_DISPLAY}
            </a>
            <span>•</span>
            <span>Ativação Instantânea via PIX</span>
          </div>
        </div>
      </footer>

    </div>
  );
};