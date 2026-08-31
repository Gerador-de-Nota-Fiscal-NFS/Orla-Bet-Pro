import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// -------------------------------------------------------------
// Tipos
// -------------------------------------------------------------

type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

type NormalizedMatch = {
  fixture: {
    id: number;
    date: string;
    timestamp: number | null;
    timezone: string;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id?: number;
    name: string;
  };
  teams: {
    home: {
      id?: number;
      name: string;
      logo?: string;
    };
    away: {
      id?: number;
      name: string;
      logo?: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  source: string;
  lastUpdatedAt: string;
};

// -------------------------------------------------------------
// Configurações
// -------------------------------------------------------------

const PORT = 3000;
const FOOTBALL_TIMEZONE = 'America/Sao_Paulo';
const FOOTBALL_CACHE_TTL_MS = 60 * 1000; // 1 minuto de cache
const REQUEST_TIMEOUT_MS = 12 * 1000;
const FOOTBALL_DATA_MATCHES_URL = 'https://api.football-data.org/v4/matches';

// -------------------------------------------------------------
// Cache em memória
// -------------------------------------------------------------

const fixturesCache: Record<string, CacheEntry<NormalizedMatch[]>> = {};
const h2hCache: Record<string, CacheEntry<NormalizedMatch[]>> = {};

// -------------------------------------------------------------
// Cliente Gemini (Inicialização Lazy)
// -------------------------------------------------------------

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (aiClient) {
    return aiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
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
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const result = value.trim();
  return result || undefined;
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function getBrazilDate(): string {
  try {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = brazilTime.getFullYear();
    const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
    const day = String(brazilTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Normalizador para Football-Data.org
function normalizeFootballDataMatch(item: any): NormalizedMatch | null {
  if (!item || !item.homeTeam || !item.awayTeam) return null;

  const statusMap: Record<string, { long: string; short: string; elapsed: number | null }> = {
    'SCHEDULED': { long: 'Não iniciado', short: 'NS', elapsed: null },
    'TIMED': { long: 'Agendado', short: 'NS', elapsed: null },
    'IN_PLAY': { long: 'Em Jogo', short: 'LIVE', elapsed: null },
    'PAUSED': { long: 'Intervalo', short: 'HT', elapsed: 45 },
    'FINISHED': { long: 'Encerrado', short: 'FT', elapsed: 90 },
    'POSTPONED': { long: 'Adiado', short: 'POSTP', elapsed: null },
    'CANCELLED': { long: 'Cancelado', short: 'CANC', elapsed: null }
  };

  const status = statusMap[item.status] || { long: item.status || 'Não iniciado', short: 'NS', elapsed: null };

  return {
    fixture: {
      id: item.id,
      date: item.utcDate,
      timestamp: item.utcDate ? Math.floor(new Date(item.utcDate).getTime() / 1000) : null,
      timezone: 'UTC',
      status
    },
    league: {
      id: item.competition?.id,
      name: item.competition?.name || 'Futebol'
    },
    teams: {
      home: {
        id: item.homeTeam?.id,
        name: item.homeTeam?.name || 'Mandante',
        logo: item.homeTeam?.crest || undefined
      },
      away: {
        id: item.awayTeam?.id,
        name: item.awayTeam?.name || 'Visitante',
        logo: item.awayTeam?.crest || undefined
      }
    },
    goals: {
      home: item.score?.fullTime?.home ?? null,
      away: item.score?.fullTime?.away ?? null
    },
    source: 'football-data.org',
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

  // CORS Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // -----------------------------------------------------------
  // Rota de Health Check
  // -----------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    const hasToken = Boolean((process.env.FOOTBALL_DATA_TOKEN || process.env.FOOTBALL_DATA_API_KEY)?.trim());
    const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({
      status: 'ok',
      service: 'Orla Bet Pro Analytics Backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      footballDataConfigured: hasToken,
      geminiConfigured: hasGemini
    });
  });

  // -----------------------------------------------------------
  // Rota de Jogos / Fixtures
  // -----------------------------------------------------------
  app.get('/api/football/fixtures', async (req: Request, res: Response) => {
    try {
      const dateStr = getQueryString(req.query.date) || getBrazilDate();
      const nocache = req.query.nocache === 'true';
      const cacheKey = `fixtures_${dateStr}`;

      // Verificar Cache
      const cached = fixturesCache[cacheKey];
      if (!nocache && cached && Date.now() - cached.timestamp < FOOTBALL_CACHE_TTL_MS) {
        return res.json({ matches: cached.data });
      }

      const token = (process.env.FOOTBALL_DATA_TOKEN || process.env.FOOTBALL_DATA_API_KEY)?.trim();
      let normalizedMatches: NormalizedMatch[] = [];

      if (token) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

          const apiUrl = `${FOOTBALL_DATA_MATCHES_URL}?dateFrom=${dateStr}&dateTo=${dateStr}`;
          const apiResponse = await fetch(apiUrl, {
            headers: {
              'Accept': 'application/json',
              'X-Auth-Token': token
            },
            signal: controller.signal
          });
          clearTimeout(timeout);

          if (apiResponse.ok) {
            const providerData = await apiResponse.json();
            const rawMatches = providerData.matches || [];
            normalizedMatches = rawMatches
              .map(normalizeFootballDataMatch)
              .filter((match: NormalizedMatch | null): match is NormalizedMatch => match !== null);
          } else {
            console.warn(`[fixtures] Football-Data API retornou status ${apiResponse.status}`);
          }
        } catch (e) {
          console.warn('[fixtures] Erro na consulta Football-Data:', getErrorMessage(e));
        }
      }

      // Salvar Cache
      fixturesCache[cacheKey] = {
        timestamp: Date.now(),
        data: normalizedMatches
      };

      res.json({ matches: normalizedMatches });
    } catch (error) {
      console.error('Erro em /api/football/fixtures:', error);
      res.status(500).json({
        error: 'Falha ao buscar partidas de futebol.',
        details: getErrorMessage(error)
      });
    }
  });

  // -----------------------------------------------------------
  // Rota de H2H (Confronto Direto)
  // -----------------------------------------------------------
  app.get('/api/football/h2h', async (req: Request, res: Response) => {
    try {
      const homeId = getQueryString(req.query.home);
      const awayId = getQueryString(req.query.away);

      if (!homeId || !awayId) {
        return res.json({ matches: [] });
      }

      const cacheKey = `h2h_${homeId}_${awayId}`;
      const cached = h2hCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < FOOTBALL_CACHE_TTL_MS * 5) {
        return res.json({ matches: cached.data });
      }

      // Retorna array vazio caso não haja API de H2H conectada
      res.json({ matches: [] });
    } catch (error) {
      console.error('Erro em /api/football/h2h:', error);
      res.json({ matches: [] });
    }
  });

  // -----------------------------------------------------------
  // Rota de IA Esportiva (Gemini)
  // -----------------------------------------------------------
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, gamesSummary, selectedMatch, chatHistory } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida ou não fornecida.' });
      }

      const ai = getGenAI();

      if (!ai) {
        return res.json({
          reply: `🤖 **Orla IA (Assistente Esportivo)**\n\nRecebi sua análise sobre: "${sanitizeText(message, 100)}".\n\n` +
            `⚽ **Princípios de Gestão de Risco:**\n` +
            `• Mantenha stake controlada (1% a 2% da banca por entrada).\n` +
            `• Priorize mercados de valor (+EV), como Dupla Chance ou Over Gols em jogos de alta intensidade.\n\n` +
            `💡 *Configure a chave GEMINI_API_KEY nas variáveis de ambiente para análises aprofundadas com inteligência artificial generativa em tempo real.*`
        });
      }

      const systemPrompt = `Você é o "Orla IA", analista e cientista de dados esportivo oficial da plataforma Orla Bet Pro Analytics.
Especialista em futebol nacional e internacional.
Seu tom é profissional, analítico, seguro, ético e sempre focado em gestão de risco consciente e estatística de valor esperado (+EV).

Diretrizes:
1. Responda em Português do Brasil (PT-BR).
2. Utilize Markdown limpo com tópicos e formatação clara.
3. Analise probabilidades, expectativa de gols (xG), ambas marcam e sugestões fundamentadas.
4. Reforce sempre a gestão de banca e o jogo responsável.

Contexto dos Jogos:
${gamesSummary || 'Nenhum jogo filtrado.'}

Jogo Selecionado:
${selectedMatch ? JSON.stringify(selectedMatch, null, 2) : 'Nenhum'}

Histórico:
${Array.isArray(chatHistory) ? chatHistory.map((c: any) => `${c.sender}: ${c.text}`).join('\n') : ''}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: sanitizeText(message, 2000),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7
        }
      });

      const reply = response.text || 'Não consegui processar a análise no momento. Tente novamente.';
      res.json({ reply });
    } catch (error) {
      console.error('Erro no processamento Gemini IA:', error);
      res.status(500).json({
        error: 'Erro ao gerar resposta com a IA.',
        details: getErrorMessage(error)
      });
    }
  });

  // -----------------------------------------------------------
  // Integração Vite / Static Files
  // -----------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // -----------------------------------------------------------
  // Tratamento de Erros Global
  // -----------------------------------------------------------
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno no servidor.',
        message: getErrorMessage(err)
      });
    }
  });

  // -----------------------------------------------------------
  // Iniciar servidor na porta 3000
  // -----------------------------------------------------------
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Orla Bet Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 FOOTBALL_DATA_TOKEN configurado: ${Boolean((process.env.FOOTBALL_DATA_TOKEN || process.env.FOOTBALL_DATA_API_KEY)?.trim())}`);
    console.log(`🤖 GEMINI_API_KEY configurada: ${Boolean(process.env.GEMINI_API_KEY?.trim())}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
