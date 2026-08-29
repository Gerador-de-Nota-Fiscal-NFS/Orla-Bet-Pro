import { MascotData } from '../../types';

export function getMascotData(teamName: string): MascotData {
  const name = (teamName || 'Futebol').trim();
  
  // Gera uma sigla limpa de até 3 letras maiúsculas direto do nome
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  const emoji = (cleanName.substring(0, 3) || 'FUT').toUpperCase();

  // Cores dinâmicas baseadas no nome para manter identidade visual bonita
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  const primaryColor = `hsl(${hue}, 70%, 45%)`;
  const secondaryColor = `hsl(${(hue + 40) % 360}, 65%, 25%)`;
  
  const bg = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;

  return {
    emoji,
    nickname: `Clube ${name.split(' ')[0]}`,
    bg,
    primaryColor,
    secondaryColor
  };
}
