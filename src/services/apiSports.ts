import type {
  GameFixture,
  MatchProbabilities,
  H2HMatch
} from '../types';

// -------------------------------------------------------------
// Labels utilizados pela interface
// -------------------------------------------------------------

export const LEAGUE_LABELS: Record<
  string,
  string
> = {
  all: 'Todas as Ligas',
  '73': 'Copa do Brasil',
  '128': 'Camp. Argentino',
  '71': 'Brasileirão Série A',
  '72': 'Brasileirão Série B',
  '13': 'Libertadores',
  '11': 'Sul-Americana',
  '2': 'Champions League',
  '3': 'Europa League',
  '39': 'Premier League',
  '140': 'La Liga',
  '135': 'Serie A',
  '78': 'Bundesliga',
  '61': 'Ligue 1',
  '475': 'Paulistão',
  '476': 'Camp. Carioca',
  '477': 'Camp. Gaúcho',
  '478': 'Camp. Mineiro',
  '480': 'Copa do Nordeste',
  '253': 'MLS',
  '307': 'Saudi Pro League'
};

// -------------------------------------------------------------
// Constantes
// -------------------------------------------------------------

const FIXTURES_API_PATH =
  '/api/football/fixtures';

const H2H_API_PATH =
  '/api/football/h2h';

const REQUEST_TIMEOUT_MS =
  15000;

const LIVE_STATUS_CODES = new Set([
  'LIVE',
  'IN_PLAY',
  'PAUSED',
  '1H',
  '2H',
  'HT',
  'ET',
  'P',
  'AO VIVO',
  'EM JOGO',
  'PAUSADA'
]);

type UnknownRecord = Record<string, unknown>;

// -------------------------------------------------------------
// Utilitários de tipo
// -------------------------------------------------------------

function isRecord(
  value: unknown
): value is UnknownRecord {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown,
  fallback = ''
): string {
  return typeof value === 'string'
    ? value.trim()
    : fallback;
}

function getNumber(
  value: unknown
): number | undefined {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === 'string' &&
    value.trim() !== ''
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  return undefined;
}

function getNullableNumber(
  value: unknown
): number | null {
  const number =
    getNumber(value);

  return number === undefined
    ? null
    : number;
}

function getErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'AbortError'
  ) {
    return 'A consulta demorou demais e foi cancelada.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro desconhecido ao consultar os dados.';
}

// -------------------------------------------------------------
// Validação da data
// -------------------------------------------------------------

