import express, {
  type Request,
  type Response,
  type NextFunction
} from 'express';

import path from 'path';
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
    };
    away: {
      id?: number;
      name: string;
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
// Aplicação
// -------------------------------------------------------------

const app = express();

app.disable('x-powered-by');

app.use(
  express.json({
    limit: '32kb'
  })
);

// -------------------------------------------------------------
// Configurações
// -------------------------------------------------------------

const PORT = Number.parseInt(
  process.env.PORT || '3000',
  10
);

const FOOTBALL_DATA_MATCHES_URL =
  'https://api.football-data.org/v4/matches';

const FOOTBALL_TIMEZONE =
  'America/Sao_Paulo';

const FOOTBALL_CACHE_TTL_MS =
  30 * 1000;

const PLAYERS_CACHE_TTL_MS =
  10 * 60 * 1000;

const REQUEST_TIMEOUT_MS =
  15 * 1000;

// -------------------------------------------------------------
// Cache
// -------------------------------------------------------------

const fixturesCache: Record<
  string,
  CacheEntry<NormalizedMatch[]>
> = {};

const playersCache: Record<
  string,
  CacheEntry<unknown>
> = {};

// -------------------------------------------------------------
// Cliente Gemini
// -------------------------------------------------------------

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (aiClient) {
    return aiClient;
  }

  const apiKey =
    process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'orlabet-ai-server'
        }
      }
    });

    return aiClient;
  } catch (error) {
    console.error(
      'Falha ao inicializar o Gemini:',
      getErrorMessage(error)
    );

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

function getQueryString(
  value: unknown
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const result = value.trim();

  return result || undefined;
}

function sanitizeText(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function setNoStore(res: Response): void {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );

  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function isValidDateString(
  value: string
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900 || year > 2100) {
    return false;
  }

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getBrazilDate(): string {
  const parts =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: FOOTBALL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === 'year'
  )?.value;

  const month = parts.find(
    (part) => part.type === 'month'
  )?.value;

  const day = parts.find(
    (part) => part.type === 'day'
  )?.value;

  if (!year || !month || !day) {
    throw new Error(
      'Não foi possível obter a data atual.'
    );
  }

  return `\({year}-\){month}-${day}`;
}

function getRequestedDate(
  req: Request
): string {
  const requestedDate =
    getQueryString(req.query.date);

  const date =
    requestedDate || getBrazilDate();

  if (!isValidDateString(date)) {
    throw new Error(
      'A data deve estar no formato AAAA-MM-DD.'
    );
  }

  return date;
}

function getFootballToken(): string {
  const token =
    process.env.FOOTBALL_DATA_TOKEN?.trim();

  if (!token) {
    throw new Error(
      'FOOTBALL_DATA_TOKEN não configurado.'
    );
  }

  return token;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<globalThis.Response> {
  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(
  response: globalThis.Response
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      'A API retornou uma resposta inválida.'
    );
  }
}

function getNumberOrNull(
  value: unknown
): number | null {
  return typeof value === 'number'
    && Number.isFinite(value)
    ? value
    : null;
}

function getString(
  value: unknown,
  fallback = ''
): string {
  return typeof value === 'string'
    ? value
    : fallback;
}

function mapStatus(
  statusValue: unknown
): {
  long: string;
  short: string;
} {
  const status =
    getString(statusValue)
      .trim()
      .toUpperCase();

  switch (status) {
    case 'SCHEDULED':
    case 'TIMED':
    case 'AGENDADA':
      return {
        long: 'Não iniciado',
        short: 'NS'
      };

    case 'LIVE':
    case 'IN_PLAY':
    case 'EM JOGO':
    case 'AO VIVO':
      return {
        long: 'Ao vivo',
        short: 'LIVE'
      };

    case 'PAUSED':
    case 'PAUSADA':
      return {
        long: 'Intervalo',
        short: 'HT'
      };

    case 'FINISHED':
    case 'FINALIZADA':
      return {
        long: 'Encerrado',
        short: 'FT'
      };

    case 'POSTPONED':
    case 'ADIADA':
      return {
        long: 'Adiado',
        short: 'PST'
      };

    case 'SUSPENDED':
    case 'SUSPENSA':
      return {
        long: 'Suspenso',
        short: 'SUSP'
      };

    case 'CANCELLED':
    case 'CANCELADA':
      return {
        long: 'Cancelado',
        short: 'CANC'
      };

    default:
      return {
        long: status || 'Status não informado',
        short: status || 'UNK'
      };
  }
}

function normalizeMatch(
  value: unknown
): NormalizedMatch | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const match =
    value as UnknownRecord;

  const homeTeam =
    match.homeTeam &&
    typeof match.homeTeam === 'object'
      ? match.homeTeam as UnknownRecord
      : {};

  const awayTeam =
    match.awayTeam &&
    typeof match.awayTeam === 'object'
      ? match.awayTeam as UnknownRecord
      : {};

  const competition =
    match.competition &&
    typeof match.competition === 'object'
      ? match.competition as UnknownRecord
      : {};

  const score =
    match.score &&
    typeof match.score === 'object'
      ? match.score as UnknownRecord
      : {};

  const fullTime =
    score.fullTime &&
    typeof score.fullTime === 'object'
      ? score.fullTime as UnknownRecord
      : {};

  const id =
    getNumberOrNull(match.id);

  const date =
    getString(match.utcDate);

  const homeName =
    getString(homeTeam.name);

  const awayName =
    getString(awayTeam.name);

  if (
    id === null ||
    !date ||
    !homeName ||
    !awayName
  ) {
    return null;
  }

  const mappedStatus =
    mapStatus(match.status);

  const minute =
    getNumberOrNull(match.minute);

  const timestamp =
    Date.parse(date);

  return {
    fixture: {
      id,
      date,
      timestamp: Number.isNaN(timestamp)
        ? null
        : timestamp,
      status: {
        long: mappedStatus.long,
        short: mappedStatus.short,
        elapsed: minute
      }
    },
    league: {
      id: getNumberOrNull(
        competition.id
      ) ?? undefined,
      name: getString(
        competition.name,
        'Competição não informada'
      )
    },
    teams: {
      home: {
        id: getNumberOrNull(
          homeTeam.id
        ) ?? undefined,
        name: homeName
      },
      away: {
        id: getNumberOrNull(
          awayTeam.id
        ) ?? undefined,
        name: awayName
      }
    },
    goals: {
      home: getNumberOrNull(
        fullTime.home
      ),
      away: getNumberOrNull(
        fullTime.away
      )
    },
    source: 'football-data.org',
    lastUpdatedAt: new Date().toISOString()
  };
}

