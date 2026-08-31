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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const FOOTBALL_TIMEZONE = 'America/Sao_Paulo';
const FOOTBALL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min cache
const LIVE_CACHE_TTL_MS = 30 * 1000; // 30s cache para jogos ao vivo
const REQUEST_TIMEOUT_MS = 15 * 1000; // 15s timeout

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

function getBrazilDate(): string {
  try {
    const now = new Date();
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
            headers: { 'x-apisports-key': token },
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

            console.log('[api-football] partidas recebidas:', rawMatches.length);

            normalizedMatches = rawMatches
              .map(normalizeMatch)
              .filter((match): match is NormalizedMatch => match !== null);

            console.log('[api-football] partidas normalizadas:', normalizedMatches.length);

            if (normalizedMatches.length === 0) {
              console.warn(
                '[fixtures] ⚠️ Nenhum jogo encontrado para', dateStr,
                '- Motivos: (1) Plano gratuito limita ligas, (2) Sem jogos nesta data, (3) Fuso horário'
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

      fixturesCache[cacheKey] = { timestamp: Date.now(), data: normalizedMatches };

      console.log('[fixtures] retornando:', normalizedMatches.length, 'partidas');
      res.json({ matches: normalizedMatches, source: 'api', date: dateStr });
    } catch (error) {
      console.error('Erro em /api/football/fixtures:', error);
      res.status(500).json({ error: 'Falha ao buscar partidas de futebol.', details: getErrorMessage(error) });
    }
  });

  // -----------------------------------------------------------
  // Rota de Jogos Ao Vivo em Tempo Real
  // -----------------------------------------------------------
  app.get('/api/football/live', async (req: Request, res: Response) => {
    console.log('[live] rota chamada:', req.originalUrl);

    try {
      const nocache = req.query.nocache === 'true';

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
            headers: { 'x-apisports-key': token },
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

      const newLiveCache: CacheEntry<NormalizedMatch[]> = { timestamp: Date.now(), data: normalizedMatches };
      
      console.log('[live] retornando:', normalizedMatches.length, 'partidas ao vivo');
      res.json({ matches: normalizedMatches, source: 'api', live: true });
    } catch (error) {
      console.error('Erro em /api/football/live:', error);
      res.status(500).json({ error: 'Falha ao buscar partidas ao vivo.', details: getErrorMessage(error) });
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

      res.json({ matches: [] });
    } catch (error) {
      console.error('Erro em /api/football/h2h:', error);
      res.json({ matches: [] });
    }
  });

  // -----------------------------------------------------------
  // 🌟 NOVO ENDPOINT: Gerador de Bilhetes com IA + Google Search
  // -----------------------------------------------------------
  app.post('/api/ai/ticket', async (req: Request, res: Response) => {
    try {
      const { matches, ticketType = 'conservative' } = req.body;

      if (!matches || !Array.isArray(matches) || matches.length === 0) {
        return res.status(400).json({ error: 'Nenhum jogo fornecido para análise.' });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({ error: 'IA não configurada. Adicione GEMINI_API_KEY nas variáveis de ambiente.' });
      }

      const gamesContext = matches.map((m: NormalizedMatch, i: number) => {
        return `${i + 1}. ${m.teams.home.name} vs ${m.teams.away.name} | Liga: ${m.league.name} | Horário: ${m.fixture.date}`;
      }).join('\n');

      const prompt = `Você é um analista profissional de apostas esportivas com acesso ao Google Search em tempo real.

CONTEXTO DOS JOGOS DE HOJE:
${gamesContext}

TAREFA:
1. Use o Google Search para pesquisar informações REAIS sobre estes jogos (lesões, forma recente, confrontos diretos, motivação).
2. Monte UM bilhete múltiplo com 3 a 5 seleções de ALTA CONFIANÇA.
3. Para CADA seleção, forneça: Jogo, Mercado, Odd estimada, Nível de confiança (Alto/Médio/Baixo), Justificativa detalhada e Fonte da informação.
4. Calcule: Odd total, Stake recomendada (% da banca), Retorno potencial para cada R$ 10 e Nível de risco geral.
5. Inclua um aviso de jogo responsável no final.

FORMATO DE RESPOSTA (JSON estrito, sem markdown):
{
  "ticketTitle": "Bilhete Múltiplo Inteligente",
  "totalOdd": 0.00,
  "confidenceLevel": "Alto/Médio/Baixo",
  "riskLevel": "Baixo/Médio/Alto",
  "recommendedStake": "1-2% da banca",
  "potentialReturn": "R$ X para cada R$ 10",
  "selections": [
    {
      "game": "Time A vs Time B",
      "league": "Nome da Liga",
      "market": "Mercado escolhido",
      "selection": "Seleção específica",
      "odd": 0.00,
      "confidence": "Alto/Médio/Baixo",
      "justification": "Justificativa detalhada com base nas pesquisas",
      "source": "Fonte da informação"
    }
  ],
  "responsibleGamingWarning": "Aviso de jogo responsável",
  "generatedAt": "timestamp ISO",
  "searchQueriesUsed": ["lista das pesquisas feitas no Google"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
          tools: [{ googleSearch: {} }] // Ativa a pesquisa na internet em tempo real
        }
      });

      const reply = response.text || '';
      
      try {
        const cleanJson = reply.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const ticketData = JSON.parse(cleanJson);
        
        res.json({ success: true, ticket: ticketData, rawResponse: reply });
      } catch (parseError) {
        res.json({ success: true, ticket: null, rawResponse: reply, parseError: 'Não foi possível parsear o JSON' });
      }

    } catch (error) {
      console.error('Erro ao gerar bilhete com IA:', error);
      res.status(500).json({ error: 'Erro ao gerar bilhete inteligente.', details: getErrorMessage(error) });
    }
  });

  // -----------------------------------------------------------
  // Rota de IA Esportiva (Chat Gemini)
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
            `• Priorize mercados de valor (+EV).\n\n` +
            `💡 *Configure a chave GEMINI_API_KEY nas variáveis de ambiente para análises aprofundadas.*`
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
      res.status(500).json({ error: 'Erro ao gerar resposta com a IA.', details: getErrorMessage(error) });
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
      res.status(500).json({ error: 'Erro interno no servidor.', message: getErrorMessage(err) });
    }
  });

  // -----------------------------------------------------------
  // Iniciar servidor
  // -----------------------------------------------------------
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Orla Bet Server running on http://0.0.0.0:${PORT}`);
    console.log(`📅 Data atual no Brasil: ${getBrazilDate()}`);
    console.log(`🔑 API_FOOTBALL_KEY configurado: ${Boolean(process.env.API_FOOTBALL_KEY?.trim())}`);
    console.log(`🤖 GEMINI_API_KEY configurada: ${Boolean(process.env.GEMINI_API_KEY?.trim())}`);
    console.log(`⏱️ Cache de fixtures: ${FOOTBALL_CACHE_TTL_MS / 1000}s | Cache de jogos ao vivo: ${LIVE_CACHE_TTL_MS / 1000}s`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});