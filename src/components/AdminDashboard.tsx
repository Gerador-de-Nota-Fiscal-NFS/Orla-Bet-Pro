import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  Search, 
  RefreshCw, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  Download,
  Calendar,
  Lock,
  Unlock,
  CreditCard
} from 'lucide-react';
import { Subscriber } from '../types';
import { 
  fetchAllSubscribers, 
  updateSubscriberStatus, 
  updateSubscriberPlan, 
  removeSubscriber, 
  registerSubscriber 
} from '../services/firebase';

interface AdminDashboardProps {
  onBackToApp: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToApp, onShowToast }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'bloqueado'>('all');
  
  // Modal Novo Assinante
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPlan, setNewPlan] = useState('Plano Mensal VIP');
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
    loadData();
  }, []);

  const totalUsers = subscribers.length;
  const activeUsers = subscribers.filter(s => s.status === 'ativo').length;
  const blockedUsers = subscribers.filter(s => s.status === 'bloqueado').length;
  
  const totalRevenue = subscribers
    .filter(s => s.status === 'ativo')
    .reduce((acc, curr) => acc + (curr.monthlyValue || 49.90), 0);

  const avgTicket = activeUsers > 0 ? (totalRevenue / activeUsers) : 0;

  const handleToggleStatus = async (uid: string, currentStatus: 'ativo' | 'bloqueado') => {
    const nextStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
    try {
      await updateSubscriberStatus(uid, nextStatus);
      setSubscribers(prev => prev.map(s => s.uid === uid ? { ...s, status: nextStatus } : s));
      onShowToast(`Status do usuário atualizado para ${nextStatus.toUpperCase()}!`, 'success');
    } catch (e: any) {
      onShowToast('Falha ao atualizar status: ' + e.message, 'error');
    }
  };

  const handlePlanChange = async (uid: string, planName: string) => {
    const price = planName.includes('Anual') ? 349.90 : planName.includes('Trimestral') ? 119.90 : 49.90;
    try {
      await updateSubscriberPlan(uid, planName, price);
      setSubscribers(prev => prev.map(s => s.uid === uid ? { ...s, plan: planName, monthlyValue: price } : s));
      onShowToast('Plano de assinatura atualizado com sucesso!', 'success');
    } catch (e: any) {
      onShowToast('Erro ao trocar plano: ' + e.message, 'error');
    }
  };

  const handleDeleteSubscriber = async (uid: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o assinante "${name}"?`)) {
      try {
        await removeSubscriber(uid);
        setSubscribers(prev => prev.filter(s => s.uid !== uid));
        onShowToast('Assinante removido com sucesso.', 'info');
      } catch (e: any) {
        onShowToast('Erro ao remover assinante: ' + e.message, 'error');
      }
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) {
      onShowToast('Preencha nome e e-mail do assinante.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const added = await registerSubscriber(newEmail, '123456', newName, newPlan, newPhone);
      setSubscribers(prev => [added, ...prev.filter(s => s.uid !== added.uid)]);
      onShowToast(`Assinante "${newName}" cadastrado com sucesso!`, 'success');
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    } catch (err: any) {
      onShowToast('Erro ao adicionar assinante: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ['UID,Nome,Email,Telefone,Status,Plano,ValorMensal,CriadoEm'];
    const rows = subscribers.map(s => `"${s.uid}","${s.name}","${s.email}","${s.phone || ''}","${s.status}","${s.plan}","${s.monthlyValue}","${s.createdAt}"`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orla_bet_assinantes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Relatório CSV exportado!', 'success');
  };

  // Filtered subscribers list
  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.email.toLowerCase().includes(search.toLowerCase()) ||
                          (s.phone && s.phone.includes(search));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="adminDashboard" className="max-w-7xl mx-auto px-4 py-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-6 rounded-3xl border border-red-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Painel Master Admin
            </span>
            <span className="text-[9px] font-bold text-slate-400">
              Firebase Firestore Modular v10+
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            <span>Gestão de Assinantes Orla Bet</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={onBackToApp} 
            className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition"
          >
            Voltar aos Jogos
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Assinante</span>
          </button>
        </div>
      </div>

      {/* Financial & Subscriber KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Assinantes</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalUsers}</p>
          <span className="text-[9px] text-slate-400 mt-1">Base cadastrada no sistema</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 border-l-4 border-l-emerald-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assinaturas Ativas</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-emerald-600">{activeUsers}</p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '0%'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">Com acesso total aos palpites</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-red-100 border-l-4 border-l-red-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bloqueados</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-3xl font-black text-red-600 mt-2">{blockedUsers}</p>
          <span className="text-[9px] text-slate-400 mt-1">Acesso suspenso</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-cyan-100 border-l-4 border-l-cyan-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Faturamento Estimado</span>
            <DollarSign className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-cyan-600 mt-2">
            R$ {totalRevenue.toFixed(2).replace('.', ',')}
          </p>
          <span className="text-[9px] text-slate-400 mt-1">
            Ticket Médio: R$ {avgTicket.toFixed(2).replace('.', ',')} / mês
          </span>
        </div>

      </div>

      {/* Control Bar: Filters, Search & Export */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-cyan-500 shadow-inner"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-start">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalUsers})
          </button>
          <button
            onClick={() => setStatusFilter('ativo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              statusFilter === 'ativo' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ativos ({activeUsers})
          </button>
          <button
            onClick={() => setStatusFilter('bloqueado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              statusFilter === 'bloqueado' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bloqueados ({blockedUsers})
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-cyan-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Sincronizar com Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            onClick={exportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Exportar dados para planilha"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>

      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-4 font-black">Assinante</th>
                <th className="p-4 font-black">E-mail / Telefone</th>
                <th className="p-4 font-black">Plano / Valor</th>
                <th className="p-4 font-black">Status</th>
                <th className="p-4 font-black">Criado Em</th>
                <th className="p-4 font-black text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-cyan-600 font-bold animate-pulse">
                    Sincronizando base de dados Firebase Firestore...
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum assinante encontrado para os critérios de busca.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => (
                  <tr key={sub.uid} className="hover:bg-slate-50/80 transition">
                    
                    {/* Nome & Role */}
                    <td className="p-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 font-black flex items-center justify-center text-xs shrink-0">
                          {sub.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-black">{sub.name}</span>
                          {sub.role === 'admin' && (
                            <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email / Telefone */}
                    <td className="p-4 text-slate-600">
                      <span className="block font-medium">{sub.email}</span>
                      {sub.phone && (
                        <span className="text-[10px] text-slate-400 block">{sub.phone}</span>
                      )}
                    </td>

                    {/* Plano & Valor */}
                    <td className="p-4">
                      <select
                        value={sub.plan}
                        onChange={(e) => handlePlanChange(sub.uid, e.target.value)}
                        className="bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="Plano Mensal VIP">Plano Mensal VIP (R$ 49,90)</option>
                        <option value="Plano Trimestral Pro">Plano Trimestral Pro (R$ 119,90)</option>
                        <option value="Plano Anual VIP">Plano Anual VIP (R$ 349,90)</option>
                      </select>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        sub.status === 'ativo'
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-red-700 bg-red-50 border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{sub.status}</span>
                      </span>
                    </td>

                    {/* Data Criação */}
                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Bloquear / Ativar */}
                        <button
                          onClick={() => handleToggleStatus(sub.uid, sub.status)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1 ${
                            sub.status === 'ativo'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                          }`}
                          title={sub.status === 'ativo' ? 'Bloquear Assinatura' : 'Reativar Assinatura'}
                        >
                          {sub.status === 'ativo' ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-700" />
                              <span>Bloquear</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-700" />
                              <span>Ativar</span>
                            </>
                          )}
                        </button>

                        {/* Remover */}
                        <button
                          onClick={() => handleDeleteSubscriber(sub.uid, sub.name)}
                          className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-xl transition"
                          title="Remover Assinante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Assinante */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900">
                  Cadastrar Novo Assinante
                </h3>
                <p className="text-[10px] text-cyan-600 font-bold">
                  Armazenamento automático no Firestore (`subscribers`)
                </p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubscriber} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  placeholder="joao@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  WhatsApp / Telefone (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Plano Contratado
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-bold"
                >
                  <option value="Plano Mensal VIP">Plano Mensal VIP (R$ 49,90/mês)</option>
                  <option value="Plano Trimestral Pro">Plano Trimestral Pro (R$ 119,90/trimestre)</option>
                  <option value="Plano Anual VIP">Plano Anual VIP (R$ 349,90/ano)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando no Firebase...' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
