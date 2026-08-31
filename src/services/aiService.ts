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

  // Prepara um resumo conciso dos jogos do dia para o contexto da IA
  const gamesSummary = gamesContext.slice(0, 12).map(g => {
    const p = calculateProbabilities(g.fixture.id, g.teams.home.id, g.teams.away.id);
    return `[${g.league.name}] ${g.teams.home.name} vs ${g.teams.away.name} | Prob: Casa ${p.home}%, Empate ${p.draw}%, Fora ${p.away}% | xG: ${p.expectedGoals} | Dica: ${p.vipSuggestion}`;
  }).join('\n');

  try {
    console.log('[AI Service] 📤 Enviando requisição para /api/ai/chat...', { 
      message, 
      hasGames: gamesContext.length > 0 
    });
    
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

    console.log('[AI Service] 📥 Status da resposta do servidor:', res.status);

    if (res.ok) {
      const data = await res.json();
      console.log('[AI Service] ✅ Resposta recebida com sucesso:', data);
      
      if (data.reply && data.reply.trim().length > 0) {
        return data.reply;
      } else {
        console.warn('[AI Service] ⚠️ Resposta da IA veio vazia ou sem o campo "reply".');
      }
    } else {
      const errorText = await res.text();
      console.error('[AI Service] ❌ Erro na requisição (Status ' + res.status + '):', errorText);
    }
  } catch (err) {
    console.error('[AI Service] ❌ Erro de rede ou exceção ao chamar a IA:', err);
  }

  // Se falhar, aciona o Fallback Local Inteligente
  console.log('[AI Service] ⚙️ Acionando fallback local...');
  return generateContextualLocalResponse(message, gamesContext, selectedMatch, mode);
}

function generateContextualLocalResponse(
  message: string, 
  games: GameFixture[], 
  selectedMatch?: GameFixture,
  mode: 'tipster' | 'general' = 'tipster'
): string {
  const lower = message.toLowerCase().trim();

  // 1. Verifica se o usuário perguntou sobre um time específico que está na lista de jogos
  if (games.length > 0) {
    for (const game of games) {
      const homeName = game.teams.home.name.toLowerCase();
      const awayName = game.teams.away.name.toLowerCase();

      if (lower.includes(homeName) || lower.includes(awayName)) {
        const p = calculateProbabilities(game.fixture.id, game.teams.home.id, game.teams.away.id);
        return `📊 **Análise Detalhada Orla IA (Modo Local): ${game.teams.home.name} x ${game.teams.away.name}**\n\n` +
          `• **Competição:** ${game.league.name}\n` +
          `• **Probabilidades:** ${game.teams.home.name} (${p.home}%) | Empate (${p.draw}%) | ${game.teams.away.name} (${p.away}%)\n` +
          `• **Expectativa de Gols (xG):** ${p.expectedGoals} gols projetados\n` +
          `• **Mercado de Maior Valor:** **${p.vipSuggestion}**\n\n` +
          `💡 *Recomendação de Gestão:* Entrada moderada com 1.5% a 2.0% da banca.`;
      }
    }
  } else {
    // Se não há jogos carregados (API gratuita sem jogos hoje)
    if (lower.includes('flamengo') || lower.includes('palmeiras') || lower.includes('são paulo') || lower.includes('corinthians') || lower.includes('gol')) {
       return `⚠️ **Atenção:** No momento, não há jogos das principais ligas carregados no sistema para hoje.\n\nIsso acontece porque o plano gratuito da API de futebol tem limitações de ligas e cota diária. Assim que os dados forem atualizados, poderei analisar sua pergunta com precisão estatística completa!`;
    }
  }

  // 2. Perguntas sobre Bilhete / Múltipla
  if (lower.includes('bilhete') || lower.includes('múltipla') || lower.includes('multipla') || lower.includes('combinada')) {
    if (games.length >= 3) {
        const topGames = [...games].map(g => {
          const p = calculateProbabilities(g.fixture.id, g.teams.home.id, g.teams.away.id);
          return { game: g, p };
        }).sort((a, b) => b.p.confidenceScore - a.p.confidenceScore).slice(0, 3);

        let oddTotal = 1.0;
        const listStr = topGames.map(item => {
          const favName = item.p.favorite === 'home' ? item.game.teams.home.name : item.game.teams.away.name;
          const oddVal = item.p.favorite === 'home' ? item.p.odds.home : item.p.odds.away;
          oddTotal *= oddVal;
          return `✅ **${item.game.teams.home.name} x ${item.game.teams.away.name}**\n   ➔ Entrada: *Vitória ${favName}* (@${oddVal.toFixed(2)})`;
        }).join('\n\n');

        return `🎯 **Bilhete VIP Sugerido (Modo Local):**\n\n${listStr}\n\n🔥 **Odd Total Estimada:** **@${oddTotal.toFixed(2)}**\n📌 *Gestão recomendada:* 1% a 2% de Stake Fixa.`;
    } else {
        return `🎯 **Bilhete VIP:** No momento, não há jogos suficientes carregados no sistema para gerar um bilhete múltiplo confiável. Tente novamente mais tarde!`;
    }
  }

  // 3. Perguntas sobre Gols / Over / Under
  if (lower.includes('gol') || lower.includes('over') || lower.includes('under') || lower.includes('ambas') || lower.includes('btts')) {
    return `⚽ **Análise de Mercado de Gols:**\n\nNosso algoritmo monitora o volume ofensivo e índice de xG (Expected Goals).\n\n*Dica de Ouro:* Em jogos com xG acima de 2.6, a linha Over 1.5 ao vivo oferece taxa de acerto superior a 84%. Aguarde os jogos do dia serem carregados para análises específicas!`;
  }

  // 4. Perguntas sobre Gestão de Banca
  if (lower.includes('banca') || lower.includes('gestão') || lower.includes('roi') || lower.includes('stake')) {
    return `📈 **Regra de Ouro Orla Bet - Gestão de Banca:**\n\n1. **Stake Fixa:** Nunca arrisque mais de 2% do seu bankroll por entrada.\n2. **Valor Esperado (+EV):** Aposte apenas quando a probabilidade matemática for maior que a odd oferecida.\n3. **Sem Martingale:** Evite dobrar apostas após red; a consistência no longo prazo é o segredo.`;
  }

  // 5. Resposta Genérica Melhorada (para sabermos que caiu no fallback)
  return `🤖 **Orla IA (Modo Fallback Local)**\n\n` +
    `Recebi sua mensagem, mas não encontrei palavras-chave específicas ou os jogos do dia ainda não foram carregados pela API.\n\n` +
    `💡 **Dica:** Tente perguntar "Como funciona a gestão de banca?" ou aguarde alguns minutos e pergunte sobre um time específico (ex: "Análise do Flamengo").`;
}