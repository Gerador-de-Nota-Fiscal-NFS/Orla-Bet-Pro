export function generateRichFallbackFixtures(dateStr: string): GameFixture[] {
  // Semente numérica baseada na data escolhida (ex: 20260829) para modular os confrontos diariamente
  const seed = parseInt(dateStr.replace(/-/g, ''), 10) || 20260829;
  
  const poolTeams = [
    { id: 127, name: 'Flamengo', logo: 'https://media.api-sports.io/football/teams/127.png' },
    { id: 121, name: 'Palmeiras', logo: 'https://media.api-sports.io/football/teams/121.png' },
    { id: 126, name: 'São Paulo', logo: 'https://media.api-sports.io/football/teams/126.png' },
    { id: 120, name: 'Botafogo', logo: 'https://media.api-sports.io/football/teams/120.png' },
    { id: 131, name: 'Corinthians', logo: 'https://media.api-sports.io/football/teams/131.png' },
    { id: 133, name: 'Vasco', logo: 'https://media.api-sports.io/football/teams/133.png' },
    { id: 119, name: 'Cruzeiro', logo: 'https://media.api-sports.io/football/teams/119.png' },
    { id: 130, name: 'Grêmio', logo: 'https://media.api-sports.io/football/teams/130.png' },
    { id: 541, name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' },
    { id: 529, name: 'Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' },
    { id: 50, name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' },
    { id: 40, name: 'Liverpool', logo: 'https://media.api-sports.io/football/teams/40.png' },
    { id: 451, name: 'Boca Juniors', logo: 'https://media.api-sports.io/football/teams/451.png' },
    { id: 435, name: 'River Plate', logo: 'https://media.api-sports.io/football/teams/435.png' }
  ];

  const leaguesPool = [
    { id: 71, name: 'Brasileirão Série A', country: 'Brazil', logo: 'https://media.api-sports.io/football/leagues/71.png', season: 2026 },
    { id: 39, name: 'Premier League', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png', season: 2026 },
    { id: 2, name: 'Champions League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/2.png', season: 2026 },
    { id: 128, name: 'Camp. Argentino', country: 'Argentina', logo: 'https://media.api-sports.io/football/leagues/128.png', season: 2026 },
    { id: 13, name: 'Copa Libertadores', country: 'South America', logo: 'https://media.api-sports.io/football/leagues/13.png', season: 2026 }
  ];

  const matchTemplates = [];
  for (let i = 0; i < 8; i++) {
    const homeIdx = (seed + i * 2) % poolTeams.length;
    let awayIdx = (seed + i * 5 + 3) % poolTeams.length;
    if (homeIdx === awayIdx) awayIdx = (awayIdx + 1) % poolTeams.length;

    const league = leaguesPool[(seed + i) % leaguesPool.length];
    const hourNum = 15 + (i % 7);
    const timeStr = `${String(hourNum).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;

    matchTemplates.push({
      id: 5000 + (seed % 1000) + i,
      league,
      home: poolTeams[homeIdx],
      away: poolTeams[awayIdx],
      time: timeStr,
      status: { short: 'NS', long: 'Not Started' },
      goals: { home: null, away: null }
    });
  }

  return matchTemplates.map(t => ({
    fixture: {
      id: t.id,
      timezone: 'America/Sao_Paulo',
      date: `${dateStr}T${t.time}:00-03:00`,
      timestamp: new Date(`${dateStr}T${t.time}:00-03:00`).getTime() / 1000,
      status: t.status
    },
    league: t.league,
    teams: {
      home: t.home,
      away: t.away
    },
    goals: t.goals
  }));
}