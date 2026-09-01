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