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

function getErrorMessage(
  error: unknown
): string {
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

  const result =
    value.trim();

  return result || undefined;
}

function sanitizeText(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()