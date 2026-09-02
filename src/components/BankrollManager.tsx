import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';

interface BetRecord {
  id: string;
  type: string;
  stake: number;
  odd: number;
  result: 'green' | 'red';
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
  const [newType, setNewType] = useState('equilibrado');
  const [newResult, setNewResult] = useState<'green' | 'red'>('green');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setData(JSON.parse(raw));
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      }
    }
  }, [isOpen]);

  const saveData = (newData: BankrollData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  const handleSetInitial = (value: number) => {
    if (value > 0) {
      saveData({ ...data, initial: value, current: value });
      onShowToast(`Banca inicial: R$ ${value.toFixed(2)}`, 'success');
    }
  };

  const handleAddBet = () => {
    const stake = parseFloat(newStake);
    const odd = parseFloat(newOdd);
    
    if (!stake || !odd || stake <= 0 || odd <= 1) {
      onShowToast('Valores inválidos', 'error');
      return;
    }
    
    if (stake > data.current) {
      onShowToast('Stake maior que a banca!', 'error');
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

    saveData({
      ...data,
      current: data.current + profit,
      bets: [bet, ...data.bets]
    });
    
    setNewStake('');
    setNewOdd('');
    setNewDesc('');
    setShowForm(false);
    onShowToast(newResult === 'green' ? 'GREEN registrado!' : 'Red registrado', newResult === 'green' ? 'success' : 'error');
  };

  const profit = data.current - data.initial;
  const profitPercent = data.initial > 0 ? (profit / data.initial) * 100 : 0;
  const totalBets = data.bets.length;
  const greens = data.bets.filter(b => b.result === 'green').length;
  const hitRate = totalBets > 0 ? (greens / totalBets) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-800 rounded-2xl w-full max-w-3xl shadow-2xl my-4">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-cyan-900/30 to-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gestão de Banca</h2>
              <p className="text-xs text-cyan-300">Controle de lucros e perdas</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Setup inicial */}
          {data.initial === 0 && (
            <div className="bg-cyan-950/30 border border-cyan-700 rounded-xl p-4">
              <h3 className="text-sm font-bold text-cyan-300 mb-2">Defina sua Banca Inicial</h3>
              <input
                type="number"
                placeholder="Ex: 100.00"
                onChange={(e) => handleSetInitial(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 mb-2"
              />
              <div className="flex gap-2">
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
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-bold">Banca Atual</div>
                  <div className="text-xl font-bold text-white mt-1">R$ {data.current.toFixed(2)}</div>
                </div>
                <div className={`bg-slate-800 border rounded-xl p-3 ${profit >= 0 ? 'border-emerald-700' : 'border-red-700'}`}>
                  <div className="text-xs text-slate-400 font-bold">Lucro/Prejuízo</div>
                  <div className={`text-xl font-bold mt-1 flex items-center gap-1 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    R$ {profit.toFixed(2)}
                  </div>
                  <div className={`text-xs font-bold ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-bold">Taxa de Acerto</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">{hitRate.toFixed(0)}%</div>
                  <div className="text-xs text-slate-500">{greens}/{totalBets} greens</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-bold">Total Bilhetes</div>
                  <div className="text-xl font-bold text-purple-400 mt-1">{totalBets}</div>
                </div>
              </div>

              {/* Gráfico Simples */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> Evolução da Banca
                </h3>
                {data.bets.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Nenhum bilhete registrado ainda.
                  </div>
                ) : (
                  <SimpleChart data={data} />
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase transition flex items-center justify-center gap-2"
                >
                  {showForm ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showForm ? 'Fechar' : 'Registrar Bilhete'}
                </button>
                <button
                  onClick={() => { 
                    if (confirm('Resetar toda a banca?')) { 
                      saveData({ initial: 0, current: 0, bets: [] }); 
                      onShowToast('Banca resetada', 'info'); 
                    } 
                  }}
                  className="bg-red-900/50 hover:bg-red-900 text-red-300 px-4 rounded-xl text-xs font-bold transition"
                >
                  Resetar
                </button>
              </div>

              {/* Formulário */}
              {showForm && (
                <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Stake (R$)</label>
                      <input type="number" value={newStake} onChange={e => setNewStake(e.target.value)} placeholder="50.00" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Odd Total</label>
                      <input type="number" step="0.01" value={newOdd} onChange={e => setNewOdd(e.target.value)} placeholder="2.50" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Tipo</label>
                      <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                        <option value="conservador">Conservador</option>
                        <option value="equilibrado">Equilibrado</option>
                        <option value="ousado">Ousado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Resultado</label>
                      <select value={newResult} onChange={e => setNewResult(e.target.value as 'green' | 'red')} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
                        <option value="green">Green</option>
                        <option value="red">Red</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Descrição (opcional)</label>
                    <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Bilhete de 3 jogos" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  </div>
                  <button onClick={handleAddBet} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase transition">
                    Registrar Bilhete
                  </button>
                </div>
              )}

              {/* Histórico */}
              {data.bets.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white">Histórico (últimos 10)</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {data.bets.slice(0, 10).map(bet => (
                      <div key={bet.id} className={`bg-slate-800 border rounded-xl p-3 flex items-center justify-between ${bet.result === 'green' ? 'border-emerald-700' : 'border-red-700'}`}>
                        <div>
                          <div className="text-xs font-bold text-white">{bet.description}</div>
                          <div className="text-xs text-slate-400">
                            {bet.type.toUpperCase()} • Odd {bet.odd} • {new Date(bet.date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${bet.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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

// Gráfico simples
const SimpleChart: React.FC<{ data: BankrollData }> = ({ data }) => {
  const points = [data.initial];
  let running = data.initial;
  [...data.bets].reverse().forEach(b => {
    running += b.profit;
    points.push(running);
  });

  const max = Math.max(...points);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const isPositive = points[points.length - 1] >= data.initial;

  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-32">
        {points.map((p, i) => {
          const height = ((p - min) / range) * 100;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t ${isPositive ? 'bg-emerald-500' : 'bg-red-500'} opacity-70 hover:opacity-100 transition`}
              style={{ height: `${height}%` }}
              title={`R$ ${p.toFixed(2)}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>Início: R$ {data.initial.toFixed(2)}</span>
        <span>Atual: R$ {points[points.length - 1].toFixed(2)}</span>
      </div>
    </div>
  );
};
