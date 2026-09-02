import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.length < 20) {
    console.error('❌ GEMINI_API_KEY não configurada');
    return null;
  }
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log('✅ Gemini inicializado');
    return aiClient;
  } catch (error) {
    console.error('Erro ao inicializar Gemini:', error);
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

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
    const key = process.env.GEMINI_API_KEY?.trim();
    res.json({
      status: 'ok',
      service: 'ZAP BET IA (Gemini)',
      geminiConfigured: Boolean(key && key.length >= 20),
      model: GEMINI_MODEL
    });
  });

  // 🌟 Rota de Chat
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, gamesSummary, selectedMatch, chatHistory } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida.' });
      }

      const ai = getGenAI();
      if (!ai) return res.status(503).json({ error: 'IA não configurada.' });

      const systemPrompt = `Você é a ZAP BET IA v2.0, especialista em futebol com Google Search em tempo real.

REGRAS:
1. Use Google Search para buscar dados REAIS (odds Betano, Flashscore, Bet365).
2. NUNCA invente odds ou estatísticas.
3. Responda em PT-BR com Markdown.
4. Foque em +EV e gestão de risco.
5. NUNCA prometa lucro garantido.

QUANDO PEDIREM ODDS/BILHETES:
- Busque: "odds Betano [time] hoje", "Flashscore odds [jogo]"
- Cite a fonte (ex: "Odd 1.85 - Betano via Flashscore")
- Se não encontrar odds, avise claramente e NÃO invente
- Monte bilhetes com 2-5 seleções
- Calcule odd total multiplicando as odds
- Dê opinião sobre melhor probabilidade, mas decisão é do cliente

Contexto: ${gamesSummary || 'Nenhum'}
Jogo: ${selectedMatch ? JSON.stringify(selectedMatch) : 'Nenhum'}
Histórico: ${Array.isArray(chatHistory) ? chatHistory.map((c: any) => `${c.sender}: ${c.text}`).join('\n') : ''}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: message,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          tools: [{ googleSearch: {} }]
        }
      });

      res.json({ reply: response.text || 'Não consegui processar.' });
    } catch (error) {
      console.error('Erro Gemini:', error);
      res.status(500).json({ error: 'Erro ao gerar resposta.', details: getErrorMessage(error) });
    }
  });

  // 🌟 Rota de Análise Estruturada (JSON) - COM RETRY
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { command, context } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Comando inválido.' });
      }

      const ai = getGenAI();
      if (!ai) return res.status(503).json({ error: 'IA não configurada.' });

      const systemPrompt = `Você é a ZAP BET IA v2.0. Retorne APENAS um objeto JSON válido.

IMPORTANTE:
- Use Google Search para buscar odds REAIS (Betano, Flashscore, Bet365)
- Se não encontrar odds, use null no campo "odd" e explique em "riscos"
- NÃO inclua markdown, NÃO inclua texto antes ou depois do JSON
- Retorne APENAS o JSON puro

FORMATO JSON OBRIGATÓRIO:
{
  "tipo": "analise_pre_jogo",
  "titulo": "Análise [Jogo]",
  "resumo": "Resumo em 2-3 frases",
  "partida": { "competicao": "...", "data": "YYYY-MM-DD", "horario": "HH:MM", "estadio": "...", "status": "agendado" },
  "desfalques": [],
  "analise_tatica": "Texto...",
  "mercados": [{ "nome": "Mercado", "odd": 1.85, "probabilidade_estimada": 54, "confianca": "alta", "argumentos": ["Motivo"], "riscos": ["Risco"], "fonte": "Betano" }],
  "conclusao": "Conclusão com aviso de jogo responsável",
  "fontes": [{ "nome": "Site", "url": "https://..." }],
  "consultado_em": "2026-09-03T12:00:00Z"
}

COMANDO: ${command}
CONTEXTO: ${context || 'Nenhum'}`;

      console.log('[AI Analyze] Processando:', command);

      // Tentativa 1
      let response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: command,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2,
          tools: [{ googleSearch: {} }]
        }
      });

      let reply = response.text || '';
      console.log('[AI Analyze] Resposta recebida, length:', reply.length);

      // Tentar extrair JSON
      let analysisData = extractJSON(reply);

      // Se falhou, tentar novamente com prompt mais simples
      if (!analysisData) {
        console.warn('[AI Analyze] JSON inválido, tentando novamente...');
        const simplePrompt = `Retorne APENAS JSON válido para: ${command}. Formato: {"tipo":"analise_pre_jogo","titulo":"...","resumo":"...","partida":{"competicao":"","data":"","horario":"","estadio":"","status":"agendado"},"desfalques":[],"analise_tatica":"","mercados":[],"conclusao":"","fontes":[],"consultado_em":"2026-09-03T12:00:00Z"}`;
        
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: simplePrompt,
          config: {
            temperature: 0.1
          }
        });

        reply = response.text || '';
        analysisData = extractJSON(reply);
      }

      // Se ainda falhou, retornar erro estruturado
      if (!analysisData) {
        console.error('[AI Analyze] Falhou ao gerar JSON após 2 tentativas');
        return res.status(500).json({ 
          success: false, 
          error: 'Não foi possível gerar análise estruturada',
          rawResponse: reply.substring(0, 200)
        });
      }

      res.json({ success: true, data: analysisData });
    } catch (error) {
      console.error('[AI Analyze] Erro crítico:', error);
      res.status(500).json({ success: false, error: 'Erro interno', details: getErrorMessage(error) });
    }
  });

  // Função auxiliar para extrair JSON
  function extractJSON(text: string): any {
    let cleanJson = text;
    
    // Tentar remover markdown
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1];
    } else {
      // Tentar encontrar JSON entre chaves
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = text.substring(firstBrace, lastBrace + 1);
      }
    }

    try {
      return JSON.parse(cleanJson);
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno.', message: getErrorMessage(err) });
  });

  app.listen(PORT, '0.0.0.0', () => {
    const key = process.env.GEMINI_API_KEY?.trim();
    console.log(` ZAP BET IA running on port ${PORT}`);
    console.log(`🤖 Gemini configurado: ${Boolean(key && key.length >= 20)} (Modelo: ${GEMINI_MODEL})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
