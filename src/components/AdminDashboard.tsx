import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, XCircle, DollarSign, Search, RefreshCw, 
  UserPlus, Trash2, Shield, Download, Timer, Clock, Check, 
  PlusCircle, MessageCircle, Ban
} from 'lucide-react';
import { Subscriber, UserStatus } from '../types';
import { 
  fetchAllSubscribers, subscribeToSubscribers, updateSubscriberStatus, 
  removeSubscriber, registerSubscriber, approveSubscriberAccess,
  activateSubscriberPayment, blockSubscriberNoPayment, extendSubscriberTrial,
  SUBSCRIPTION_PLANS, getRemainingTrialHours, ADMIN_WHATSAPP_DISPLAY, 
  getClientWhatsAppDirectLink
} from '../services/firebase';

interface AdminDashboardProps {
  onBackToApp: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToApp, onShowToast }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'teste' | 'teste_expirado' | 'bloqueado'>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState<UserStatus>('teste');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSubscribers();
      setSubscribers(data);
    } catch (err: any) {
      onShowToast('Erro ao sincronizar assinantes: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSubscribers((data) => {
      setSubscribers(data);
      setLoading(false);
    });
    return () => { unsubscribe(); };
  }, []);

  const totalUsers = subscribers.length;
  const activeUsers = subscribers.filter(s => s.status === 'ativo').length;
  const trialUsers = subscribers.filter(s => s.status === 'teste').length;
  const expiredTrialUsers = subscribers.filter(s => s.status === 'teste_expirado').length;
  const blockedUsers = subscribers.filter(s => s.status === 'bloqueado').length;
  const totalRevenue = subscribers.filter(s => s.status === 'ativo').reduce((acc, curr) => acc + (curr.monthlyValue || 9.90), 0);

  const handleActivateAccount = async (sub: Subscriber) => {
    const planObj = SUBSCRIPTION_PLANS[0];
    try {
      await activateSubscriberPayment(sub.uid, planObj.name, planObj.price);
      setSubscribers(prev => prev.map(s => s.uid === sub.uid ? { ...s, status: 'ativo', plan: planObj.name, monthlyValue: planObj.price, isTrial: false, trialEndsAt: undefined } : s));
      onShowToast(`Conta de "${sub.name}" ATIVADA com sucesso!`, 'success');
    } catch (e: any) {
      onShowToast('Erro ao ativar conta: ' + e.message, 'error');
    }
  };

  const handleBlockAccount = async (sub: Subscriber) => {
    try {
      await blockSubscriberNoPayment(sub.uid);
      setSubscribers(prev => prev.map(s => s.uid === sub.uid ? { ...s, status: 'bloqueado', isTrial: false } : s));
      onShowToast(`Conta de "${sub.name}" BLOQUEADA.`, 'error');
    } catch (e: any) {
      onShowToast('Falha ao bloquear conta: ' + e.message, 'error');
    }
  };

  const handleExtendTrial = async (sub: Subscriber) => {
    try {
      await extendSubscriberTrial(sub.uid, 24); // Estende 24 horas
      const data = await fetchAllSubscribers();
      setSubscribers(data);
      onShowToast(`+24 horas de teste concedidas para "${sub.name}"!`, 'success');
    } catch (e: any) {
      onShowToast('Erro ao estender teste: ' + e.message, 'error');
    }
  };

  const handleDeleteSubscriber = async (uid: string, name: string) => {
    if (window.confirm(`Remover o assinante "${name}" do banco de dados?`)) {
      try {
        await removeSubscriber(uid);
        setSubscribers(prev => prev.filter(s => s.uid !== uid));
        onShowToast('Assinante removido com sucesso.', 'info');
      } catch (e: any) {
        onShowToast('Erro ao remover: ' + e.message, 'error');
      }
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) {
      onShowToast('Preencha nome e e-mail.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const planObj = SUBSCRIPTION_PLANS[0];
      const added = await registerSubscriber(newEmail, '123456', newName, newPhone);
      if (newStatus === 'ativo') {
        await activateSubscriberPayment(added.uid, planObj.name, planObj.price);
        added.status = 'ativo'; added.isTrial = false;
      } else if (newStatus === 'bloqueado') {
        await blockSubscriberNoPayment(added.uid);
        added.status = 'bloqueado';
      }
      setSubscribers(prev => [added, ...prev.filter(s => s.uid !== added.uid)]);
      onShowToast(`Assinante "${newName}" adicionado!`, 'success');
      setShowAddModal(false);
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewStatus('teste');
    } catch (err: any) {
      onShowToast('Erro ao adicionar: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ['UID,Nome,Email,Telefone,Status,Plano,ValorMensal,CriadoEm'];
    const rows = subscribers.map(s => `"${s.uid}","${s.name}","${s.email}","${s.phone || ''}","${s.status}","${s.plan}","${s.monthlyValue}","${s.createdAt}"`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `zapbet_ia_assinantes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Relatório CSV exportado!', 'success');
  };

  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="adminDashboard" className="max-w-7xl mx-auto px-4 py-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-slate-900 p-6 rounded-3xl border border-cyan-900/30 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[9px] font-black bg-cyan-900/50 text-cyan-300 border border-cyan-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Painel Master Admin</span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-900/30 border border-emerald-700 px-2 py-0.5 rounded-md">WhatsApp: {ADMIN_WHATSAPP_DISPLAY}</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            <span>Gestão de Assinantes ZAP BET IA</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={onBackToApp} className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition">Voltar ao App</button>
          <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Assinante</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-bold uppercase">Total Contas</span><Users className="w-4 h-4 text-slate-400" /></div>
          <p className="text-2xl font-black text-white mt-2">{totalUsers}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-emerald-900/50 border-l-4 border-l-emerald-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-bold uppercase">Assinaturas Ativas</span><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{activeUsers}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-cyan-900/50 border-l-4 border-l-cyan-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-bold uppercase">Em Teste (24h)</span><Timer className="w-4 h-4 text-cyan-500" /></div>
          <p className="text-2xl font-black text-cyan-400 mt-2">{trialUsers}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-amber-900/50 border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-bold uppercase">Testes Expirados</span><Clock className="w-4 h-4 text-amber-500" /></div>
          <p className="text-2xl font-black text-amber-400 mt-2">{expiredTrialUsers}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-red-900/50 border-l-4 border-l-red-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-[10px] text-slate-400 font-bold uppercase">Bloqueados</span><Ban className="w-4 h-4 text-red-500" /></div>
          <p className="text-2xl font-black text-red-400 mt-2">{blockedUsers}</p>
        </div>
      </div>

      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, e-mail ou WhatsApp..." className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500" />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-start">
          {['all', 'ativo', 'teste', 'teste_expirado', 'bloqueado'].map((status) => (
            <button key={status} onClick={() => setStatusFilter(status as any)} className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${statusFilter === status ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {status === 'all' ? `Todos (${totalUsers})` : status === 'ativo' ? `Ativos (${activeUsers})` : status === 'teste' ? `Teste (${trialUsers})` : status === 'teste_expirado' ? `Expirados (${expiredTrialUsers})` : `Bloqueados (${blockedUsers})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button onClick={loadData} disabled={loading} className="bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>
          <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="p-4 font-black">Usuário</th>
                <th className="p-4 font-black">E-mail / Telefone</th>
                <th className="p-4 font-black">Plano / Valor</th>
                <th className="p-4 font-black">Status</th>
                <th className="p-4 font-black text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-cyan-400 font-bold animate-pulse">Carregando base de usuários...</td></tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum assinante encontrado.</td></tr>
              ) : (
                filteredSubscribers.map((sub) => {
                  const remainingHours = getRemainingTrialHours(sub);
                  return (
                    <tr key={sub.uid} className="hover:bg-slate-800/50 transition">
                      <td className="p-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs shrink-0 ${sub.role === 'admin' ? 'bg-red-900/50 text-red-400' : sub.status === 'ativo' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-cyan-900/50 text-cyan-400'}`}>
                            {sub.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-black">{sub.name}</span>
                            {sub.role === 'admin' && <span className="bg-red-900/50 text-red-400 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">Master Admin</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">
                        <span className="block font-medium">{sub.email}</span>
                        {sub.phone && (
                          <a href={getClientWhatsAppDirectLink(sub.phone, sub.name, sub.plan, sub.monthlyValue || 9.90, sub.status === 'ativo' ? 'liberado' : 'cobrar')} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center gap-0.5 mt-1 bg-emerald-900/30 w-fit px-1.5 py-0.5 rounded border border-emerald-800">
                            <MessageCircle className="w-2.5 h-2.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </td>
                      <td className="p-4 text-slate-300 font-bold">{sub.plan}<br/><span className="text-[10px] text-slate-500">R$ {sub.monthlyValue?.toFixed(2)}</span></td>
                      <td className="p-4">
                        {sub.status === 'ativo' ? (
                          <span className="inline-flex items-center gap-1 border border-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-emerald-400 bg-emerald-900/30"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Ativo</span>
                        ) : sub.status === 'teste' ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 border border-cyan-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-cyan-400 bg-cyan-900/30"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />Em Teste</span>
                            <span className="text-[9px] text-cyan-500 font-bold mt-0.5">~{remainingHours}h restantes</span>
                          </div>
                        ) : sub.status === 'teste_expirado' ? (
                          <span className="inline-flex items-center gap-1 border border-amber-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-amber-400 bg-amber-900/30"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Expirado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-red-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-red-400 bg-red-900/30"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Bloqueado</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {sub.status !== 'ativo' && (
                            <button onClick={() => handleActivateAccount(sub)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase shadow-sm transition flex items-center gap-1">
                              <Check className="w-3 h-3" /><span>Ativar</span>
                            </button>
                          )}
                          {sub.status !== 'bloqueado' && (
                            <button onClick={() => handleBlockAccount(sub)} className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1">
                              <Ban className="w-3 h-3" /><span>Bloquear</span>
                            </button>
                          )}
                          {(sub.status === 'teste' || sub.status === 'teste_expirado') && (
                            <button onClick={() => handleExtendTrial(sub)} className="px-2 py-1.5 bg-cyan-900/50 hover:bg-cyan-900 text-cyan-400 rounded-xl text-[10px] font-bold transition flex items-center gap-1">
                              <PlusCircle className="w-3 h-3" /><span>+24h</span>
                            </button>
                          )}
                          <button onClick={() => handleDeleteSubscriber(sub.uid, sub.name)} className="p-1.5 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-xl transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-black uppercase text-white">Cadastrar Novo Assinante</h3>
                <p className="text-[10px] text-cyan-400 font-bold">Computado diretamente no Banco de Dados</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center font-bold text-xs">✕</button>
            </div>
            <form onSubmit={handleAddSubscriber} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome Completo</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">E-mail de Acesso</label>
                <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">WhatsApp (Opcional)</label>
                <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status Inicial</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as UserStatus)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-bold">
                  <option value="teste">Em Teste (24h)</option>
                  <option value="ativo">Ativo (Pago)</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};