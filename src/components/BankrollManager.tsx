import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Target, Plus, Minus, X, Award, AlertTriangle } from 'lucide-react';

interface BetRecord {
  id: string;
  type: 'conservador' | 'equilibrado' | 'ousado';
  stake: number;
  odd: number;
  result: 'green' | 'red' | 'pending';
  profit: number;
  description: string;
  date: string;
}

interface BankrollManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const STORAGE_KEY = 'zapbet_bankroll_data';

interface BankrollData {
  initial: number;
  current: number;
  bets: BetRecord[];
}

export const BankrollManager: React.FC<BankrollManagerProps> = ({ isOpen, onClose, onShowToast }) => {
  const [data, setData] = useState<BankrollData>({ initial: 0, current: 0, bets: [] });
  const [newStake, setNewStake] = useState('');
  const [newOdd, setNewOdd] = useState('');
  const [newType, setNewType] = useState<'conservador' | 'equilibrado' | 'ousado'>('equilibrado');
  const [newResult, setNewResult] = useState<'green' | 'red'>('green');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  };

  const saveData = (newData: BankrollData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  const handleSetInitial = (value: number) => {
    const newData = { ...data, initial: value, current: value };
    saveData(newData);
    onShowToast(`Banca inicial definida: R$ ${value.toFixed(2)}`, 'success');
  };

  const handleAddBet = () => {
    const stake = parseFloat(newStake);
    const odd = parseFloat(newOdd);
    if (!stake || !odd || stake <= 0 || odd <= 1) {
      onShowToast('Valores inválidos', 'error');
      return;
    }
    if (stake > data.current) {
      onShowToast('Stake maior que a banca atual!', 'error');
      return;
    }

    const profit = newResult === 'green' ? stake * (odd - 1) : -stake;
    const bet: BetRecord = {
      id: `bet-${Date.now()}`,
      type: newType,
      stake,
      odd,
      result: newResult,
      profit,
      description: newDesc || `Bilhete ${newType}`,
      date: new Date().toISOString()
    };

    const newData = {
      ...data,
      current: data.current + profit,
      bets: [bet, ...data.bets]
    };
    saveData(newData);
    setNewStake(''); setNewOdd(''); setNewDesc(''); setShowForm(false);
    onShowToast(newResult === 'green' ? '🟢 GREEN registrado!' : '🔴 Red registrado', newResult === 'green' ? 'success' : 'error');
  };

  const profit = data.current - data.initial;
  const profitPercent = data.initial > 0 ? (profit / data.initial) * 100 : 0;
  const totalBets = data.bets.length;
  const greens = data.bets.filter(b => b.result === 'green').length;
  const hitRate = totalBets > 0 ? (greens / totalBets) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-800/50 rounded-3xl w-full max-w-4xl shadow-2xl my-4">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-cyan-900/30 to-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Gestão de Banca</h2>
              <p className="text-[10px] text-cyan-300 uppercase tracking-wider">Controle profissional de lucros e perdas</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">✕</button>
        </div>

        <div className="p-5 space-y-5">
          
          {/* Setup inicial */}
          {data.initial === 0 && (
            <div className="bg-cyan-950/30 border border-cyan-700/50 rounded-2xl p-4">
              <h3 className="text-sm font-black text-cyan-300 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" /> Defina sua Banca Inicial
              </h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Ex: 100.00"
                  onChange={(e) => handleSetInitial(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[50, 100, 200, 500, 1000].map(v => (
                  <button key={v} onClick={() => handleSetInitial(v)} className="flex-1 bg-slate-800 hover:bg-cyan-700 text-white text-xs font-bold py-1.5 rounded-lg transition">
                    R$ {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KPIs */}
          {data.initial > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Banca Atual</div>
                  <div className="text-xl font-black text-white mt-1">R$ {data.current.toFixed(2)}</div>
                </div>
                <div className={`bg-slate-800/50 border rounded-xl p-3 ${profit >= 0 ? 'border-emerald-700' : 'border-red-700'}`}>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Lucro/Prejuízo</div>
                  <div className={`text-xl font-black mt-1 flex items-center gap-1 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    R$ {profit.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-bold ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Taxa de Acerto</div>
                  <div className="text-xl font-black text-cyan-400 mt-1">{hitRate.toFixed(0)}%</div>
                  <div className="text-[10px] text-slate-500">{greens}/{totalBets} greens</div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total de Bilhetes</div>
                  <div className="text-xl font-black text-purple-400 mt-1">{totalBets}</div>
                </div>
              </div>

              {/* Gráfico de Evolução */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-4">
                <h3 className="text-xs font-black text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> Evolução da Banca
                </h3>
                {data.bets.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Nenhum bilhete registrado ainda. Adicione seu primeiro bilhete abaixo.
                  </div>
                ) : (
                  <EvolutionChart data={data} />
                )}
              </div>

              {/* Botão Adicionar Bilhete */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black py-2.5 rounded-xl text-xs uppercase transition flex items-center justify-center gap-2"
                >
                  {showForm ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showForm ? 'Fechar Formulário' : 'Registrar Bilhete'}
                </button>
                <button
                  onClick={() => { if (confirm('Resetar toda a banca?')) { saveData({ initial: 0, current: 0, bets: [] }); onShowToast('Banca resetada', 'info'); } }}
                  className="bg-red-900/50 hover:bg-red-900 text-red-300 px-4 rounded-xl text-xs font-bold transition"
                >
                  Resetar
                </button>
              </div>

              {/* Formulário */}
              {showForm && (
                <div className="bg-slate-950/50 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Stake (R$)</label>
                      <input type="number" value={newStake} onChange={e => setNewStake(e.target.value)} placeholder="50.00" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Odd Total</label>
                      <input type="number" step="0.01" value={newOdd} onChange={e => setNewOdd(e.target.value)} placeholder="2.50" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tipo</label>
                      <select value={newType} onChange={e => setNewType(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                        <option value="conservador">🛡️ Conservador</option>
                        <option value="equilibrado">⚖️ Equilibrado</option>
                        <option value="ousado"> Ousado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Resultado</label>
                      <select value={newResult} onChange={e => setNewResult(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                        <option value="green">🟢 Green</option>
                        <option value="red"> Red</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Descrição (opcional)</label>
                    <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Bilhete de 3 jogos - Flamengo, Palmeiras..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  </div>
                  <button onClick={handleAddBet} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs uppercase transition">
                    Registrar Bilhete
                  </button>
                </div>
              )}

              {/* Histórico */}
              {data.bets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-white">Histórico de Bilhetes</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {data.bets.slice(0, 10).map(bet => (
                      <div key={bet.id} className={`bg-slate-800/50 border rounded-xl p-3 flex items-center justify-between ${bet.result === 'green' ? 'border-emerald-700' : 'border-red-700'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bet.result === 'green' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                            {bet.result === 'green' ? <Award className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{bet.description}</div>
                            <div className="text-[10px] text-slate-400">
                              {bet.type.toUpperCase()} • Odd {bet.odd} • {new Date(bet.date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-black ${bet.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {bet.profit >= 0 ? '+' : ''}R$ {bet.profit.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Gráfico SVG simples de evolução
const EvolutionChart: React.FC<{ data: BankrollData }> = ({ data }) => {
  const points = [data.initial];
  let running = data.initial;
  [...data.bets].reverse().forEach(b => {
    running += b.profit;
    points.push(running);
  });

  const max = Math.max(...points);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 40;

  const pathData = points.map((p, i) => {
    const x = (i / (points.length - 1 || 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const isPositive = points[points.length - 1] >= data.initial;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.4" />
            <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathData} L ${width} ${height} L 0 ${height} Z`} fill="url(#chartGrad)" />
        <path d={pathData} fill="none" stroke={isPositive ? '#10b981' : '#ef4444'} strokeWidth="0.5" />
        {points.map((p, i) => {
          const x = (i / (points.length - 1 || 1)) * width;
          const y = height - ((p - min) / range) * height;
          return <circle key={i} cx={x} cy={y} r="0.8" fill={isPositive ? '#10b981' : '#ef4444'} />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>Início: R$ {data.initial.toFixed(2)}</span>
        <span>Atual: R$ {points[points.length - 1].toFixed(2)}</span>
      </div>
    </div>
  );
};
