import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for API-Sports football responses
const fixturesCache: Record<string, { timestamp: number; data: any }> = {};
const h2hCache: Record<string, { timestamp: number; data: any }> = {};
const CACHE_TTL_MS = 3 * 60 * 1000;

// Lazy initialization for Gemini AI SDK
let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Orla Bet — Pro Analytics & IA Geral',
    time: new Date().toISOString()
  });
});

// 1. Orla IA Universal Chat Endpoint (Gemini 3.7 Flash)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, gamesSummary, selectedMatch, chatHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    const ai = getGenAI();

    if (ai) {
      const systemInstruction = `Você é a "Orla IA Universal", o motor analítico e especialista sênior em apostas esportivas, futebol global e estatísticas da plataforma "Orla Bet".
Suas respostas devem ser em Português do Brasil (pt-BR), diretas, elegantes, bem formatadas em Markdown com tópicos claros, emojis moderados e foco em valor esperado (+EV), probabilidade estatística, xG (Expected Goals), escanteios, gols e gestão de banca (1% a 2% de stake).

Contexto dos confrontos carregados hoje no painel:
${gamesSummary || 'Confrontos das principais ligas (Brasileirão, Champions League, Premier League, Libertadores, etc.)'}

${selectedMatch ? `Partida selecionada pelo usuário: ${JSON.stringify(selectedMatch)}` : ''}

Diretrizes:
- Se o usuário perguntar sobre um time ou jogo específico do dia, utilize as probabilidades reais, expectativa de gols e sugira mercados inteligentes.
- Se pedir sugestões de bilhetes múltiplos, liste seleções de alto valor com odds calculadas e recomendação de gestão de banca.
- Mantenha sempre um tom profissional, analítico e motivador, lembrando sempre sobre responsabilidade e gestão de risco.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          ...(chatHistory?.map((h: any) => `${h.sender === 'user' ? 'Usuário' : 'Orla IA'}: ${h.text}`) || []),
          `Usuário: ${message}`
        ].join('\n\n'),
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const reply = response.text || '';
      return res.json({ reply });
    }

    // Return friendly flag if API key is not yet set
    return res.json({ reply: null });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    res.status(500).json({ error: 'Erro ao processar inteligência artificial', details: error.message });
  }
});

// 2. Football Fixtures Proxy
app.get('/api/football/fixtures', async (req, res) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const apiKey = process.env.API_SPORTS_KEY || '285a53545d71d0051c5041a63eac4140';
    const host = 'v3.football.api-sports.io';

    const now = Date.now();
    if (fixturesCache[dateStr] && (now - fixturesCache[dateStr].timestamp < CACHE_TTL_MS)) {
      return res.json(fixturesCache[dateStr].data);
    }

    const apiRes = await fetch(`https://${host}/fixtures?date=${dateStr}&timezone=America/Sao_Paulo`, {
      headers: {
        'x-apisports-key': apiKey,
        'x-rapidapi-host': host
      }
    });

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'Falha na resposta da API-Sports' });
    }

    const data = await apiRes.json();
    const matches = data.response || [];

    fixturesCache[dateStr] = { timestamp: now, data: matches };
    res.json(matches);
  } catch (error: any) {
    console.error('Error in /api/football/fixtures:', error);
    res.status(500).json({ error: 'Erro ao buscar jogos', details: error.message });
  }
});

// 3. Head to Head Proxy
app.get('/api/football/h2h', async (req, res) => {
  try {
    const home = req.query.home as string;
    const away = req.query.away as string;

    if (!home || !away) {
      return res.status(400).json({ error: 'Parâmetros home e away são obrigatórios' });
    }

    const cacheKey = `${home}-${away}`;
    const now = Date.now();
    if (h2hCache[cacheKey] && (now - h2hCache[cacheKey].timestamp < CACHE_TTL_MS)) {
      return res.json(h2hCache[cacheKey].data);
    }

    const apiKey = process.env.API_SPORTS_KEY || '285a53545d71d0051c5041a63eac4140';
    const host = 'v3.football.api-sports.io';

    const apiRes = await fetch(`https://${host}/fixtures/headtohead?h2h=${home}-${away}&last=6`, {
      headers: {
        'x-apisports-key': apiKey,
        'x-rapidapi-host': host
      }
    });

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'Falha na resposta H2H' });
    }

    const data = await apiRes.json();
    const matches = data.response || [];

    h2hCache[cacheKey] = { timestamp: now, data: matches };
    res.json(matches);
  } catch (error: any) {
    console.error('Error in /api/football/h2h:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico direto', details: error.message });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Orla Bet Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
