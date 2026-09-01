export interface AIAnalysisRequest {
  message: string;
  chatHistory?: { sender: 'user' | 'bot'; text: string }[];
}

// O nome deve ser askOrlaAI para bater com o import no OrlaAIChat.tsx
export async function askOrlaAI(request: AIAnalysisRequest): Promise<string> {
  const { message, chatHistory } = request;

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        chatHistory: chatHistory?.slice(-6) // Mantém o contexto das últimas 6 mensagens
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply && data.reply.trim().length > 0) {
        return data.reply;
      }
    } else {
      const errorText = await res.text();
      console.error('[AI Service] ❌ Erro na requisição:', res.status, errorText);
    }
  } catch (err) {
    console.error('[AI Service] ❌ Erro de rede ao chamar a IA:', err);
  }

  return `⚠️ **Ops! Tivemos uma instabilidade momentânea na conexão com a ZAP BET IA.**\n\nPor favor, tente novamente em alguns instantes.`;
}

// -----------------------------------------------------------
// 🌟 NOVO: Serviço para Análise Estruturada (Modo Profundo)
// -----------------------------------------------------------

export interface AnalysisRequest {
  command: string;
  context?: string;
}

export interface AnalysisResponse {
  tipo: string;
  titulo: string;
  resumo: string;
  partida?: {
    competicao: string;
    data: string;
    horario: string;
    estadio: string;
    status: string;
  };
  forma_recente?: any;
  desfalques?: Array<{
    jogador: string;
    time: string;
    motivo: string;
    impacto: 'alto' | 'medio' | 'baixo';
  }>;
  analise_tatica?: string;
  estatisticas?: Array<{
    categoria: string;
    time_casa: string;
    time_visitante: string;
  }>;
  mercados?: Array<{
    nome: string;
    odd: number | null;
    probabilidade_estimada: number | null;
    confianca: 'alta' | 'moderada' | 'baixa';
    argumentos: string[];
    riscos: string[];
  }>;
  conclusao?: string;
  fontes?: Array<{ nome: string; url: string }>;
  consultado_em?: string;
  erro?: string | null;
}

export async function analyzeFootball(request: AnalysisRequest): Promise<AnalysisResponse | null> {
  const { command, context } = request;

  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, context })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        return data.data as AnalysisResponse;
      }
    } else {
      const errorText = await res.text();
      console.error('[AI Analyze] Erro na requisição:', res.status, errorText);
    }
  } catch (err) {
    console.error('[AI Analyze] Erro de rede:', err);
  }

  return null;
}