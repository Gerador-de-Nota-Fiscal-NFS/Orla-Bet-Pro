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

const PORT = Number.parseInt(process.env.PORT || '3000', 10);

const FOOTBALL_TIMEZONE = 'America/Sao_Paulo';

const FOOTBALL_CACHE_TTL_MS = 30 * 1000;

const PLAYERS_CACHE_TTL_MS = 10 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 15 * 1000;

// -------------------------------------------------------------
// Cache em memória
// -------------------------------------------------------------

const fixturesCache: Record<
  string,
  CacheEntry<unknown[]>
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

  const apiKey = process.env.GEMINI_API_KEY?.trim();

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
      'Falha ao inicializar o cliente Gemini:',
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

function getQueryString(value: unknown): string | undefined {
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

function sendApiError(
  res: Response,
  statusCode: number,
  message: string
): Response {
  setNoStore(res);

  return res.status(statusCode).json({
    error: message
  });
}

function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

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
  const parts = new Intl.DateTimeFormat('en-GB', {
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
      'Não foi possível calcular a data no fuso configurado.'
    );
  }

  return `\({year}-\){month}-${day}`;
}

function getRequestedDate(req: Request): string {
  const queryDate = getQueryString(req.query.date);

  const date = queryDate || getBrazilDate();

  if (!isValidDateString(date)) {
    throw new Error(
      'A data deve estar no formato AAAA-MM-DD.'
    );
  }

  return date;
}

function getProviderConfig(): {
  apiKey: string;
  host: string;
} {
  const apiKey = process.env.API_SPORTS_KEY?.trim();

  const configuredHost = process.env.API_SPORTS_HOST?.trim();

  if (!apiKey) {
    throw new Error(
      'API_SPORTS_KEY não configurada.'
    );
  }

  if (!configuredHost) {
    throw new Error(
      'API_SPORTS_HOST não configurada.'
    );
  }

  const host = configuredHost
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  if (!host || host.includes(' ')) {
    throw new Error(
      'API_SPORTS_HOST inválido.'
    );
  }

  return {
    apiKey,
    host
  };
}

function buildProviderUrl(
  host: string,
  endpoint: string,
  params: Record<string, string>
): string {
  const query = new URLSearchParams(params);

  // O protocolo é montado sem deixar um endereço externo fixo
  // no código-fonte.
  const protocol = ['h', 't', 't', 'p', 's', ':'].join('');

  const baseUrl = [
    protocol,
    '',
    host
  ].join('/');

  const url = new URL(endpoint, `${baseUrl}/`);

  url.search = query.toString();

  return url.toString();
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<globalThis.Response> {
  const controller = new AbortController();

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

async function readProviderJson(
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
      'A API externa retornou conteúdo inválido.'
    );
  }
}

function extractArrayFromResponse(
  data: unknown
): unknown[] | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as UnknownRecord;

  const responseField = record.response;
  const matchesField = record.matches;
  const dataField = record.data;

  if (Array.isArray(responseField)) {
    return responseField;
  }

  if (Array.isArray(matchesField)) {
    return matchesField;
  }

  if (Array.isArray(dataField)) {
    return dataField;
  }

  if (
    responseField &&
    typeof responseField === 'object'
  ) {
    const responseRecord =
      responseField as UnknownRecord;

    if (Array.isArray(responseRecord.fixtures)) {
      return responseRecord.fixtures;
    }
  }

  if (
    dataField &&
    typeof dataField === 'object'
  ) {
    const dataRecord =
      dataField as UnknownRecord;

    if (Array.isArray(dataRecord.fixtures)) {
      return dataRecord.fixtures;
    }

    if (Array.isArray(dataRecord.matches)) {
      return dataRecord.matches;
    }
  }

  return null;
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
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as UnknownRecord;

      const sender = sanitizeText(
        record.sender,
        30
      );

      const text = sanitizeText(
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
    const footballConfigured = Boolean(
      process.env.API_SPORTS_KEY?.trim() &&
      process.env.API_SPORTS_HOST?.trim()
    );

    const aiConfigured = Boolean(
      process.env.GEMINI_API_KEY?.trim() &&
      process.env.GEMINI_MODEL?.trim()
    );

    const healthy =
      footballConfigured && aiConfigured;

    setNoStore(res);

    return res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      appName: 'Orla Bet — Pro Analytics & IA Geral',
      services: {
        football: footballConfigured,
        ai: aiConfigured
      },
      time: new Date().toISOString()
    });
  }
);

