import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, Copy, Check, Brain, Sparkles, Wallet, Zap } from 'lucide-react';
import { ChatMessage } from '../types';
import { askOrlaAI, analyzeFootball, AnalysisResponse } from '../services/aiService';
import { StructuredAnalysis } from './StructuredAnalysis';

interface OrlaAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenBankroll?: () => void;
}

export const OrlaAIChat: React.FC<OrlaAIChatProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onOpenBankroll
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `**ZAP BET IA v2.0** - Sistema de Inteligência Artificial Esportiva\n\n` +
        `Modo: **Análise Profunda Ativada**\n\n` +
        `Recursos disponíveis:\n` +
        `- Busca de odds em tempo real (Betano, Bet365, Flashscore)\n` +
        `- Análise estatística avançada\n` +
        `- Gestão de risco e +EV\n` +
        `- Bilhetes múltiplos com probabilidades\n\n` +
        `Como posso ajudar você hoje?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      // Sempre usar modo de análise profunda
      const analysisData = await analyzeFootball({ command: query });
      
      const botMsg: any = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: analysisData ? '' : '⚠️ Não foi possível gerar a análise estruturada no momento.',
        timestamp: new Date().toISOString(),
        analysisData: analysisData
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'Erro de conexão. Tente novamente.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Copiado!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden">
      {/* Efeito de fundo futurista */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-black to-purple-950/20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Chat Header */}
      <div className="relative p-4 bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-cyan-950/80 backdrop-blur-xl border-b border-cyan-500/30 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              ZAP BET IA
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/50">v2.0</span>
            </h3>
            <p className="text-xs text-cyan-300 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Análise Profunda Ativa
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onOpenBankroll && (
            <button 
              onClick={onOpenBankroll} 
              className="w-9 h-9 rounded-xl bg-black/50 hover:bg-cyan-950/50 backdrop-blur-md flex items-center justify-center border border-cyan-500/30 hover:border-cyan-400 transition group"
              title="Gestão de Banca"
            >
              <Wallet className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
            </button>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/50 hover:bg-red-950/50 border border-slate-700 hover:border-red-500 text-white flex items-center justify-center font-bold text-xs transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="relative bg-black/80 backdrop-blur-md px-4 py-2 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs text-cyan-300 font-bold">MODO: ANÁLISE PROFUNDA</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span>Online</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="relative bg-gradient-to-r from-cyan-950/40 to-purple-950/40 px-4 py-2.5 border-b border-cyan-500/20 flex items-start gap-2 text-xs text-cyan-200">
        <span className="text-base shrink-0"></span>
        <p className="leading-relaxed">
          <strong className="text-cyan-300">IA Ativa:</strong> Busca odds reais em Betano, Bet365 e Flashscore. 
          Análise estatística + gestão de risco +EV.
        </p>
      </div>

      {/* Messages Scroll Area */}
      <div className="relative flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
        {messages.map((m) => {
          const isBot = m.sender === 'bot';
          return (
            <div key={m.id} className={`flex gap-3 ${isBot ? 'items-start' : 'items-end flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 font-bold shadow-lg ${
                isBot 
                  ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-cyan-500/30' 
                  : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-slate-500/20'
              }`}>
                {isBot ? <Brain className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`relative max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed transition-all ${
                isBot 
                  ? 'bg-slate-950/80 backdrop-blur-md text-slate-100 border border-cyan-500/20 rounded-tl-sm shadow-lg shadow-cyan-500/5' 
                  : 'bg-gradient-to-br from-cyan-600 to-purple-600 text-white shadow-lg shadow-purple-500/20 rounded-tr-sm font-medium'
              }`}>
                
                {isBot && (m as any).analysisData ? (
                  <StructuredAnalysis data={(m as any).analysisData} />
                ) : (
                  <div className="whitespace-pre-line break-words space-y-2">{m.text}</div>
                )}

                {isBot && !(m as any).analysisData && (
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-cyan-500/10 text-xs text-slate-500">
                    <span>{new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={() => handleCopy(m.id, m.text)} className="hover:text-cyan-400 transition flex items-center gap-1 font-bold">
                      {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === m.id ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white flex items-center justify-center text-sm shrink-0 shadow-lg shadow-cyan-500/30">
              <Brain className="w-4 h-4" />
            </div>
            <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/20 p-4 rounded-2xl rounded-tl-sm shadow-lg flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-sm font-bold text-cyan-300">Analisando dados...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="relative px-3 py-2 bg-black/80 backdrop-blur-md border-t border-cyan-500/20 flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => handleSendMessage('Pesquise 10 jogos de hoje com odds reais da Betano e monte 3 bilhetes: conservador, equilibrado e ousado. Dê sua opinião sobre qual tem maior probabilidade de green.')} 
          className="px-3 py-2 bg-gradient-to-r from-cyan-950/50 to-purple-950/50 hover:from-cyan-900/50 hover:to-purple-900/50 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 rounded-xl text-xs font-black whitespace-nowrap transition shadow-lg shadow-cyan-500/10"
        >
          🎯 10 Jogos + 3 Bilhetes
        </button>
        <button 
          onClick={() => handleSendMessage('Quais os jogos de hoje e a data do dia?')} 
          className="px-3 py-2 bg-gradient-to-r from-emerald-950/50 to-teal-950/50 hover:from-emerald-900/50 hover:to-teal-900/50 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 rounded-xl text-xs font-black whitespace-nowrap transition"
        >
          📅 Jogos de Hoje
        </button>
        <button 
          onClick={() => handleSendMessage('Me dê um bilhete múltiplo de alta taxa de acerto para hoje')} 
          className="px-3 py-2 bg-gradient-to-r from-amber-950/50 to-orange-950/50 hover:from-amber-900/50 hover:to-orange-900/50 text-amber-300 border border-amber-500/30 hover:border-amber-400 rounded-xl text-xs font-black whitespace-nowrap transition"
        >
          🎟️ Bilhete Múltiplo
        </button>
      </div>

      {/* Message Input Box */}
      <div className="relative p-3 bg-black/80 backdrop-blur-md border-t border-cyan-500/20">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Digite sua análise ou pergunta..."
            className="flex-1 bg-slate-950/80 border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium placeholder-slate-500 transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white flex items-center justify-center transition shadow-lg shadow-cyan-500/30 disabled:opacity-40 disabled:shadow-none shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