function extractMatches(
  value: unknown
): unknown[] | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const data =
    value as UnknownRecord;

  return Array.isArray(data.matches)
    ? data.matches
    : null;
}

function sanitizeChatHistory(
  value: unknown
): Array<{
  sender: string;
  text: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-8)
    .map((item) => {
      if (
        !item ||
        typeof item !== 'object'
      ) {
        return null;
      }

      const record =
        item as UnknownRecord;

      const sender =
        sanitizeText(
          record.sender,
          30
        );

      const text =
        sanitizeText(
          record.text,
          3000
        );

      if (!text) {
        return null;
      }

      return {
        sender: sender === 'user'
          ? 'user'
          : 'assistant',
        text
      };
    })
    .filter(
      (
        item
      ): item is {
        sender: string;
        text: string;
      } => item !== null
    );
}

// -------------------------------------------------------------
// Health check
// -------------------------------------------------------------

app.get(
  '/api/health',
  (_req: Request, res: Response) => {
    const footballConfigured =
      Boolean(
        process.env.FOOTBALL_DATA_TOKEN?.trim()
      );

    const aiConfigured =
      Boolean(
        process.env.GEMINI_API_KEY?.trim() &&
        process.env.GEMINI_MODEL?.trim()
      );

    const healthy =
      footballConfigured &&
      aiConfigured;

    setNoStore(res);

    return res
      .status(healthy ? 200 : 503)
      .json({
        status: healthy
          ? 'ok'
          : 'degraded',
        appName:
          'Orla Bet — Pro Analytics & IA Geral',
        services: {
          footballData:
            footballConfigured,
          ai: aiConfigured
        },
        time: new Date().toISOString()
      });
  }
);

// -------------------------------------------------------------
// 1. Orla IA
// -------------------------------------------------------------

