import { GameFixture, MatchProbabilities, H2HMatch } from '../types';

export const LEAGUE_LABELS: Record<string, string> = {
  'all': 'Todas as Ligas',
  '71': 'Brasileirão Série A',
  '73': 'Copa do Brasil',
  '13': 'Libertadores',
  '2': 'Champions League',
  '39': 'Premier League',
  '140': 'La Liga',
  '135': 'Serie A',
  '78': 'Bundesliga'
};

export function calculateProbabilities(
  fixtureId: number,
  homeId: number,
  awayId: number,
  h2h?: H2HMatch[]
): MatchProbabilities {
  // Algoritmo matemático determinístico para simulação de probabilidades
  const seed = (fixtureId * 17 + homeId * 31 + awayId * 13) % 10000;
  
  const homePower = ((homeId * 13) % 40) + 30;
  const awayPower = ((awayId * 17) % 40) + 25;
  const homeAdvantage = 8;

  let rawHome = homePower + homeAdvantage + (seed % 15 - 7);
  let rawAway = awayPower + ((seed >> 2) % 15 - 7);
  let rawDraw = 22 + (seed % 10);

  if (h2h && h2h.length > 0) {
    let h2hHomeWins = 0;
    let h2hAwayWins = 0;
    h2h.forEach(m => {
      if (m.goals.home !== null && m.goals.away !== null) {
        if (m.goals.home > m.goals.away) h2hHomeWins++;
        else if (m.goals.away > m.goals.home) h2hAwayWins++;
      }
    });
    rawHome += (h2hHomeWins * 3);
    rawAway += (h2hAwayWins * 3);
  }

  const total = rawHome + rawDraw + rawAway;
  const homeProb = Math.max(15, Math.min(75, Math.round((rawHome / total) * 100)));
  const awayProb = Math.max(12, Math.min(70, Math.round((rawAway / total) * 100)));
  const drawProb = Math.max(10, 100 - homeProb - awayProb);

  let favorite: 'home' | 'away' | 'draw' = 'draw';
  if (homeProb > awayProb && homeProb >= 40) {
    favorite = 'home';
  } else if (awayProb > homeProb && awayProb >= 38) {
    favorite = 'away';
  }

  const margin = 1.06;
  const oddHome = Number((Math.max(1.15, (100 / homeProb) * margin)).toFixed(2));
  const oddDraw = Number((Math.max(2.60, (100 / drawProb) * margin)).toFixed(2));
  const oddAway = Number((Math.max(1.20, (100 / awayProb) * margin)).toFixed(2));

  const expectedGoals = Number((1.8 + ((seed % 18) / 10)).toFixed(1));
  const over25Prob = Math.min(78, Math.max(30, Math.round((expectedGoals / 3.4) * 75 + (seed % 8))));
  const bttsProb = Math.min(76, Math.max(35, Math.round(52 + (seed % 20) - 10)));

  const oddOver25 = Number(((100 / over25Prob) * 1.05).toFixed(2));
  const oddUnder25 = Number(((100 / (100 - over25Prob)) * 1.05).toFixed(2));
  const oddBttsYes = Number(((100 / bttsProb) * 1.05).toFixed(2));

  let vipSuggestion = 'Ambas Marcam (Sim)';
  let confidenceScore = Math.max(homeProb, awayProb);

  if (homeProb >= 52) {
    vipSuggestion = 'Vitória Mandante (1)';
    confidenceScore = homeProb;
  } else if (awayProb >= 50) {
    vipSuggestion = 'Vitória Visitante (2)';
    confidenceScore = awayProb;
  } else if (over25Prob >= 60) {
    vipSuggestion = 'Mais de 1.5 Gols';
    confidenceScore = over25Prob;
  } else if (drawProb >= 33) {
    vipSuggestion = 'Dupla Chance (1X)';
    confidenceScore = homeProb + drawProb;
  } else {
    vipSuggestion = 'Menos de 3.5 Gols';
    confidenceScore = 78;
  }

  return {
    home: homeProb,
    draw: drawProb,
    away: awayProb,
    favorite,
    expectedGoals,
    expectedCorners: Math.round(7.5 + (seed % 6)),
    bttsProb,
    over25Prob,
    odds: {
      home: oddHome,
      draw: oddDraw,
      away: oddAway,
      over25: oddOver25,
      under25: oddUnder25,
      bttsYes: oddBttsYes
    },
    vipSuggestion,
    confidenceScore
  };
}

export async function fetchDailyGames(dateStr: string): Promise<GameFixture[]> {
  try {
    // Chama a rota do nosso próprio backend, que agora usa a API-Football
    const res = await fetch(`/api/football/fixtures?date=${encodeURIComponent(dateStr)}`);
    
    if (res.ok) {
      const data = await res.json();
      // O backend retorna { matches: [...] }
      if (data && Array.isArray(data.matches)) {
        return data.matches;
      }
    }
  } catch (err) {
    console.warn('Falha ao buscar jogos do backend:', err);
  }

  // Retorna array vazio em vez de dados fictícios
  return [];
}

export async function fetchHeadToHead(homeTeamId: number, awayTeamId: number): Promise<H2HMatch[]> {
  try {
    const res = await fetch(`/api/football/h2h?home=${homeTeamId}&away=${awayTeamId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.matches)) {
        return data.matches;
      }
    }
  } catch (err) {
    console.warn('Falha ao buscar H2H do backend:', err);
  }

  return [];
}