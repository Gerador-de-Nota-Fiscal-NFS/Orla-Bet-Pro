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

type UnknownRecord = Record<string, unknown>;

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
const FOOTBALL_CACHE_TTL_MS = 60 * 1000; // 1 min cache
const PLAYERS_CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12 * 1000;

// CORREÇÃO 1: Endereço da API limpo, sem markdown
const FOOTBALL_DATA_MATCHES_URL = 'https://api.football-data.org/v4/matches';

// -------------------------------------------------------------
// Cache em memória
// -------------------------------------------------------------

const fixturesCache: Record<string, CacheEntry<NormalizedMatch[]>> = {};
const h2hCache: Record<string, CacheEntry<NormalizedMatch[]>> = {};
const playersCache: Record<string, CacheEntry<unknown>> = {};

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

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

// Função de normalização para atender aos logs da Correção 6
function normalizeMatch(item: any): NormalizedMatch | null {
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
  
  const status = statusMap[item.status] || { long: item.status, short: 'NS', elapsed: null };

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
      name: item.competition?.name || 'Desconhecida'
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

  // -----------------------------------------------------------
  // Rota de Health Check
  // -----------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Orla Bet Pro Analytics Backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // -----------------------------------------------------------
  // Rota de Jogos / Fixtures
  // -----------------------------------------------------------
  app.get('/api/football/fixtures', async (req: Request, res: Response) => {
    // CORREÇÃO 7: Log da rota
    console.log('[fixtures] rota chamada:', req.originalUrl);
    
    try {
      const dateStr = getQueryString(req.query.date) || new Date().toISOString().split('T')[0];
      const cacheKey = `fixtures_${dateStr}`;

      // Check cache
      const cached = fixturesCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < FOOTBALL_CACHE_TTL_MS) {
        return res.json({ matches: cached.data });
      }

      // CORREÇÃO 2: Token lido corretamente, sem variáveis RapidAPI
      const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
      let normalizedMatches: NormalizedMatch[] = [];

      if (token) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
          
          const apiResponse = await fetch(`${FOOTBALL_DATA_MATCHES_URL}?dateFrom=${dateStr}&dateTo=${dateStr}`, {
            // CORREÇÃO 3: Headers exatos solicitados
            headers: {
              'Accept': 'application/json',
              'X-Auth-Token': token
            },
            signal: controller.signal
          });
          clearTimeout(timeout);

          if (apiResponse.ok) {
            const providerData = await apiResponse.json();
            
            // CORREÇÃO 6: Logs temporários solicitados
            console.log(
              '[football-data] resposta do provedor:',
              {
                status: apiResponse.status,
                body: JSON.stringify(providerData).slice(0, 3000)
              }
            );

            const rawMatches = providerData.matches || [];
            
            console.log(
              '[football-data] partidas recebidas:',
              rawMatches.length
            );

            normalizedMatches = rawMatches
              .map(normalizeMatch)
              .filter(
                (match): match is NormalizedMatch => match !== null
              );

            console.log(
              '[football-data] partidas normalizadas:',
              normalizedMatches.length
            );
          }
        } catch (e) {
          console.warn('Football-Data.org request failed:', getErrorMessage(e));
        }
      } else {
        console.warn('FOOTBALL_DATA_TOKEN não configurado no ambiente.');
      }

      // CORREÇÃO 10: Não adicione partidas fictícias ou fallback com times inventados.
      // Se a API falhar ou não retornar dados, retornamos array vazio em vez de gerar dados falsos.

      // Save cache
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

      // Retorna array vazio para evitar dados fictícios (Regra 10)
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
      const { message, gamesSummary, selectedMatch, chatHistory, mode } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida ou não fornecida.' });
      }

      const ai = getGenAI();

      if (!ai) {
        return res.json({
          reply: `🤖 **Orla IA (Modo Analítico Inteligente)**\n\nAnalisei sua dúvida: "${sanitizeText(message, 100)}".\n\n` +
            `⚽ **Dica Estratégica:** Priorize entradas com +EV (Valor Esperado Positivo), respeitando a gestão de 1% a 2% de stake por bilhete.\n\n` +
            `💡 Dica: Configure sua chave GEMINI_API_KEY no painel de segredos para desbloquear raciocínio neural avançado com deep scouting!`
        });
      }

      const systemPrompt = `Você é o "Orla IA", o tipster e cientista de dados esportivo oficial da plataforma Orla Bet Pro Analytics.
Você é especializado em análise de futebol brasileiro e internacional (Brasileirão, Copa do Brasil, Libertadores, Champions League, Premier League, La Liga).
Seu tom é profissional, confiante, analítico, acolhedor e focado em alta assertividade e gestão de risco responsável.

Diretrizes:
1. Responda em Português do Brasil (PT-BR) de forma clara, estruturada e dinâmica.
2. Utilize formatação Markdown rica (listas com bullet points, negrito, emojis de futebol e estatísticas).
3. Quando perguntado sobre jogos específicos, analise: Favoritismo, expectativa de gols (xG), probabilidade de Ambas Marcam (BTTS), mercado de escanteios e sugestão de odd de valor.
4. Quando perguntado sobre bilhetes múltiplos ou combinações, monte uma sugestão de 2 a 3 seleções com justificativa matemática de risco equilibrado.
5. Sempre reforce a gestão de banca (1.5% a 2% de stake) e jogo responsável.
6. Nunca invente dados conflitantes com o contexto fornecido abaixo.

Contexto dos Jogos do Dia:
${gamesSummary || 'Nenhum jogo filtrado no momento.'}

Jogo Selecionado no Painel:
${selectedMatch ? JSON.stringify(selectedMatch, null, 2) : 'Nenhum'}

Histórico recente:
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

      const reply = response.text || 'Desculpe, não consegui processar a análise no momento. Tente novamente.';

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
  // Integração com Vite / Static Files
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
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});