import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// -------------------------------------------------------------
// Tipos
// -------------------------------------------------------------

type CacheEntry<T> = { timestamp: number; data: T };

type NormalizedMatch = {
  fixture: { id: number; date: string; timestamp: number | null; timezone: string; status: { long: string; short: string; elapsed: number | null } };
  league: { id?: number; name: string };
  teams: { home: { id?: number; name: string; logo?: string }; away: { id?: number; name: string; logo?: string } };
  goals: { home: number | null; away: number | null };
  source: string;
  lastUpdatedAt: string;
};

// -------------------------------------------------------------
// Configurações
// -------------------------------------------------------------

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const FOOTBALL_CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_CACHE_TTL_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 15 * 1000;

const API_FOOTBALL_FIXTURES_URL = 'https://v3.football.api-sports.io/fixtures';
const API_FOOTBALL_LIVE_URL = 'https://v3.football.api-sports.io/fixtures?live=all';

// -------------------------------------------------------------
// Cache em memória
// -------------------------------------------------------------

const fixturesCache: Record<string, CacheEntry<NormalizedMatch[]>> = {};
let liveCache: CacheEntry<NormalizedMatch[]> | null = null;
const h2hCache: Record<string, CacheEntry<NormalizedMatch[]>> = {};

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

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const result = value.trim();
  return result || undefined;
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function getBrazilDate(): string {
  try {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brazilTime = new Date(utcTime - 3 * 3600000);
    return `${brazilTime.getUTCFullYear()}-${String(brazilTime.getUTCMonth() + 1).padStart(2, '0')}-${String(brazilTime.getUTCDate()).padStart(2, '0')}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function normalizeMatch(item: any): NormalizedMatch | null {
  if (!item || !item.fixture || !item.teams) return null;
  return {
    fixture: {
      id: item.fixture.id, date: item.fixture.date, timestamp: item.fixture.timestamp || null,
      timezone: item.fixture.timezone || 'UTC',
      status: { long: item.fixture.status?.long || 'Not Started', short: item.fixture.status?.short || 'NS', elapsed: item.fixture.status?.elapsed || null }
    },
    league: { id: item.league?.id, name: item.league?.name || 'Desconhecida' },
    teams: {
      home: { id: item.teams.home?.id, name: item.teams.home?.name || 'Mandante', logo: item.teams.home?.logo },
      away: { id: item.teams.away?.id, name: item.teams.away?.name || 'Visitante', logo: item.teams.away?.logo }
    },
    goals: { home: item.goals?.home ?? null, away: item.goals?.away ?? null },
    source: 'api-football',
    lastUpdatedAt: new Date().toISOString()
  };
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-apisports-key');
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
      keyPrefix: key ? key.substring(0, 3) : 'none'
    });
  });

  // -----------------------------------------------------------
  // 🌟 ENDPOINT: Gerador de Bilhetes com IA + Google Search
  // -----------------------------------------------------------
  app.post('/api/ai/ticket', async (req: Request, res: Response) => {
    try {
      const { matches } = req.body;
      if (!matches || !Array.isArray(matches) || matches.length === 0) return res.status(400).json({ error: 'Nenhum jogo fornecido.' });

      const ai = getGenAI();
      if (!ai) return res.status(503).json({ error: 'IA não configurada. Verifique a GEMINI_API_KEY.' });

      const gamesContext = matches.map((m: NormalizedMatch, i: number) => `${i + 1}. ${m.teams.home.name} vs ${m.teams.away.name} | Liga: ${m.league.name}`).join('\n');
      const prompt = `Analise estes jogos com Google Search e retorne JSON estrito (sem markdown):
{ "ticketTitle": "Bilhete Inteligente", "totalOdd": 0.00, "confidenceLevel": "Alto/Médio/Baixo", "selections": [{ "game": "A vs B", "market": "Mercado", "selection": "Seleção", "odd": 0.00, "confidence": "Alto/Médio/Baixo", "justification": "Motivo", "source": "Fonte" }], "responsibleGamingWarning": "Aviso de jogo responsável" }
JOGOS: ${gamesContext}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.0-flash', // ✅ MODELO MAIS RECENTE E ESTÁVEL (2025)
          contents: prompt,
          config: { temperature: 0.3, tools: [{ googleSearch: {} }] }
        });
      } catch (modelError: any) {
        console.warn('⚠️ gemini-2.0-flash falhou, tentando gemini-2.5-flash...');
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // ✅ FALLBACK PARA VERSÃO BETA
          contents: prompt,
          config: { temperature: 0.3, tools: [{ googleSearch: {} }] }
        });
      }

      const reply = response.text || '';
      try {
        const cleanJson = reply.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        res.json({ success: true, ticket: JSON.parse(cleanJson), rawResponse: reply });
      } catch {
        res.json({ success: true, ticket: null, rawResponse: reply, parseError: 'Erro ao parsear JSON' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro ao gerar bilhete.', details: getErrorMessage(error) });
    }
  });

  // -----------------------------------------------------------
  // 🌟 Rota de IA Esportiva (Chat Gemini)
  // -----------------------------------------------------------
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, gamesSummary, selectedMatch, chatHistory } = req.body;
      if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Mensagem inválida.' });

      const ai = getGenAI();
      if (!ai) return res.json({ reply: '🤖 **ZAP BET IA**\n\nErro: Chave da IA inválida ou não configurada.' });

      const systemPrompt = `Você é a ZAP BET IA, especialista em futebol com Google Search em tempo real.
NUNCA invente dados. Use APENAS informações reais encontradas via busca.
Responda em PT-BR, com Markdown limpo, citando fontes reais. Foque em gestão de risco e +EV.
Contexto: ${gamesSummary || 'Nenhum'}
Jogo: ${selectedMatch ? JSON.stringify(selectedMatch) : 'Nenhum'}
Histórico: ${Array.isArray(chatHistory) ? chatHistory.map((c: any) => `${c.sender}: ${c.text}`).join('\n') : ''}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.0-flash', // ✅ MODELO MAIS RECENTE E ESTÁVEL (2025)
          contents: sanitizeText(message, 2000),
          config: { systemInstruction: systemPrompt, temperature: 0.7, tools: [{ googleSearch: {} }] }
        });
      } catch (modelError: any) {
        console.warn('⚠️ gemini-2.0-flash falhou, tentando gemini-2.5-flash...');
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // ✅ FALLBACK PARA VERSÃO BETA
          contents: sanitizeText(message, 2000),
          config: { systemInstruction: systemPrompt, temperature: 0.7, tools: [{ googleSearch: {} }] }
        });
      }

      res.json({ reply: response.text || 'Não consegui processar a análise.' });
    } catch (error) {
      console.error('Erro no processamento Gemini IA:', error);
      res.status(500).json({ error: 'Erro ao gerar resposta.', details: getErrorMessage(error) });
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

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.0-flash', // ✅ MODELO MAIS RECENTE E ESTÁVEL (2025)
          contents: command,
          config: { systemInstruction: systemPrompt, temperature: 0.2, tools: [{ googleSearch: {} }] }
        });
      } catch (modelError: any) {
        console.warn('⚠️ gemini-2.0-flash falhou, tentando gemini-2.5-flash...');
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // ✅ FALLBACK PARA VERSÃO BETA
          contents: command,
          config: { systemInstruction: systemPrompt, temperature: 0.2, tools: [{ googleSearch: {} }] }
        });
      }

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
      res.status(500).json({ success: false, error: 'Erro interno', details: getErrorMessage(error) });
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
    console.log(`🤖 GEMINI_API_KEY configurada: ${Boolean(key && key.length >= 20)} (Prefixo: ${key ? key.substring(0, 3) : 'none'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});