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

// ✅ CORREÇÃO 1: Usar PORT da variável de ambiente (Render define automaticamente)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const FOOTBALL_TIMEZONE = 'America/Sao_Paulo';

// ✅ CORREÇÃO 3: Cache aumentado de 1 min para 5 min (evita atingir limite de 100 req/dia)
const FOOTBALL_CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_CACHE_TTL_MS = 30 * 1000; // Cache curto para jogos ao vivo (30s)

// ✅ CORREÇÃO 4: Timeout aumentado de 12s para 15s
const REQUEST_TIMEOUT_MS = 15 * 1000;

// Endpoint correto da API-Football v3
const API_FOOTBALL_FIXTURES_URL = 'https://v3.football.api-sports.io/fixtures';
const API_FOOTBALL_LIVE_URL = 'https://v3.football.api-sports.io/fixtures?live=all';

// -------------------------------------------------------------
// Cache em memória
// -------------------------------------------------------------

const fixturesCache: Record<string, CacheEntry<NormalizedMatch[]>> = {};
const liveCache: CacheEntry<NormalizedMatch[]> | null = null;
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

// ✅ CORREÇÃO 2: Fuso horário brasileiro com cálculo matemático preciso
function getBrazilDate(): string {
  try {
    const now = new Date();
    // Cálculo preciso: UTC + offset do timezone (-3h para São Paulo)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brazilOffset = -3 * 3600000; // UTC-3
    const brazilTime = new Date(utcTime + brazilOffset);

    const year = brazilTime.getUTCFullYear();
    const month = String(brazilTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(brazilTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Normalizador para API-Football v3
function normalizeMatch(item: any): NormalizedMatch | null {
  if (!item || !item.fixture || !item.teams) return null;

  return {
    fixture: {
      id: item.fixture.id,
      date: item.fixture.date,
      timestamp: item.fixture.timestamp || null,
      timezone: item.fixture.timezone || 'UTC',
      status: {
        long: item.fixture.status?.long || 'Not Started',
        short: item.fixture.status?.short || 'NS',
        elapsed: item.fixture.status?.elapsed || null
      }
    },
    league: {
      id: item.league?.id,
      name: item.league?.name || 'Desconhecida'
    },
    teams: {
      home: {
        id: item.teams.home?.id,
        name: item.teams.home?.name || 'Mandante',
        logo: item.teams.home?.logo || undefined
      },
      away: {
        id: item.teams.away?.id,
        name: item.teams.away?.name || 'Visitante',
        logo: item.teams.away?.logo || undefined
      }
    },
    goals: {
      home: item.goals?.home ?? null,
      away: item.goals?.away ?? null
    },
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

  // CORS Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-apisports-key');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // -----------------------------------------------------------
  // Rota de Health Check
  // -----------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    const hasApiFootballKey = Boolean(process.env.API_FOOTBALL_KEY?.trim());
    const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({
      status: 'ok',
      service: 'Orla Bet Pro Analytics Backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      port: PORT,
      apiFootballConfigured: hasApiFootballKey,
      geminiConfigured: hasGemini,
      brazilDate: getBrazilDate()
    });
  });

  // -----------------------------------------------------------
  // Rota de Jogos / Fixtures (por data)
  // -----------------------------------------------------------
  app.get('/api/football/fixtures', async (req: Request, res: Response) => {
    console.log('[fixtures] rota chamada:', req.originalUrl);

    try {
      const dateStr = getQueryString(req.query.date) || getBrazilDate();
      const nocache = req.query.nocache === 'true';
      const cacheKey = `fixtures_${dateStr}`;

      console.log('[fixtures] data solicitada:', dateStr);
      console.log('[fixtures] data do Brasil (hoje):', getBrazilDate());

      // Verificar Cache
      const cached = fixturesCache[cacheKey];
      if (!nocache && cached && Date.now() - cached.timestamp < FOOTBALL_CACHE_TTL_MS) {
        console.log('[fixtures] retornando do cache:', cached.data.length, 'partidas');
        return res.json({ matches: cached.data, source: 'cache' });
      }

      const token = process.env.API_FOOTBALL_KEY?.trim();
      let normalizedMatches: NormalizedMatch[] = [];

      if (token) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

          const apiUrl = `${API_FOOTBALL_FIXTURES_URL}?date=${dateStr}`;
          console.log('[fixtures] URL da API:', apiUrl);

          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'x-apisports-key': token
            },
            cache: 'no-store',
            signal: controller.signal
          });
          clearTimeout(timeout);

          console.log('[fixtures] status da resposta:', apiResponse.status);

          if (apiResponse.ok) {
            const providerData = await apiResponse.json();

            console.log(
              '[api-football] resposta do provedor:',
              {
                status: apiResponse.status,
                results: providerData.results || 0,
                body: JSON.stringify(providerData).slice(0, 3000)
              }
            );

            const rawMatches = providerData.response || [];

            console.log(
              '[api-football] partidas recebidas:',
              rawMatches.length
            );

            normalizedMatches = rawMatches
              .map(normalizeMatch)
              .filter((match): match is NormalizedMatch => match !== null);

            console.log(
              '[api-football] partidas normalizadas:',
              normalizedMatches.length
            );

            // ✅ CORREÇÃO 6: Log explicativo quando não há jogos
            if (normalizedMatches.length === 0) {
              console.warn(
                '[fixtures] ⚠️ Nenhum jogo encontrado para',
                dateStr,
                '- Possíveis motivos: (1) Plano gratuito só retorna certas ligas, (2) Não há jogos nesta data, (3) Fuso horário diferente'
              );
            }
          } else {
            const errorText = await apiResponse.text();
            console.warn(`[fixtures] API-Football retornou status ${apiResponse.status}:`, errorText);

            if (apiResponse.status === 401 || apiResponse.status === 403) {
              console.error('[fixtures] token inválido ou expirado');
            } else if (apiResponse.status === 429) {
              console.error('[fixtures] limite de requisições excedido (100/dia no plano gratuito)');
            }
          }
        } catch (e) {
          console.warn('[fixtures] Erro na consulta API-Football:', getErrorMessage(e));
        }
      } else {
        console.warn('[fixtures] API_FOOTBALL_KEY não configurado no ambiente.');
      }

      // Salvar Cache
      fixturesCache[cacheKey] = {
        timestamp: Date.now(),
        data: normalizedMatches
      };

      console.log('[fixtures] retornando:', normalizedMatches.length, 'partidas');
      res.json({ matches: normalizedMatches, source: 'api', date: dateStr });
    } catch (error) {
      console.error('Erro em /api/football/fixtures:', error);
      res.status(500).json({
        error: 'Falha ao buscar partidas de futebol.',
        details: getErrorMessage(error)
      });
    }
  });

  // ✅ CORREÇÃO 5: NOVO ENDPOINT - Jogos ao vivo em tempo real
  app.get('/api/football/live', async (req: Request, res: Response) => {
    console.log('[live] rota chamada:', req.originalUrl);

    try {
      const nocache = req.query.nocache === 'true';

      // Cache curto para jogos ao vivo (30 segundos)
      if (!nocache && liveCache && Date.now() - liveCache.timestamp < LIVE_CACHE_TTL_MS) {
        console.log('[live] retornando do cache:', liveCache.data.length, 'partidas ao vivo');
        return res.json({ matches: liveCache.data, source: 'cache' });
      }

      const token = process.env.API_FOOTBALL_KEY?.trim();
      let normalizedMatches: NormalizedMatch[] = [];

      if (token) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

          console.log('[live] URL da API:', API_FOOTBALL_LIVE_URL);

          const apiResponse = await fetch(API_FOOTBALL_LIVE_URL, {
            method: 'GET',
            headers: {
              'x-apisports-key': token
            },
            cache: 'no-store',
            signal: controller.signal
          });
          clearTimeout(timeout);

          console.log('[live] status da resposta:', apiResponse.status);

          if (apiResponse.ok) {
            const providerData = await apiResponse.json();
            const rawMatches = providerData.response || [];

            console.log('[api-football-live] partidas ao vivo recebidas:', rawMatches.length);

            normalizedMatches = rawMatches
              .map(normalizeMatch)
              .filter((match): match is NormalizedMatch => match !== null);

            console.log('[api-football-live] partidas ao vivo normalizadas:', normalizedMatches.length);
          } else {
            const errorText = await apiResponse.text();
            console.warn('[live] API-Football retornou erro:', apiResponse.status, errorText);
          }
        } catch (e) {
          console.warn('[live] Erro na consulta de jogos ao vivo:', getErrorMessage(e));
        }
      }

      // Salvar no cache de jogos ao vivo
      const newLiveCache: CacheEntry<NormalizedMatch[]> = {
        timestamp: Date.now(),
        data: normalizedMatches
      };

      console.log('[live] retornando:', normalizedMatches.length, 'partidas ao vivo');
      res.json({ matches: normalizedMatches, source: 'api', live: true });
    } catch (error) {
      console.error('Erro em /api/football/live:', error);
      res.status(500).json({
        error: 'Falha ao buscar partidas ao vivo.',
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
            ` *Configure a chave GEMINI_API_KEY nas variáveis de ambiente para análises aprofundadas com inteligência artificial generativa em tempo real.*`
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
        model: 'gemini-2.0-flash',
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
  // Iniciar servidor
  // -----------------------------------------------------------
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Orla Bet Server running on http://0.0.0.0:${PORT}`);
    console.log(` Data atual no Brasil: ${getBrazilDate()}`);
    console.log(`🔑 API_FOOTBALL_KEY configurado: ${Boolean(process.env.API_FOOTBALL_KEY?.trim())}`);
    console.log(`🤖 GEMINI_API_KEY configurada: ${Boolean(process.env.GEMINI_API_KEY?.trim())}`);
    console.log(`️ Cache de fixtures: ${FOOTBALL_CACHE_TTL_MS / 1000}s | Cache de jogos ao vivo: ${LIVE_CACHE_TTL_MS / 1000}s`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});