function isValidDate(
  value: string
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// -------------------------------------------------------------
// Requisição com timeout
// -------------------------------------------------------------

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const controller =
    new AbortController();

  const timeout =
    globalThis.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

// -------------------------------------------------------------
// Status
// -------------------------------------------------------------

function normalizeStatus(
  fixture: UnknownRecord,
  rawMatch: UnknownRecord
): {
  long: string;
  short: string;
  elapsed: number | null;
} {
  const fixtureStatus =
    isRecord(fixture.status)
      ? fixture.status
      : null;

  const rawStatus =
    fixtureStatus
      ? getString(
          fixtureStatus.short
        )
      : getString(
          rawMatch.status
        );

  const normalizedStatus =
    rawStatus.toUpperCase();

  let long =
    getString(
      fixtureStatus?.long
    );

  let short =
    getString(
      fixtureStatus?.short
    );

  if (!long || !short) {
    switch (normalizedStatus) {
      case 'SCHEDULED':
      case 'TIMED':
      case 'AGENDADA':
        long = 'Não iniciado';
        short = 'NS';
        break;

      case 'LIVE':
      case 'IN_PLAY':
      case 'AO VIVO':
      case 'EM JOGO':
        long = 'Ao vivo';
        short = 'LIVE';
        break;

      case 'PAUSED':
      case 'PAUSADA':
      case 'INTERVALO':
        long = 'Intervalo';
        short = 'HT';
        break;

      case 'FINISHED':
      case 'FINALIZADA':
      case 'ENCERRADA':
        long = 'Encerrado';
        short = 'FT';
        break;

      case 'POSTPONED':
      case 'ADIADA':
        long = 'Adiado';
        short = 'PST';
        break;

      case 'SUSPENDED':
      case 'SUSPENSA':
        long = 'Suspenso';
        short = 'SUSP';
        break;

      case 'CANCELLED':
      case 'CANCELED':
      case 'CANCELADA':
        long = 'Cancelado';
        short = 'CANC';
        break;

      default:
        long =
          long ||
          rawStatus ||
          'Status não informado';

        short =
          short ||
          rawStatus ||
          'UNK';
    }
  }

  const elapsed =
    fixtureStatus
      ? getNullableNumber(
          fixtureStatus.elapsed
        )
      : getNullableNumber(
          rawMatch.minute
        );

  return {
    long,
    short,
    elapsed
  };
}

// -------------------------------------------------------------
// Times
// -------------------------------------------------------------

function getTeams(
  match: UnknownRecord
): {
  home: UnknownRecord;
  away: UnknownRecord;
} {
  if (isRecord(match.teams)) {
    return {
      home: isRecord(match.teams.home)
        ? match.teams.home
        : {},

      away: isRecord(match.teams.away)
        ? match.teams.away
        : {}
    };
  }

  return {
    home: isRecord(match.homeTeam)
      ? match.homeTeam
      : {},

    away: isRecord(match.awayTeam)
      ? match.awayTeam
      : {}
  };
}

// -------------------------------------------------------------
// Liga ou competição
// -------------------------------------------------------------

function getCompetition(
  match: UnknownRecord
): UnknownRecord {
  if (isRecord(match.league)) {
    return match.league;
  }

  if (isRecord(match.competition)) {
    return match.competition;
  }

  return {};
}

// -------------------------------------------------------------
// Placar
// -------------------------------------------------------------

function getGoals(
  match: UnknownRecord
): {
  home: number | null;
  away: number | null;
} {
  if (isRecord(match.goals)) {
    return {
      home: getNullableNumber(
        match.goals.home
      ),
      away: getNullableNumber(
        match.goals.away
      )
    };
  }

  const score =
    isRecord(match.score)
      ? match.score
      : {};

  const fullTime =
    isRecord(score.fullTime)
      ? score.fullTime
      : {};

  return {
    home: getNullableNumber(
      fullTime.home
    ),
    away: getNullableNumber(
      fullTime.away
    )
  };
}

// -------------------------------------------------------------
// Normalização dos jogos
// -------------------------------------------------------------

function normalizeMatch(
  value: unknown
): GameFixture | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawMatch =
    value;

  const fixture =
    isRecord(rawMatch.fixture)
      ? rawMatch.fixture
      : rawMatch;

  const teams =
    getTeams(rawMatch);

  const homeTeam =
    teams.home;

  const awayTeam =
    teams.away;

  const competition =
    getCompetition(rawMatch);

  const fixtureId =
    getNumber(
      fixture.id ??
      rawMatch.id
    );

  const matchDate =
    getString(
      fixture.date ??
      rawMatch.utcDate ??
      rawMatch.date
    );

  const homeName =
    getString(
      homeTeam.name
    );

  const awayName =
    getString(
      awayTeam.name
    );

  if (
    fixtureId === undefined ||
    !matchDate ||
    !homeName ||
    !awayName
  ) {
    return null;
  }

  const parsedTimestamp =
    Date.parse(matchDate);

  const timestamp =
    Number.isNaN(parsedTimestamp)
      ? null
      : Math.floor(
          parsedTimestamp / 1000
        );

  const status =
    normalizeStatus(
      fixture,
      rawMatch
    );

  const competitionId =
    getNumber(
      competition.id
    );

  const homeId =
    getNumber(
      homeTeam.id
    );

  const awayId =
    getNumber(
      awayTeam.id
    );

  const goals =
    getGoals(rawMatch);

  const normalized = {
    fixture: {
      id: fixtureId,
      date: matchDate,
      timestamp,
      timezone:
        getString(
          fixture.timezone,
          'America/Sao_Paulo'
        ),
      status
    },

    league: {
      id: competitionId,
      name:
        getString(
          competition.name,
          'Competição não informada'
        )
    },

    teams: {
      home: {
        id: homeId,
        name: homeName,
        logo:
          getString(
            homeTeam.logo
          )
      },

      away: {
        id: awayId,
        name: awayName,
        logo:
          getString(
            awayTeam.logo
          )
      }
    },

    goals,

    source:
      'football-data.org',

    lastUpdatedAt:
      new Date().toISOString()
  };

  return normalized as unknown as GameFixture;
}

// -------------------------------------------------------------
// Extração da lista de partidas
// -------------------------------------------------------------

