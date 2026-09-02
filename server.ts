import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// -------------------------------------------------------------
// Configurações
// -------------------------------------------------------------

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.trim() || 'perplexity/sonar';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// -------------------------------------------------------------
// Utilitários
// -------------------------------------------------------------

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

async function callOpenRouter(messages: { role: string; content: string }[], temperature: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY não está configurada no ambiente.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': APP_URL,
      'X-Title': 'ZAP BET IA',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages,
      temperature: temperature,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || '';
}

// -------------------------------------------------------------
// Servidor Principal
// -------------------------------------------------------------

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const key = process.env.OPENROUTER_API_KEY?.trim();
    res.json({
      status: 'ok',
      service: 'ZAP BET IA Backend (OpenRouter)',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      port: PORT,
      openRouterConfigured: Boolean(key && key.length >= 10),
      model: OPENROUTER_MODEL
    });
  });

  // -----------------------------------------------------------
  // 🌟 Rota de IA Esportiva (Chat)
  // -----------------------------------------------------------
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, gamesSummary, selectedMatch, chatHistory } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida.' });
      }

      const systemPrompt = `Você é a ZAP BET IA v2.0, especialista em futebol com acesso a dados em tempo real via Google Search.

REGRAS CRÍTICAS:
1. NUNCA invente dados, estatísticas ou resultados de jogos.
2. SEMPRE use Google Search para buscar informações REAIS e ATUALIZADAS.
3. Responda em PT-BR, com Markdown limpo e organizado.
4. Foque em gestão de risco e +EV (valor esperado).
5. NUNCA prometa green certo, lucro garantido ou "aposta sem risco".
6. Sempre inclua aviso de jogo responsável no final.

QUANDO O USUÁRIO PEDIR ODDS OU BILHETES:
- Busque ativamente por: "odds Betano [time] hoje", "Flashscore odds [jogo]", "Bet365 odds [campeonato]".
- Se encontrar odds reais, cite a fonte exata (ex: "Odd 1.85 conforme Betano via Flashscore").
- Se NÃO conseguir acessar odds em tempo real, informe claramente: "Odds indisponíveis no momento, verifique no site da casa" e NÃO invente valores.
- Monte bilhetes com 2 a 5 seleções, informando: jogo, mercado, odd REAL, confiança (Alta/Média/Baixa).
- Calcule a odd total do bilhete multiplicando as odds individuais.
- Dê sua OPINIÃO sobre qual bilhete tem maior probabilidade, mas deixe claro que a decisão final é do cliente.

Contexto: ${gamesSummary || 'Nenhum'}
Jogo: ${selectedMatch ? JSON.stringify(selectedMatch) : 'Nenhum'}
Histórico: ${Array.isArray(chatHistory) ? chatHistory.map((c: any) => `${c.sender}: ${c.text}`).join('\n') : ''}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitizeText(message, 2000) }
      ];

      const reply = await callOpenRouter(messages, 0.7);
      res.json({ reply: reply || 'Não consegui processar a análise.' });
      
    } catch (error) {
      console.error('Erro no processamento OpenRouter IA:', error);
      res.status(502).json({ error: 'Não foi possível gerar a resposta da IA neste momento.', details: getErrorMessage(error) });
    }
  });

  // -----------------------------------------------------------
  // 🌟 ENDPOINT: Análise Estruturada de Futebol (JSON) - PROMPT OTIMIZADO PARA ODDS
  // -----------------------------------------------------------
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { command, context } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Comando inválido.' });
      }

      const systemPrompt = `Você é a ZAP BET IA v2.0, sistema profissional de análise esportiva com IA e acesso à busca na web em tempo real.

REGRAS CRÍTICAS:
1. SEMPRE use a ferramenta de busca (Google Search) para encontrar dados REAIS e ATUALIZADOS.
2. NUNCA invente odds, estatísticas, resultados ou desfalques.
3. Retorne APENAS um objeto JSON válido, sem markdown, sem texto antes ou depois.

