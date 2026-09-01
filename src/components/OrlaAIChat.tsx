import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Flame, 
  TrendingUp, 
  ShieldAlert, 
  CornerRightDown,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { GameFixture, ChatMessage } from '../types';
import { askOrlaAI } from '../services/aiService';

interface OrlaAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameFixture[];
  selectedMatch?: GameFixture;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const OrlaAIChat: React.FC<OrlaAIChatProps> = ({
  isOpen,
  onClose,
  games,
  selectedMatch,
  onShowToast
}) => {
  const [aiMode, setAiMode] = useState<'tipster' | 'general'>('tipster');
  
  // ✅ MENSAGEM DE BOAS-VINDAS MELHORADA (funciona bem mesmo com 0 jogos)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `🦁 **Olá! Eu sou a Orla IA Universal**, seu motor analítico esportivo de alta precisão.\n\n` +
        `Estou pronta para analisar os **${games.length > 0 ? games.length + ' jogos' : 'principais campeonatos'}** do dia.\n\n` +
        `Você pode alternar entre os modos **🎯 Tipster (+EV)** ou **🧠 Analista Tático Geral** no topo da tela para obter análises sob medida!`,
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
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (selectedMatch && isOpen) {
      const prompt = `Faça uma análise estatística aprofundada do confronto entre ${selectedMatch.teams.home.name} e ${selectedMatch.teams.away.name}.`;
      handleSendMessage(prompt);
    }
  }, [selectedMatch]);

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
        gamesContext: games,
        selectedMatch,
        chatHistory: messages.map(m => ({ sender: m.sender, text: m.text })),
        mode: aiMode
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
    <div 
      id="orla-ai-chat-drawer"
      className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[420px] h-[590px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-purple-200 flex flex-col overflow-hidden animate-fadeIn"
    >
      {/* Chat Header */}
      <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg border border-white/30 shadow-sm">
            🦁
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-sm uppercase tracking-wider">
                Orla IA Universal
              </h3>
              <span className="bg-emerald-400 text-emerald-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                Online
              </span>
            </div>
            <p className="text-[10px] text-purple-200 font-medium">
              {aiMode === 'tipster' ? 'Modo: Tipster & Valor (+EV)' : 'Modo: Analista Tático Geral'}
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs transition"
        >
          ✕
        </button>
      </div>

      {/* Mode Selector Bar */}
      <div className="bg-purple-950/90 text-white px-3 py-2 flex items-center justify-between text-[11px] font-bold border-b border-purple-800/60">
        <span className="text-[10px] text-purple-300 font-semibold">Perfil de Análise:</span>
        <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-xl border border-white/10">
          <button
            onClick={() => setAiMode('tipster')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition ${
              aiMode === 'tipster' 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'text-purple-300 hover:text-white'
            }`}
          >
            🎯 Tipster (+EV)
          </button>
          <button
            onClick={() => setAiMode('general')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition ${
              aiMode === 'general' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-purple-300 hover:text-white'
            }`}
          >
            🧠 Tático Geral
          </button>
        </div>
      </div>

      {/* ✅ NOVO: Aviso Profissional de Limitação da API + Poder da IA */}
      <div className="bg-amber-50 px-3.5 py-2 border-b border-amber-200 flex items-start gap-2 text-[11px] text-amber-900">
        <span className="text-base shrink-0 mt-0.5">💡</span>
        <p className="leading-tight">
          <strong>Nota:</strong> Devido às limitações do plano gratuito da API de dados, alguns jogos podem não aparecer no sistema. 
          Porém, a <strong>Orla IA continua 100% ativa</strong> e usa o <strong>Google Search em tempo real</strong> para analisar qualquer time, notícia ou mercado que você perguntar!
        </p>
      </div>

      {/* Match Context Pill if match is loaded */}
      {selectedMatch && (
        <div className="bg-purple-50 px-3.5 py-1.5 border-b border-purple-100 flex items-center justify-between text-[11px] text-purple-900 font-bold">
          <span className="truncate">
            🎯 Analisando: {selectedMatch.teams.home.name} x {selectedMatch.teams.away.name}
          </span>
          <span className="text-[9px] bg-purple-200 px-1.5 py-0.5 rounded text-purple-950 uppercase shrink-0 font-black">
            {selectedMatch.league.name}
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-slate-50/50">
        {messages.map((m) => {
          const isBot = m.sender === 'bot';

          return (
            <div 
              key={m.id} 
              className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 font-bold ${
                isBot 
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm' 
                  : 'bg-cyan-600 text-white shadow-sm'
              }`}>
                {isBot ? '🦁' : <User className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div className={`relative max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed transition-all ${
                isBot 
                  ? 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm' 
                  : 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20 rounded-tr-sm font-medium'
              }`}>
                {/* Formatted Text */}
                <div className="whitespace-pre-line break-words space-y-1">
                  {m.text}
                </div>

                {/* Footer / Copy button */}
                <div className={`flex items-center justify-between gap-2 mt-2 pt-1 border-t ${
                  isBot ? 'border-slate-100 text-slate-400' : 'border-cyan-500/50 text-cyan-200'
                } text-[9px]`}>
                  <span>
                    {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {isBot && (
                    <button
                      onClick={() => handleCopy(m.id, m.text)}
                      className="hover:text-purple-600 transition flex items-center gap-1 font-bold"
                      title="Copiar resposta"
                    >
                      {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
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
            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
              🦁
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-bold text-slate-500 ml-1">
                Pesquisando e processando análise...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => handleSendMessage('Quais são as melhores apostas e maiores favoritos de hoje?')}
          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[10px] font-black whitespace-nowrap transition"
        >
          🔥 Melhores Apostas
        </button>
        <button
          onClick={() => handleSendMessage('Me dê um bilhete múltiplo de alta taxa de acerto com os jogos de hoje.')}
          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black whitespace-nowrap transition"
        >
          🎟️ Bilhete Múltiplo
        </button>
        <button
          onClick={() => handleSendMessage('Quais partidas de hoje têm maior probabilidade de Mais de 2.5 Gols ou Ambas Marcam?')}
          className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-xl text-[10px] font-black whitespace-nowrap transition"
        >
          ⚽ Mercado de Gols
        </button>
        <button
          onClick={() => handleSendMessage('Como aplicar uma gestão de banca profissional para lucrar consistente?')}
          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-black whitespace-nowrap transition"
        >
          📈 Gestão de Banca
        </button>
      </div>

      {/* Message Input Box */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pergunte sobre qualquer time, jogo ou mercado..."
            className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500 shadow-inner font-medium"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center transition shadow-md shadow-purple-600/20 disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};