function extractMatches(
  payload: unknown
): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.matches)) {
    return payload.matches;
  }

  if (Array.isArray(payload.response)) {
    return payload.response;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

// -------------------------------------------------------------
// Busca de partidas reais
// -------------------------------------------------------------

export async function fetchDailyGames(
  dateStr: string
): Promise<GameFixture[]> {
  if (!isValidDate(dateStr)) {
    throw new Error(
      'A data deve estar no formato AAAA-MM-DD.'
    );
  }

  const query =
    new URLSearchParams({
      date: dateStr,
      refresh: String(Date.now())
    });

  const response =
    await fetchWithTimeout(
      `\({FIXTURES_API_PATH}?\){query.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store'
      }
    );

  let payload: unknown;

  try {
    payload =
      await response.json();
  } catch {
    throw new Error(
      'O servidor retornou uma resposta inválida.'
    );
  }

  if (!response.ok) {
    const message =
      isRecord(payload)
        ? getString(payload.error)
        : '';

    throw new Error(
      message ||
      'Não foi possível carregar os jogos.'
    );
  }

  const rawMatches =
    extractMatches(payload);

  // Lista vazia é uma resposta válida.
  // Não chamar fallback e não criar jogos.
  if (rawMatches.length === 0) {
    return [];
  }

  const games =
    rawMatches
      .map(normalizeMatch)
      .filter(
        (
          game
        ): game is GameFixture =>
          game !== null
      );

  return games;
}

// -------------------------------------------------------------
// H2H
// -------------------------------------------------------------

export async function fetchHeadToHead(
  homeTeamId: number,
  awayTeamId: number
): Promise<H2HMatch[]> {
  if (
    !Number.isFinite(homeTeamId) ||
    !Number.isFinite(awayTeamId)
  ) {
    return [];
  }

  const query =
    new URLSearchParams({
      home: String(homeTeamId),
      away: String(awayTeamId),
      refresh: String(Date.now())
    });

  try {
    const response =
      await fetchWithTimeout(
        `\({H2H_API_PATH}?\){query.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          },
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      console.warn(
        'H2H não disponível:',
        response.status
      );

      return [];
    }

    const payload =
      await response.json();

    const rawMatches =
      extractMatches(payload);

    return rawMatches
      .map(normalizeMatch)
      .filter(
        (
          match
        ): match is GameFixture =>
          match !== null
      ) as H2HMatch[];
  } catch (error) {
    console.warn(
      'Falha ao consultar H2H:',
      getErrorMessage(error)
    );

    // Não retornar H2H inventado.
    return [];
  }
}

// -------------------------------------------------------------
// Status ao vivo
// -------------------------------------------------------------

export function isGameLive(
  game: GameFixture
): boolean {
  const status =
    game.fixture?.status?.short
      ?.toUpperCase() || '';

  return LIVE_STATUS_CODES.has(
    status
  );
}

// -------------------------------------------------------------
// Compatibilidade temporária
// -------------------------------------------------------------

/**
 * Função legada.
 *
 * Esta função ainda é mantida temporariamente para evitar
 * quebra imediata de componentes antigos que a importam.
 *
 * Ela NÃO utiliza dados reais e não deve ser usada para
 * exibir odds, probabilidades ou estatísticas na produção.
 *
 * O próximo arquivo a corrigir é GameCard.tsx, onde essa
 * função deverá ser removida e substituída por dados reais
 * recebidos do backend.
 */
export function calculateProbabilities(
  fixtureId: number,
  homeId: number,
  awayId: number,
  h2h: H2HMatch[] = []
): MatchProbabilities {
  const seed =
    Math.abs(
      fixtureId * 17 +
      homeId * 31 +
      awayId * 13
    ) % 10000;

  let home =
    40 + (seed % 16);

  let away =
    30 + ((seed >> 2) % 16);

  if (h2h.length > 0) {
    const homeWins =
      h2h.filter(
        (match) =>
          (match.goals?.home ?? 0) >
          (match.goals?.away ?? 0)
      ).length;

    const awayWins =
      h2h.filter(
        (match) =>
          (match.goals?.away ?? 0) >
          (match.goals?.home ?? 0)
      ).length;

    home += homeWins * 2;
    away += awayWins * 2;
  }

  const total =
    home + away + 25;

  const homeProb =
    Math.round(
      (home / total) * 100
    );

  const awayProb =
    Math.round(
      (away / total) * 100
    );

  const drawProb =
    Math.max(
      1,
      100 - homeProb - awayProb
    );

  const favorite =
    homeProb > awayProb
      ? 'home'
      : awayProb > homeProb
        ? 'away'
        : 'draw';

  return {
    home: homeProb,
    draw: drawProb,
    away: awayProb,
    favorite,
    expectedGoals: 0,
    expectedCorners: 0,
    bttsProb: 0,
    over25Prob: 0,
    odds: {
      home: 0,
      draw: 0,
      away: 0,
      over25: 0,
      under25: 0,
      bttsYes: 0
    },
    vipSuggestion:
      'Análise real ainda não disponível',
    confidenceScore: 0
  } as MatchProbabilities;
}
