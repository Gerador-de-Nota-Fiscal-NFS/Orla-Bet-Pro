export type MatchStatus = 'TBD' | 'NS' | '1H' | 'HT' | '2H' | 'ET' | 'P' | 'FT' | 'AET' | 'PEN' | 'SUSP' | 'INT' | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO' | 'LIVE';

export interface TeamInfo {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

export interface GoalsInfo {
  home: number | null;
  away: number | null;
}

export interface FixtureInfo {
  id: number;
  referee?: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods?: {
    first?: number | null;
    second?: number | null;
  };
  venue?: {
    id?: number | null;
    name?: string | null;
    city?: string | null;
  };
  status: {
    long: string;
    short: string;
    elapsed?: number | null;
  };
}

export interface LeagueInfo {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag?: string | null;
  season: number;
  round?: string;
}

export interface GameFixture {
  fixture: FixtureInfo;
  league: LeagueInfo;
  teams: {
    home: TeamInfo;
    away: TeamInfo;
  };
  goals: GoalsInfo;
  score?: {
    halftime?: GoalsInfo;
    fulltime?: GoalsInfo;
    extratime?: GoalsInfo;
    penalty?: GoalsInfo;
  };
}

export interface MascotData {
  emoji: string;
  bg: string;
  nickname: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface MatchProbabilities {
  home: number;
  draw: number;
  away: number;
  favorite: 'home' | 'away' | 'draw';
  expectedGoals: number;
  expectedCorners: number;
  bttsProb: number; // Both Teams To Score %
  over25Prob: number;
  odds: {
    home: number;
    draw: number;
    away: number;
    over25: number;
    under25: number;
    bttsYes: number;
  };
  vipSuggestion: string;
  confidenceScore: number;
}

export interface H2HMatch {
  fixture: FixtureInfo;
  league: LeagueInfo;
  teams: {
    home: TeamInfo;
    away: TeamInfo;
  };
  goals: GoalsInfo;
}

export type UserStatus = 'ativo' | 'bloqueado' | 'teste' | 'teste_expirado';

export interface Subscriber {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: UserStatus;
  plan: string;
  monthlyValue: number;
  phone?: string;
  createdAt: string;
  lastLogin?: string;
  trialStartedAt?: string;
  trialEndsAt?: string; // ISO date timestamp
  isTrial?: boolean;
}

export interface BetSelection {
  fixtureId: number;
  matchName: string;
  leagueName: string;
  marketName: string;
  selection: string;
  odd: number;
  prob: number;
  homeTeam: string;
  awayTeam: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  matchContext?: {
    fixtureId?: number;
    matchName?: string;
    suggestion?: string;
    odd?: number;
  };
}
