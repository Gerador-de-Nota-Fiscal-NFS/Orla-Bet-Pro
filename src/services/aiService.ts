import { GameFixture } from '../types';
import { calculateProbabilities } from './apiSports';

export interface AIAnalysisRequest {
  message: string;
  gamesContext: GameFixture[];
  selectedMatch?: GameFixture;
  chatHistory?: { sender: 'user' | 'bot'; text: string }[];
  mode?: 'tipster' | 'general';
}

export async function askOrlaAI(request: AIAnalysisRequest): Promise<string> {
  const { message, gamesContext, selectedMatch, chatHistory, mode = 'tipster' } = request;

  // Prepara um resumo conciso dos jogos do dia (se houver). Se não houver, envia string vazia.
  const gamesSummary = gamesContext.length > 0 
    ? gamesContext.slice(0, 12).map(g => {
        const p = calculateProbabilities(g.fixture.id, g.teams.home.id, g.teams.away.id);
        return `[${g.league.name}] ${g.teams.home.name} vs ${g.teams.away.name} | Prob: Casa ${p.home}%, Empate ${p.draw}%, Fora ${p.away}%`;
      }).join('\n')
    : '';

  try {
    console.log('[AI Service] 📤 Enviando requisição para /api/ai/chat...');
    
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        gamesSummary,
        selectedMatch: selectedMatch ? {
          home: selectedMatch.teams.home.name,
          away: selectedMatch.teams.away.name,
          league: selectedMatch.league.name,
          date: selectedMatch.fixture.date,
          status: selectedMatch.fixture.status.short
        } : null,
        chatHistory: chatHistory?.slice(-4),
        mode
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

  // ✅ Fallback profissional e amigável. SEM a mensagem chata de "não encontrei palavras-chave".
  return `⚠️ **Ops! Tivemos uma instabilidade momentânea na conexão com a IA.**\n\n` +
         `Por favor, tente novamente em alguns instantes. Nossa equipe já foi notificada e está trabalhando para manter a Orla IA sempre disponível para você! 🦁`;
}