app.post(
  '/api/ai/chat',
  async (req: Request, res: Response) => {
    setNoStore(res);

    try {
      const body =
        req.body &&
        typeof req.body === 'object'
          ? req.body as UnknownRecord
          : {};

      const message =
        sanitizeText(
          body.message,
          4000
        );

      const gamesSummary =
        sanitizeText(
          body.gamesSummary,
          16000
        );

      const mode =
        body.mode === 'general'
          ? 'general'
          : 'tipster';

      const selectedMatch =
        body.selectedMatch &&
        typeof body.selectedMatch === 'object'
          ? body.selectedMatch
          : null;

      const chatHistory =
        sanitizeChatHistory(
          body.chatHistory
        );

      if (!message) {
        return res.status(400).json({
          error: 'Mensagem inválida.'
        });
      }

      if (
        !process.env.GEMINI_API_KEY?.trim()
      ) {
        return res.status(503).json({
          error:
            'A inteligência artificial não está configurada.'
        });
      }

      const model =
        process.env.GEMINI_MODEL?.trim();

      if (!model) {
        return res.status(503).json({
          error:
            'O modelo Gemini não está configurado.'
        });
      }

      const ai = getGenAI();

      if (!ai) {
        return res.status(503).json({
          error:
            'Não foi possível inicializar a IA.'
        });
      }

      const modeInstruction =
        mode === 'tipster'
          ? `
MODO: TIPSTER E VALOR ESPERADO

Use somente os dados recebidos.
Não trate estimativas como odds reais.
Não invente probabilidades, estatísticas ou placares.
Se a odd não estiver no contexto, informe que ela não foi fornecida.
Nunca prometa lucro, acerto ou segurança.
`
          : `
MODO: ANALISTA TÁTICO

Use somente os dados recebidos.
Não invente escalações, desfalques, histórico ou estatísticas.
Quando um dado não estiver disponível, informe isso claramente.
`;

      const systemInstruction = `
Você é a Orla IA, assistente de análise de futebol.

Responda em Português do Brasil.
Use Markdown simples e tópicos objetivos.
Use emojis com moderação.

${modeInstruction}

REGRAS:

- Use apenas os dados presentes no contexto.
- Não invente jogos, resultados, odds ou estatísticas.
- Não diga que um palpite é garantido.
- Não prometa lucro.
- Diferencie dados reais de estimativas.
- Informe dados ausentes.
- Apostas envolvem risco financeiro.
- Recomende gestão responsável de banca.
`;

      const context = `
CONFRONTOS RECEBIDOS:

${
  gamesSummary ||
  'Nenhum confronto foi fornecido.'
}

PARTIDA SELECIONADA:

${
  selectedMatch
    ? JSON.stringify(selectedMatch)
    : 'Nenhuma partida selecionada.'
}
`;

      const historyText =
        chatHistory
          .map((item) => {
            const speaker =
              item.sender === 'user'
                ? 'Usuário'
                : 'Orla IA';

            return `\({speaker}: \){item.text}`;
          })
          .join('\n\n');

      const contents = [
        historyText,
        context,
        `Usuário: ${message}`
      ]
        .filter(Boolean)
        .join('\n\n');

      const response =
        await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.65
          }
        });

      const reply =
        sanitizeText(
          response.text,
          12000
        );

      if (!reply) {
        console.error(
          'Gemini retornou resposta vazia.'
        );

        return res.status(502).json({
          error:
            'A IA não retornou uma análise.'
        });
      }

      return res.status(200).json({
        reply
      });
    } catch (error) {
      console.error(
        'Erro em /api/ai/chat:',
        getErrorMessage(error)
      );

      return res.status(502).json({
        error:
          'Não foi possível gerar a análise neste momento.'
      });
    }
  }
);

// -------------------------------------------------------------
// 2. Partidas por data
// -------------------------------------------------------------

