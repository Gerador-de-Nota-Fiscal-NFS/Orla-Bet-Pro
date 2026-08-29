export interface GameFixture {
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      short: string;
      long: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

export function generateRichFallbackFixtures(dateStr: string): GameFixture[] {
  const cleanDate = (dateStr || '2026-08-29').split('T')[0];
  const seed = parseInt(cleanDate.replace(/-/g, ''), 10) || 20260829;
  
  const poolTeams = [
    { id: 127, name: 'Flamengo', logo: 'https://media.api-sports.io/football/teams/127.png' },
    { id: 121, name: 'Palmeiras', logo: 'https://media.api-sports.io/football/teams/121.png' },
    { id: 126, name: 'São Paulo', logo: 'https://media.api-sports.io/football/teams/126.png' },
    { id: 120, name: 'Botafogo', logo: 'https://media.api-sports.io/football/teams/120.png' },
    { id: 131, name: 'Corinthians', logo: 'https://media.api-sports.io/football/teams/131.png' },
    { id: 133, name: 'Vasco da Gama', logo: 'https://media.api-sports.io/football/teams/133.png' },
    { id: 119, name: 'Cruzeiro', logo: 'https://media.api-sports.io/football/teams/119.png' },
    { id: 130, name: 'Grêmio', logo: 'https://media.api-sports.io/football/teams/130.png' },
    { id: 541, name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' },
    { id: 529, name: 'Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' },
    { id: 50, name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' },
    { id: 40, name: 'Liverpool', logo: 'https://media.api-sports.io/football/teams/40.png' }
  ];

  const leaguesPool = [
    { id: 71, name: 'Brasileirão Série A', country: 'Brazil', logo: 'https://media.api-sports.io/football/leagues/71.png', season: 2026 },
    { id: 39, name: 'Premier League', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png', season: 2026 },
    { id: 2, name: 'Champions League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/2.png', season: 2026 }
  ];

  const fixtures: GameFixture[] = [];
  
  for (let i = 0; i < 6; i++) {
    const homeIdx = (seed + i * 3) % poolTeams.length;
    let awayIdx = (seed + i * 7 + 1) % poolTeams.length;
    if (homeIdx === awayIdx) awayIdx = (awayIdx + 1) % poolTeams.length;

    const league = leaguesPool[(seed + i) % leaguesPool.length];
    const hour = 16 + (i % 5);
    const timeStr = `${String(hour).padStart(2, '0')}:00`;

    fixtures.push({
      fixture: {
        id: 70000 + (seed % 10000) + i,
        timezone: 'America/Sao_Paulo',
        date: `${cleanDate}T${timeStr}:00-03:00`,
        timestamp: Math.floor(new Date(`${cleanDate}T${timeStr}:00-03:00`).getTime() / 1000),
        status: { short: 'NS', long: 'Not Started' }
      },
      league,
      teams: {
        home: poolTeams[homeIdx],
        away: poolTeams[awayIdx]
      },
      goals: { home: null, away: null }
    });
  }

  return fixtures;
}