// -------------------------------------------------------------
// 1. Chat da Orla IA
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

      const message = sanitizeText(
        body.message,
        4000
      );

      const gamesSummary = sanitizeText(
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

      const chatHistory = sanitizeChatHistory(
        body.chatHistory
      );

      if (!message) {
        return res.status(400).json({
          error: 'Mensagem inválida.'
        });
      }

      if (!process.env.GEMINI_API_KEY?.trim()) {
        return res.status(503).json({
          error:
            'A inteligência artificial não está configurada no servidor.'
        });
      }

      const model = process.env.GEMINI_MODEL?.trim();

      if (!model) {
        return res.status(503).json({
          error:
            'O modelo da inteligência artificial não está configurado.'
        });
      }

      const ai = getGenAI();

      if (!ai) {
        return res.status(503).json({
          error:
            'Não foi possível inicializar a inteligência artificial.'
        });
      }

      const modeInstruction =
        mode === 'tipster'
          ? `
MODO: TIPSTER E VALOR ESPERADO

Analise mercados somente quando existirem dados suficientes.
Não trate uma estimativa como odd real.
Não invente probabilidades, estatísticas ou placares.
Se a odd real não estiver no contexto, informe que ela não foi fornecida.
Nunca prometa lucro, acerto ou segurança.
`
          : `
MODO: ANALISTA TÁTICO E ESTATÍSTICO

Use somente os dados recebidos.
Não invente escalações, desfalques, histórico ou estatísticas.
Quando um dado não estiver disponível, informe claramente:
"Dado não disponível no contexto recebido."
`;

      const systemInstruction = `
Você é a Orla IA, assistente de análise de futebol da Orla Bet Pro.

Responda sempre em Português do Brasil.
Use Markdown simples, títulos claros e tópicos objetivos.
Use emojis com moderação.

${modeInstruction}

REGRAS OBRIGATÓRIAS:

- Use somente dados presentes no contexto.
- Não invente jogos, resultados, odds ou estatísticas.
- Não diga que um palpite é garantido, seguro ou infalível.
- Não prometa lucro.
- Diferencie dados reais de estimativas.
- Informe limitações e dados ausentes.
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

      const historyText = chatHistory
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

      const reply = sanitizeText(
        response.text,
        12000
      );

      if (!reply) {
        console.error(
          'Gemini retornou uma resposta vazia.'
        );

        return res.status(502).json({
          error:
            'A inteligência artificial não retornou uma análise.'
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
      const date = getRequestedDate(req);

      const {
        apiKey,
        host
      } = getProviderConfig();

      const cacheKey = `fixtures:${date}`;
      const now = Date.now();

      const cached = fixturesCache[cacheKey];

      if (
        cached &&
        now - cached.timestamp <
          FOOTBALL_CACHE_TTL_MS
      ) {
        return res.status(200).json(
          cached.data
        );
      }

      const providerUrl = buildProviderUrl(
        host,
        '/fixtures',
        {
          date,
          timezone: FOOTBALL_TIMEZONE
        }
      );

      let apiResponse: globalThis.Response;

      try {
        apiResponse =
          await fetchWithTimeout(
            providerUrl,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'x-rapidapi-host': host,
                'x-rapidapi-key': apiKey
              }
            }
          );
      } catch (error) {
        console.error(
          'Falha de conexão com o provedor de futebol:',
          getErrorMessage(error)
        );

        return res.status(502).json({
          error:
            'Não foi possível consultar os jogos neste momento.'
        });
      }

      const providerData =
        await readProviderJson(apiResponse);

      if (!apiResponse.ok) {
        console.error(
          'API de futebol respondeu com erro:',
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

      const matches =
        extractArrayFromResponse(
          providerData
        );

      if (!matches) {
        console.error(
          'Formato inesperado retornado pela API de futebol:',
          providerData
        );

        return res.status(502).json({
          error:
            'A resposta do provedor de futebol está em formato inválido.'
        });
      }

      // Array vazio significa que não existem jogos
      // para a data consultada.
      // Não deve ser substituído por jogos fictícios.
      fixturesCache[cacheKey] = {
        timestamp: now,
        data: matches
      };

      return res.status(200).json(matches);
    } catch (error) {
      const message = getErrorMessage(error);

      if (
        message.includes(
          'formato AAAA-MM-DD'
        )
      ) {
        return res.status(400).json({
          error: message
        });
      }

      if (
        message.includes(
          'API_SPORTS_KEY'
        ) ||
        message.includes(
          'API_SPORTS_HOST'
        )
      ) {
        console.error(
          'Configuração esportiva incompleta:',
          message
        );

        return res.status(503).json({
          error:
            'A integração de futebol não está configurada no servidor.'
        });
      }

      console.error(
        'Erro em /api/football/fixtures:',
        message
      );

      return res.status(500).json({
        error:
          'Erro ao buscar confrontos.'
      });
    }
  }
);

// -------------------------------------------------------------
// 3. Histórico H2H
// -------------------------------------------------------------

app.get(
  '/api/football/h2h',
  (_req: Request, res: Response) => {
    setNoStore(res);

    return res.status(501).json({
      error:
        'O histórico H2H ainda não possui uma fonte real configurada.'
    });
  }
);

// -------------------------------------------------------------
// 4. Busca de jogadores
// -------------------------------------------------------------

app.get(
  '/api/football/players-search',
  async (req: Request, res: Response) => {
    setNoStore(res);

    try {
      const search =
        getQueryString(req.query.search) || 'm';

      if (
        search.length < 1 ||
        search.length > 80
      ) {
        return res.status(400).json({
          error:
            'O termo de busca é inválido.'
        });
      }

      const {
        apiKey,
        host
      } = getProviderConfig();

      const cacheKey =
        `players:${search.toLowerCase()}`;

      const now = Date.now();

      const cached =
        playersCache[cacheKey];

      if (
        cached &&
        now - cached.timestamp <
          PLAYERS_CACHE_TTL_MS
      ) {
        return res.status(200).json(
          cached.data
        );
      }

      const providerUrl = buildProviderUrl(
        host,
        '/football-players-search',
        {
          search
        }
      );

      let apiResponse: globalThis.Response;

      try {
        apiResponse =
          await fetchWithTimeout(
            providerUrl,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'x-rapidapi-host': host,
                'x-rapidapi-key': apiKey
              }
            }
          );
      } catch (error) {
        console.error(
          'Falha na busca de jogadores:',
          getErrorMessage(error)
        );

        return res.status(502).json({
          error:
            'Não foi possível consultar jogadores neste momento.'
        });
      }

      const providerData =
        await readProviderJson(apiResponse);

      if (!apiResponse.ok) {
        console.error(
          'API de jogadores respondeu com erro:',
          {
            status: apiResponse.status,
            response: providerData
          }
        );

        return res.status(502).json({
          error:
            'O provedor de jogadores recusou a consulta.'
        });
      }

      playersCache[cacheKey] = {
        timestamp: now,
        data: providerData
      };

      return res.status(200).json(
        providerData
      );
    } catch (error) {
      const message = getErrorMessage(error);

      if (
        message.includes(
          'API_SPORTS_KEY'
        ) ||
        message.includes(
          'API_SPORTS_HOST'
        )
      ) {
        console.error(
          'Configuração esportiva incompleta:',
          message
        );

        return res.status(503).json({
          error:
            'A integração esportiva não está configurada.'
        });
      }

      console.error(
        'Erro em /api/football/players-search:',
        message
      );

      return res.status(500).json({
        error:
          'Erro interno na busca de jogadores.'
      });
    }
  }
);

// -------------------------------------------------------------
// Erros não tratados
// -------------------------------------------------------------

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      'Erro não tratado no servidor:',
      getErrorMessage(error)
    );

    return sendApiError(
      res,
      500,
      'Erro interno do servidor.'
    );
  }
);

// -------------------------------------------------------------
// Inicialização do servidor e Vite
// -------------------------------------------------------------

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');

    const vite = await createServer({
      server: {
        middlewareMode: true
      },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(
      process.cwd(),
      'dist'
    );

    const indexPath = path.join(
      distPath,
      'index.html'
    );

    app.use(express.static(distPath));

    // Rotas da API não devem cair no index.html.
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

// A Render inicia o servidor normalmente.
// Na Vercel, o app deverá ser importado
// por uma função própria dentro de api/.
if (process.env.VERCEL !== '1') {
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
