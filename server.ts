// 2. Rota de Partidas / Jogos (Garante dados dinâmicos baseados na data selecionada)
app.get('/api/football/fixtures', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dateStr = (req.query.date as string) || today;

    const cacheKey = `fixtures-${dateStr}`;
    const now = Date.now();
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL_MS)) {
      return res.json(cache[cacheKey].data);
    }

    // Semente numérica baseada na data escolhida para gerar jogos diferentes a cada dia
    const seed = parseInt(dateStr.replace(/-/g, ''), 10) || 20260829;

    const poolTeams = [
      { name: 'Flamengo', league: 'Brasileirão Série A' },
      { name: 'Palmeiras', league: 'Brasileirão Série A' },
      { name: 'São Paulo', league: 'Brasileirão Série A' },
      { name: 'Corinthians', league: 'Brasileirão Série A' },
      { name: 'Real Madrid', league: 'UEFA Champions League' },
      { name: 'Barcelona', league: 'UEFA Champions League' },
      { name: 'Manchester City', league: 'Premier League' },
      { name: 'Arsenal', league: 'Premier League' },
      { name: 'Liverpool', league: 'Premier League' },
      { name: 'River Plate', league: 'Copa Libertadores' },
      { name: 'Boca Juniors', league: 'Copa Libertadores' },
      { name: 'Grêmio', league: 'Brasileirão Série A' }
    ];

    const matches = [];
    for (let i = 0; i < 5; i++) {
      const homeIdx = (seed + i) % poolTeams.length;
      let awayIdx = (seed + i * 3 + 1) % poolTeams.length;
      if (homeIdx === awayIdx) awayIdx = (awayIdx + 1) % poolTeams.length;

      const home = poolTeams[homeIdx];
      const away = poolTeams[awayIdx];
      const hours = String(15 + (i * 2) % 7).padStart(2, '0');

      matches.push({
        id: 300 + i,
        league: home.league,
        homeTeam: home.name,
        awayTeam: away.name,
        time: `${hours}:00`,
        date: dateStr,
        odds: { 
          home: Number((1.8 + (i * 0.1)).toFixed(2)), 
          draw: 3.40, 
          away: Number((2.5 + (i * 0.15)).toFixed(2)) 
        },
        status: 'PRÉ-JOGO',
        score: '0 - 0',
        stats: { xGHome: 1.5, xGAway: 1.2, possessionHome: '50%', possessionAway: '50%' }
      });
    }

    cache[cacheKey] = { timestamp: now, data: matches };
    res.json(matches);
  } catch (error: any) {
    console.error('Erro em /api/football/fixtures:', error);
    res.status(500).json({ error: 'Erro ao buscar confrontos', details: error.message });
  }
});