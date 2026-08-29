import { MascotData } from '../../types';

export const MASCOT_MAP: Record<string, MascotData> = {
  'flamengo': { 
    emoji: 'FLA', 
    nickname: 'Urubu Rei',
    bg: 'linear-gradient(135deg, #dc2626 0%, #000000 100%)',
    primaryColor: '#dc2626',
    secondaryColor: '#000000'
  },
  'palmeiras': { 
    emoji: 'PAL', 
    nickname: 'Porco / Periquito',
    bg: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
    primaryColor: '#059669',
    secondaryColor: '#ffffff'
  },
  'sao paulo': { 
    emoji: 'SAO', 
    nickname: 'Santo Paulo',
    bg: 'linear-gradient(135deg, #dc2626 0%, #1e293b 50%, #ffffff 100%)',
    primaryColor: '#dc2626',
    secondaryColor: '#1e293b'
  },
  'corinthians': { 
    emoji: 'COR', 
    nickname: 'Mosqueteiro / Gavião',
    bg: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
    primaryColor: '#0f172a',
    secondaryColor: '#ffffff'
  },
  'santos': { 
    emoji: 'SAN', 
    nickname: 'Baleia Alvinegra',
    bg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff'
  },
  'gremio': { 
    emoji: 'GRE', 
    nickname: 'Mosqueteiro Tricolor',
    bg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 50%, #000000 100%)',
    primaryColor: '#0ea5e9',
    secondaryColor: '#000000'
  },
  'internacional': { 
    emoji: 'INT', 
    nickname: 'Saci Colorado',
    bg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff'
  },
  'atletico-mg': { 
    emoji: 'CAM', 
    nickname: 'Galo Doido',
    bg: 'linear-gradient(135deg, #1e293b 0%, #000000 100%)',
    primaryColor: '#1e293b',
    secondaryColor: '#ffffff'
  },
  'cruzeiro': { 
    emoji: 'CRU', 
    nickname: 'Raposa Celeste',
    bg: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff'
  },
  'botafogo': { 
    emoji: 'BOT', 
    nickname: 'Estrela Solitária',
    bg: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    primaryColor: '#0f172a',
    secondaryColor: '#ffffff'
  },
  'fluminense': { 
    emoji: 'FLU', 
    nickname: 'Guerreiro Tricolor',
    bg: 'linear-gradient(135deg, #059669 0%, #991b1b 100%)',
    primaryColor: '#059669',
    secondaryColor: '#991b1b'
  },
  'vasco': { 
    emoji: 'VAS', 
    nickname: 'Almirante',
    bg: 'linear-gradient(135deg, #1e293b 0%, #000000 100%)',
    primaryColor: '#000000',
    secondaryColor: '#dc2626'
  },
  'bahia': { 
    emoji: 'BAH', 
    nickname: 'Esquadrão',
    bg: 'linear-gradient(135deg, #2563eb 0%, #ef4444 100%)',
    primaryColor: '#2563eb',
    secondaryColor: '#ef4444'
  },
  'fortaleza': { 
    emoji: 'FOR', 
    nickname: 'Leão do Pici',
    bg: 'linear-gradient(135deg, #2563eb 0%, #dc2626 100%)',
    primaryColor: '#2563eb',
    secondaryColor: '#dc2626'
  },
  'real madrid': { 
    emoji: 'RMA', 
    nickname: 'Reis da Europa',
    bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    primaryColor: '#3b82f6',
    secondaryColor: '#f59e0b'
  },
  'barcelona': { 
    emoji: 'BAR', 
    nickname: 'Culés Blaugrana',
    bg: 'linear-gradient(135deg, #1d4ed8 0%, #b91c1c 100%)',
    primaryColor: '#1d4ed8',
    secondaryColor: '#b91c1c'
  }
};

const FALLBACK_POOL = ['FUT', 'BOL', 'GOL', 'CLUB', 'TEAM', 'PRO'];
const GRADIENT_PALETTES = [
  { bg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', primary: '#06b6d4', secondary: '#3b82f6' },
  { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', primary: '#10b981', secondary: '#059669' },
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', primary: '#8b5cf6', secondary: '#6d28d9' }
];

export function getMascotData(teamName: string): MascotData {
  if (!teamName) {
    return {
      emoji: 'FUT',
      nickname: 'Clube',
      bg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      primaryColor: '#06b6d4',
      secondaryColor: '#3b82f6'
    };
  }

  const normalized = teamName.toLowerCase().trim();

  for (const key of Object.keys(MASCOT_MAP)) {
    if (normalized.includes(key)) {
      return MASCOT_MAP[key];
    }
  }

  let charSum = 0;
  for (let i = 0; i < teamName.length; i++) {
    charSum += teamName.charCodeAt(i) * (i + 1);
  }

  const emoji = teamName.substring(0, 3).toUpperCase();
  const palette = GRADIENT_PALETTES[charSum % GRADIENT_PALETTES.length];

  return {
    emoji,
    nickname: `Mascote ${teamName.split(' ')[0]}`,
    bg: palette.bg,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary
  };
}