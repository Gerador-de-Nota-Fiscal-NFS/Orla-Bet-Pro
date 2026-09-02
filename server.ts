import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

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

  // 🌟 Rota de Chat com Gemini + Google Search
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

  //  Rota de Análise Estruturada (JSON)
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { command, context } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Comando inválido.' });
      }

      const ai = getGenAI();
      if (!ai) return res.status(503).json({ error: 'IA não configurada.' });

      const systemPrompt = `Você é a ZAP BET IA v2.0. Retorne APENAS JSON válido, sem markdown.

Use Google Search para buscar odds REAIS (Betano, Flashscore, Bet365).
Se não encontrar odds, use null e avise no campo "riscos".

FORMATO JSON:
{
  "tipo": "analise_pre_jogo",
  "titulo": "Análise [Jogo]",
  "resumo": "Resumo em 2-3 frases",
  "partida": { "competicao": "...", "data": "YYYY-MM-DD", "horario": "HH:MM", "estadio": "...", "status": "agendado" },
  "desfalques": [{ "jogador": "...", "time": "...", "motivo": "...", "impacto": "alto|medio|baixo" }],
  "analise_tatica": "Texto...",
  "mercados": [{ "nome": "...", "odd": 1.85, "probabilidade_estimada": 54, "confianca": "alta|moderada|baixa", "argumentos": ["..."], "riscos": ["..."], "fonte": "Betano" }],
  "conclusao": "Texto com opinião e aviso de jogo responsável",
  "fontes": [{ "nome": "...", "url": "..." }],
  "consultado_em": "2026-09-03T12:00:00Z"
}

COMANDO: ${command}
CONTEXTO: ${context || 'Nenhum'}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: command,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2,
          tools: [{ googleSearch: {} }]
        }
      });

      const reply = response.text || '';
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
          analysisData.erro = 'Resposta sem campo "tipo"';
        }
        res.json({ success: true, data: analysisData });
      } catch (parseError) {
        console.error('Erro de parse:', parseError);
        res.status(500).json({ success: false, error: 'Formato inválido', rawResponse: reply.substring(0, 500) });
      }
    } catch (error) {
      console.error('Erro crítico:', error);
      res.status(500).json({ success: false, error: 'Erro interno', details: getErrorMessage(error) });
    }
  });

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
    console.log(`⚡ ZAP BET IA running on port ${PORT}`);
    console.log(`🤖 Gemini configurado: ${Boolean(key && key.length >= 20)} (Modelo: ${GEMINI_MODEL})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
