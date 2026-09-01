import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, Copy, Check, Brain } from 'lucide-react';
import { ChatMessage } from '../types';
import { askOrlaAI } from '../services/aiService';

interface OrlaAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const OrlaAIChat: React.FC<OrlaAIChatProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `🧠 **Olá! Eu sou a ZAP BET IA**, sua central de inteligência esportiva.\n\n` +
        `Estou pronta para analisar qualquer time, campeonato ou cenário tático que você perguntar, usando dados reais da internet.\n\n` +
        `Experimente perguntar: "Analise o próximo jogo do Flamengo" ou "Compare as odds que vou enviar".`,
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
      const replyText = await askOrlaAI({
        message: query,
        chatHistory: messages.map(m => ({ sender: m.sender, text: m.text }))
      });

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
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
            <h3 className="font-black text-sm uppercase tracking-wider">ZAP BET IA</h3>
            <p className="text-[10px] text-cyan-200 font-medium">Análise em Tempo Real</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs transition">✕</button>
      </div>

      {/* Info Banner */}
      <div className="bg-cyan-950/30 px-3.5 py-2 border-b border-cyan-800/50 flex items-start gap-2 text-[11px] text-cyan-200">
        <span className="text-base shrink-0 mt-0.5">💡</span>
        <p className="leading-tight">
          <strong>Nota:</strong> A ZAP BET IA utiliza <strong>Google Search em tempo real</strong> para trazer notícias, estatísticas e análises precisas sobre qualquer time ou campeonato que você perguntar.
        </p>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-slate-950">
        {messages.map((m) => {
          const isBot = m.sender === 'bot';
          return (
            <div key={m.id} className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 font-bold ${isBot ? 'bg-gradient-to-tr from-cyan-600 to-purple-600 text-white shadow-sm' : 'bg-slate-700 text-white shadow-sm'}`}>
                {isBot ? <Brain className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`relative max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed transition-all ${isBot ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-sm' : 'bg-cyan-700 text-white shadow-md rounded-tr-sm font-medium'}`}>
                <div className="whitespace-pre-line break-words space-y-1">{m.text}</div>
                <div className={`flex items-center justify-between gap-2 mt-2 pt-1 border-t ${isBot ? 'border-slate-800 text-slate-500' : 'border-cyan-600 text-cyan-200'} text-[9px]`}>
                  <span>{new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isBot && (
                    <button onClick={() => handleCopy(m.id, m.text)} className="hover:text-cyan-400 transition flex items-center gap-1 font-bold">
                      {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === m.id ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-purple-600 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
              <Brain className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-bold text-slate-400 ml-1">Pesquisando e processando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        <button onClick={() => handleSendMessage('Analise o próximo jogo do Flamengo')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-[10px] font-black whitespace-nowrap transition">🔥 Próximo Jogo</button>
        <button onClick={() => handleSendMessage('Me dê um bilhete múltiplo de alta taxa de acerto para hoje')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-[10px] font-black whitespace-nowrap transition">🎟️ Bilhete Múltiplo</button>
        <button onClick={() => handleSendMessage('Como aplicar uma gestão de banca profissional?')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-[10px] font-black whitespace-nowrap transition">📈 Gestão de Banca</button>
      </div>

      {/* Message Input Box */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pergunte sobre qualquer time, jogo ou mercado..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner font-medium placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white flex items-center justify-center transition shadow-md disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};