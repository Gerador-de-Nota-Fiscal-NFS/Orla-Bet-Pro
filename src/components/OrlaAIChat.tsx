import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, Copy, Check, Brain, Sparkles, Wallet } from 'lucide-react';
import { ChatMessage } from '../types';
import { askOrlaAI, analyzeFootball, AnalysisResponse } from '../services/aiService';
import { StructuredAnalysis } from './StructuredAnalysis';
import { BetSlipCards } from './BetSlipCards';

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
      text: ` **Olá! Eu sou a ZAP BET IA**, sua central de inteligência esportiva.\n\n` +
        `Estou pronta para analisar qualquer time, campeonato ou cenário tático que você perguntar, usando dados reais da internet.\n\n` +
        `Experimente perguntar: "Quais os jogos de hoje e a data do dia?" ou "Analise o próximo jogo do Flamengo".`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeepAnalysisMode, setIsDeepAnalysisMode] = useState(false);
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
      if (isDeepAnalysisMode) {
        const analysisData = await analyzeFootball({ command: query });
        
        const botMsg: any = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: analysisData ? '' : '⚠️ Não foi possível gerar a análise estruturada no momento.',
          timestamp: new Date().toISOString(),
          analysisData: analysisData
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const replyText = await askOrlaAI({
          message: query,
          chatHistory: messages.map(m => ({ sender: m.sender, text: m.text }))
        });

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: replyText,
          timestamp: new Date().toISOString(),
          betSlips: extractBetSlips(replyText) // Extrai bilhetes do texto
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'Desculpe, ocorreu uma instabilidade momentânea na conexão com o servidor de IA. Por favor, tente novamente.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Função para extrair bilhetes do texto da IA
  const extractBetSlips = (text: string): any[] => {
    // Procura por padrões de bilhetes no texto
    const slipRegex = /🎯\s*\*\*BILHETE\s+(\d+)\s*-\s*(\w+)\*\*(.*?)Odd\s+Total:\s*\*\*([\d.]+)/gs;
    const matches = [...text.matchAll(slipRegex)];
    
    return matches.map(match => ({
      number: match[1],
      type: match[2].toLowerCase(),
      content: match[3],
      totalOdd: parseFloat(match[4])
    }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Mensagem copiada!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Chat Header */}
      <div className="p-4 bg-gradient-to-r from-cyan-700 via-purple-700 to-cyan-700 text-white flex justify-between items-center shrink-0 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Brain className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-wider">ZAP BET IA</h3>
            <p className="text-xs text-cyan-200 font-medium">Análise em Tempo Real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onOpenBankroll && (
            <button 
              onClick={onOpenBankroll} 
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 transition"
              title="Gestão de Banca"
            >
              <Wallet className="w-5 h-5 text-emerald-300" />
            </button>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs transition">✕</button>
        </div>
      </div>

      {/* Toggle Modo Análise Profunda */}
      <div className="bg-slate-900/80 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-bold uppercase">Modo de Resposta:</span>
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setIsDeepAnalysisMode(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-black transition ${
              !isDeepAnalysisMode ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            💬 Chat Rápido
          </button>
          <button
            onClick={() => setIsDeepAnalysisMode(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-black transition flex items-center gap-1 ${
              isDeepAnalysisMode ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Análise Profunda
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-cyan-950/30 px-4 py-3 border-b border-cyan-800/50 flex items-start gap-2 text-xs text-cyan-200">
        <span className="text-base shrink-0 mt-0.5">💡</span>
        <p className="leading-relaxed">
          <strong>Nota:</strong> A ZAP BET IA utiliza <strong>busca em tempo real</strong> para trazer notícias, estatísticas, odds reais e análises precisas.
        </p>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-950">
        {messages.map((m) => {
          const isBot = m.sender === 'bot';
          return (
            <div key={m.id} className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 font-bold ${isBot ? 'bg-gradient-to-tr from-cyan-600 to-purple-600 text-white shadow-sm' : 'bg-slate-700 text-white shadow-sm'}`}>
                {isBot ? <Brain className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`relative max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed transition-all ${isBot ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-sm' : 'bg-cyan-700 text-white shadow-md rounded-tr-sm font-medium'}`}>
                
                {/* Renderização Condicional: Cards de Bilhetes vs Texto vs Análise Estruturada */}
                {isBot && (m as any).betSlips && (m as any).betSlips.length > 0 ? (
                  <BetSlipCards slips={(m as any).betSlips} />
                ) : isBot && (m as any).analysisData ? (
                  <StructuredAnalysis data={(m as any).analysisData} />
                ) : (
                  <div className="whitespace-pre-line break-words space-y-2 text-base">{m.text}</div>
                )}

                {/* Footer / Copy button */}
                {isBot && !(m as any).analysisData && !(m as any).betSlips && (
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800 text-xs text-slate-500">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-purple-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">
              <Brain className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-sm font-bold text-slate-400 ml-1">Pesquisando odds e processando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => handleSendMessage('Pesquise 10 jogos de hoje e monte 3 bilhetes: 1 conservador, 1 equilibrado e 1 ousado. Para cada bilhete, inclua as odds reais da Betano ou casas disponíveis, e no final dê sua opinião sobre qual bilhete tem maior probabilidade de green. Deixe claro que a decisão final é do cliente.')} 
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-black whitespace-nowrap transition"
        >
          🎯 10 Jogos + 3 Bilhetes
        </button>
        <button 
          onClick={() => handleSendMessage('Quais os jogos de hoje e a data do dia?')} 
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-black whitespace-nowrap transition"
        >
          📅 Jogos de Hoje
        </button>
        <button 
          onClick={() => handleSendMessage('Me dê um bilhete múltiplo de alta taxa de acerto para hoje')} 
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-black whitespace-nowrap transition"
        >
          ️ Bilhete Múltiplo
        </button>
      </div>

      {/* Message Input Box */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pergunte sobre jogos, odds ou gestão de banca..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner font-medium placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white flex items-center justify-center transition shadow-md disabled:opacity-40 shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