QUANDO O USUÁRIO PEDIR ODDS OU BILHETES:
- Busque ativamente por: "odds Betano [time] hoje", "Flashscore odds [jogo]", "Bet365 odds [campeonato]".
- Se encontrar odds reais, cite a fonte exata no campo "fonte" (ex: "Betano", "Flashscore").
- Se NÃO conseguir encontrar odds em tempo real, defina "odd" como null e explique no campo "riscos" ou "conclusão": "Odds indisponíveis no momento, verifique na casa de apostas". NUNCA invente valores.
- Monte bilhetes com 2 a 5 seleções.
- Calcule a odd total multiplicando as odds individuais (se disponíveis).
- Dê sua opinião sobre qual bilhete tem maior probabilidade, mas deixe claro que a decisão final é do cliente.

FORMATO JSON EXATO:
{
  "tipo": "analise_pre_jogo" | "analise_ao_vivo" | "comparacao" | "odds" | "noticias" | "erro",
  "titulo": "Análise [Jogo ou Tema]",
  "resumo": "Resumo executivo em 2-3 frases",
  "partida": { "competicao": "...", "data": "YYYY-MM-DD", "horario": "HH:MM", "estadio": "...", "status": "agendado" | "ao_vivo" | "encerrado" },
  "desfalques": [ { "jogador": "...", "time": "...", "motivo": "...", "impacto": "alto" | "medio" | "baixo" } ],
  "analise_tatica": "Análise detalhada do confronto...",
  "mercados": [ { "nome": "Mercado (ex: Over 2.5)", "odd": 1.85, "probabilidade_estimada": 54, "confianca": "alta" | "moderada" | "baixa", "argumentos": ["Motivo 1"], "riscos": ["Risco 1"], "fonte": "Betano" } ],
  "conclusao": "Conclusão final com opinião sobre a melhor aposta e aviso de jogo responsável.",
  "fontes": [ { "nome": "Nome do site", "url": "https://..." } ],
  "consultado_em": "2026-09-03T12:00:00Z"
}

COMANDO: ${command}
CONTEXTO: ${context || 'Nenhum'}`;

      console.log('[AI Analyze] Processando:', command);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command }
      ];

      const reply = await callOpenRouter(messages, 0.2);
      console.log('[AI Analyze] Resposta recebida, length:', reply.length);
      
      let cleanJson = reply;
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanJson = jsonMatch[1];
      } else {
        const firstBrace = reply.indexOf('{');
        const lastBrace = reply.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanJson = reply.substring(firstBrace, lastBrace + 1);
        }
      }

      try {
        const analysisData = JSON.parse(cleanJson);
        if (!analysisData.tipo) {
          analysisData.tipo = 'erro';
          analysisData.erro = 'Resposta da IA não contém o campo "tipo"';
        }
        res.json({ success: true, data: analysisData });
      } catch (parseError) {
        console.error('[AI Analyze] Erro de parse:', parseError);
        res.status(500).json({ success: false, error: 'Formato inválido', rawResponse: reply.substring(0, 500) });
      }
      
    } catch (error) {
      console.error('[AI Analyze] Erro crítico:', error);
      res.status(502).json({ success: false, error: 'Não foi possível gerar a análise neste momento.', details: getErrorMessage(error) });
    }
  });

  // -----------------------------------------------------------
  // Integração Vite / Static Files
  // -----------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno.', message: getErrorMessage(err) });
  });

  app.listen(PORT, '0.0.0.0', () => {
    const key = process.env.OPENROUTER_API_KEY?.trim();
    console.log(`⚡ ZAP BET IA Server running on http://0.0.0.0:${PORT}`);
    console.log(`🤖 OPENROUTER configurado: ${Boolean(key && key.length >= 10)} (Modelo: ${OPENROUTER_MODEL})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