app.get(
  '/api/football/fixtures',
  async (req: Request, res: Response) => {
    setNoStore(res);

    try {
      const date =
        getRequestedDate(req);

      const token =
        getFootballToken();

      const cacheKey =
        `football-data:${date}`;

      const now =
        Date.now();

      const cached =
        fixturesCache[cacheKey];

      if (
        cached &&
        now - cached.timestamp <
          FOOTBALL_CACHE_TTL_MS
      ) {
        return res.status(200).json(
          cached.data
        );
      }

      const apiUrl =
        new URL(
          FOOTBALL_DATA_MATCHES_URL
        );

      apiUrl.searchParams.set(
        'dateFrom',
        date
      );

      apiUrl.searchParams.set(
        'dateTo',
        date
      );

      let apiResponse:
        globalThis.Response;

      try {
        apiResponse =
          await fetchWithTimeout(
            apiUrl.toString(),
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'X-Auth-Token': token
              },
              cache: 'no-store'
            }
          );
      } catch (error) {
        console.error(
          'Falha de conexão com football-data.org:',
          getErrorMessage(error)
        );

        return res.status(502).json({
          error:
            'Não foi possível consultar os jogos.'
        });
      }

      const providerData =
        await readJson(apiResponse);

      if (!apiResponse.ok) {
        console.error(
          'football-data.org respondeu com erro:',
          {
            status: apiResponse.status,
            response: providerData
          }
        );

        return res.status(502).json({
          error:
            'O provedor de futebol recusou a consulta.'
        });
      }

      const rawMatches =
        extractMatches(providerData);

      if (!rawMatches) {
        console.error(
          'Formato inesperado na resposta da API:',
          providerData
        );

        return res.status(502).json({
          error:
            'A resposta da API está em formato inválido.'
        });
      }

      const normalizedMatches =
        rawMatches
          .map(normalizeMatch)
          .filter(
            (
              match
            ): match is NormalizedMatch =>
              match !== null
          );

      fixturesCache[cacheKey] = {
        timestamp: now,
        data: normalizedMatches
      };

      return res.status(200).json(
        normalizedMatches
      );
    } catch (error) {
      const message =
        getErrorMessage(error);

      if (
        message.includes(
          'AAAA-MM-DD'
        )
      ) {
        return res.status(400).json({
          error: message
        });
      }

      if (
        message.includes(
          'FOOTBALL_DATA_TOKEN'
        )
      ) {
        console.error(
          'Token da football-data.org ausente.'
        );

        return res.status(503).json({
          error:
            'A integração de futebol não está configurada.'
        });
      }

      console.error(
        'Erro em /api/football/fixtures:',
        message
      );

      return res.status(500).json({
        error:
          'Erro interno ao buscar partidas.'
      });
    }
  }
);

// -------------------------------------------------------------
// 3. H2H
// -------------------------------------------------------------

app.get(
  '/api/football/h2h',
  (_req: Request, res: Response) => {
    setNoStore(res);

    return res.status(501).json({
      error:
        'O H2H ainda precisa ser adaptado ao endpoint real da API.'
    });
  }
);

// -------------------------------------------------------------
// 4. Busca de jogadores
// -------------------------------------------------------------

app.get(
  '/api/football/players-search',
  (_req: Request, res: Response) => {
    setNoStore(res);

    return res.status(501).json({
      error:
        'A busca de jogadores ainda precisa ser adaptada a uma fonte compatível.'
    });
  }
);

// -------------------------------------------------------------
// Middleware de erro
// -------------------------------------------------------------

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      'Erro não tratado:',
      getErrorMessage(error)
    );

    setNoStore(res);

    return res.status(500).json({
      error:
        'Erro interno do servidor.'
    });
  }
);

// -------------------------------------------------------------
// Inicialização
// -------------------------------------------------------------

async function startServer(): Promise<void> {
  if (
    process.env.NODE_ENV !== 'production'
  ) {
    const { createServer } =
      await import('vite');

    const vite =
      await createServer({
        server: {
          middlewareMode: true
        },
        appType: 'spa'
      });

    app.use(vite.middlewares);
  } else {
    const distPath =
      path.join(
        process.cwd(),
        'dist'
      );

    const indexPath =
      path.join(
        distPath,
        'index.html'
      );

    app.use(
      express.static(distPath)
    );

    // Somente rotas que não são /api
    // devem cair no index.html.
    app.get(
      /^\/(?!api(?:\/|$)).*/,
      (_req: Request, res: Response) => {
        res.sendFile(indexPath);
      }
    );
  }

  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `⚡ Orla Bet Server iniciado na porta ${PORT}`
      );
    }
  );
}

if (
  process.env.VERCEL !== '1'
) {
  startServer().catch((error) => {
    console.error(
      'Falha ao iniciar o servidor:',
      getErrorMessage(error)
    );

    process.exit(1);
  });
}

export {
  app
};

export default app;
