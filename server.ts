import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// -------------------------------------------------------------
// Configurações
// -------------------------------------------------------------

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Modelo recomendado para busca em tempo real: 'perplexity/sonar'
// Alternativas: 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'
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

// Função centralizada para chamar a OpenRouter
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
      temperature: temperature
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

      const systemPrompt = `Você é a ZAP BET IA, especialista em futebol com acesso a dados em tempo real.
NUNCA invente dados. Use APENAS informações reais.
Responda em PT-BR, com Markdown limpo, citando fontes reais. Foque em gestão de risco e +EV.
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
  // 🌟 ENDPOINT: Análise Estruturada de Futebol (JSON)
  // -----------------------------------------------------------
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { command, context } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Comando inválido.' });
      }

      const systemPrompt = `Você é a ZAP BET IA. Retorne APENAS um objeto JSON válido, sem markdown, sem texto antes ou depois.
FORMATO EXATO:
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

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command }
      ];

      const reply = await callOpenRouter(messages, 0.2);
      console.log('[AI Analyze] Resposta recebida, length:', reply.length);
      
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
    const key = process.env.OPENROUTER_API_KEY?.trim();
    console.log(`⚡ ZAP BET IA Server running on http://0.0.0.0:${PORT}`);
    console.log(`🤖 OPENROUTER configurado: ${Boolean(key && key.length >= 10)} (Modelo: ${OPENROUTER_MODEL})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
