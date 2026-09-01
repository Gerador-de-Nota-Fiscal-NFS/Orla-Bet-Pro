import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// -------------------------------------------------------------
// Configurações
// -------------------------------------------------------------

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  'gemini-2.5-flash';


// -------------------------------------------------------------
// Cliente Gemini (Inicialização Lazy)
// -------------------------------------------------------------

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (aiClient) return aiClient;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  
  if (!apiKey || apiKey.length < 20) {
    console.error('❌ ERRO CRÍTICO: GEMINI_API_KEY não está configurada ou é muito curta.');
    return null;
  }

  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    console.log('✅ Gemini inicializado com sucesso.');
    return aiClient;
  } catch (error) {
    console.error('Falha ao inicializar o Gemini:', getErrorMessage(error));
    return null;
  }
}

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
    const key = process.env.GEMINI_API_KEY?.trim();
    res.json({
      status: 'ok',
      service: 'ZAP BET IA Backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      port: PORT,
      geminiConfigured: Boolean(key && key.length >= 20),
    });
  });

  // -----------------------------------------------------------
  // 🌟 Rota de IA Esportiva (Chat Gemini)
  // -----------------------------------------------------------
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, gamesSummary, selectedMatch, chatHistory } = req.body;
      if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Mensagem inválida.' });

      const ai = getGenAI();
      if (!ai) return res.status(503).json({ error: 'IA não configurada.' });

      const systemPrompt = `Você é a ZAP BET IA, especialista em futebol com Google Search em tempo real.
NUNCA invente dados. Use APENAS informações reais encontradas via busca.
Responda em PT-BR, com Markdown limpo, citando fontes reais. Foque em gestão de risco e +EV.
Contexto: ${gamesSummary || 'Nenhum'}
Jogo: ${selectedMatch ? JSON.stringify(selectedMatch) : 'Nenhum'}
Histórico: ${Array.isArray(chatHistory) ? chatHistory.map((c: any) => `${c.sender}: ${c.text}`).join('\n') : ''}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: sanitizeText(message, 2000),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          tools: [{ googleSearch: {} }]
        }
      });

      res.json({ reply: response.text || 'Não consegui processar a análise.' });
    } catch (error) {
      console.error('Erro no processamento Gemini IA:', error);
      res.status(502).json({ error: 'Não foi possível gerar a resposta da IA neste momento.' });
    }
  });

  // -----------------------------------------------------------
  // 🌟 NOVO ENDPOINT: Análise Estruturada de Futebol
  // -----------------------------------------------------------
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { command, context } = req.body;
      if (!command || typeof command !== 'string') return res.status(400).json({ error: 'Comando inválido.' });

      const ai = getGenAI();
      if (!ai) return res.status(503).json({ error: 'IA não configurada.' });

      const systemPrompt = `Você é a ZAP BET IA. Retorne APENAS um objeto JSON válido, sem markdown, sem texto antes ou depois.
FORMATO:
{
  "tipo": "analise_pre_jogo" | "analise_ao_vivo" | "comparacao" | "odds" | "noticias" | "erro",
  "titulo": "Nome da análise",
  "resumo": "Resumo em 2-3 frases",
  "partida": { "competicao": "...", "data": "YYYY-MM-DD", "horario": "HH:MM", "estadio": "...", "status": "agendado" | "ao_vivo" | "encerrado" },
  "desfalques": [ { "jogador": "...", "time": "...", "motivo": "...", "impacto": "alto" | "medio" | "baixo" } ],
  "analise_tatica": "Texto...",
  "mercados": [ { "nome": "...", "odd": 1.85, "probabilidade_estimada": 54, "confianca": "alta" | "moderada" | "baixa", "argumentos": ["..."], "riscos": ["..."] } ],
  "conclusao": "Texto...",
  "fontes": [ { "nome": "...", "url": "..." } ],
  "consultado_em": "2026-09-01T12:00:00Z"
}
COMANDO: ${command}
CONTEXTO: ${context || 'Nenhum'}`;

      console.log('[AI Analyze] Processando:', command);

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
      
      // 🛡️ PARSER DE JSON ROBUSTO
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
      res.status(502).json({ success: false, error: 'Não foi possível gerar a análise neste momento.' });
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

  // -----------------------------------------------------------
  // Tratamento de Erros Global
  // -----------------------------------------------------------
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erro interno.', message: getErrorMessage(err) });
  });

  // -----------------------------------------------------------
  // Iniciar servidor
  // -----------------------------------------------------------
  app.listen(PORT, '0.0.0.0', () => {
    const key = process.env.GEMINI_API_KEY?.trim();
    console.log(`⚡ ZAP BET IA Server running on http://0.0.0.0:${PORT}`);
    console.log(`🤖 GEMINI_API_KEY configurada: ${Boolean(key && key.length >= 20)}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
