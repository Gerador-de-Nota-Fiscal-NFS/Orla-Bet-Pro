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
  Download,
  Lock, 
  Unlock, 
  Timer,
  Clock,
  Sparkles,
  Zap,
  Check,
  PlusCircle,
  MessageCircle,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { Subscriber, UserStatus } from '../types';
import { 
  fetchAllSubscribers, 
  subscribeToSubscribers,
  updateSubscriberStatus, 
  updateSubscriberPlan, 
  removeSubscriber, 
  registerSubscriber,
  approveSubscriberAccess,
  activateSubscriberPayment,
  blockSubscriberNoPayment,
  extendSubscriberTrial,
  SUBSCRIPTION_PLANS,
  getRemainingTrialSeconds,
  ADMIN_WHATSAPP_DISPLAY,
  ADMIN_WHATSAPP_NUMBER,
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
  
  // Modal Novo Assinante
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPlan, setNewPlan] = useState('Plano Avançado (Pro)');
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

  // Real-time Firestore synchronization
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSubscribers((data) => {
      setSubscribers(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const totalUsers = subscribers.length;
  const activeUsers = subscribers.filter(s => s.status === 'ativo').length;
  const trialUsers = subscribers.filter(s => s.status === 'teste').length;
  const expiredTrialUsers = subscribers.filter(s => s.status === 'teste_expirado').length;
  const blockedUsers = subscribers.filter(s => s.status === 'bloqueado').length;
  
  const totalRevenue = subscribers
    .filter(s => s.status === 'ativo')
    .reduce((acc, curr) => acc + (curr.monthlyValue || 20.00), 0);

  const avgTicket = activeUsers > 0 ? (totalRevenue / activeUsers) : 0;

  // Dedicated Activate Account
  const handleActivateAccount = async (sub: Subscriber) => {
    const planObj = SUBSCRIPTION_PLANS.find(p => p.name === sub.plan) || SUBSCRIPTION_PLANS[1];
    try {
      await activateSubscriberPayment(sub.uid, planObj.name, planObj.price);
      setSubscribers(prev => prev.map(s => s.uid === sub.uid ? { 
        ...s, 
        status: 'ativo', 
        plan: planObj.name, 
        monthlyValue: planObj.price,
        isTrial: false,
        trialEndsAt: undefined
      } : s));
      onShowToast(`Conta de "${sub.name}" ATIVADA com sucesso (PIX Confirmado)!`, 'success');
    } catch (e: any) {
      onShowToast('Erro ao ativar conta: ' + e.message, 'error');
    }
  };

  // Dedicated Block Account (e.g. No Payment)
  const handleBlockAccount = async (sub: Subscriber) => {
    try {
      await blockSubscriberNoPayment(sub.uid);
      setSubscribers(prev => prev.map(s => s.uid === sub.uid ? { 
        ...s, 
        status: 'bloqueado',
        isTrial: false 
      } : s));
      onShowToast(`Conta de "${sub.name}" BLOQUEADA por falta de pagamento.`, 'error');
    } catch (e: any) {
      onShowToast('Falha ao bloquear conta: ' + e.message, 'error');
    }
  };

  const handleToggleStatus = async (uid: string, currentStatus: UserStatus) => {
    const nextStatus: UserStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
    try {
      await updateSubscriberStatus(uid, nextStatus);
      setSubscribers(prev => prev.map(s => s.uid === uid ? { ...s, status: nextStatus } : s));
      onShowToast(`Status do usuário alterado para ${nextStatus.toUpperCase()}!`, 'info');
    } catch (e: any) {
      onShowToast('Falha ao atualizar status: ' + e.message, 'error');
    }
  };

  const handleExtendTrial = async (sub: Subscriber) => {
    try {
      await extendSubscriberTrial(sub.uid, 15);
      const data = await fetchAllSubscribers();
      setSubscribers(data);
      onShowToast(`+15 minutos de teste concedidos para "${sub.name}"!`, 'success');
    } catch (e: any) {
      onShowToast('Erro ao estender teste: ' + e.message, 'error');
    }
  };

  const handlePlanChange = async (uid: string, planName: string) => {
    const planObj = SUBSCRIPTION_PLANS.find(p => p.name === planName);
    const price = planObj ? planObj.price : 20.00;
    try {
      await updateSubscriberPlan(uid, planName, price);
      setSubscribers(prev => prev.map(s => s.uid === uid ? { ...s, plan: planName, monthlyValue: price } : s));
      onShowToast(`Plano atualizado para ${planName} (R$ ${price.toFixed(2)})!`, 'success');
    } catch (e: any) {
      onShowToast('Erro ao trocar plano: ' + e.message, 'error');
    }
  };

  const handleDeleteSubscriber = async (uid: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o assinante "${name}" do banco de dados?`)) {
      try {
        await removeSubscriber(uid);
        setSubscribers(prev => prev.filter(s => s.uid !== uid));
        onShowToast('Assinante removido do banco com sucesso.', 'info');
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
      if (newStatus === 'ativo') {
        const planObj = SUBSCRIPTION_PLANS.find(p => p.name === newPlan) || SUBSCRIPTION_PLANS[1];
        await activateSubscriberPayment(added.uid, planObj.name, planObj.price);
        added.status = 'ativo';
        added.isTrial = false;
      } else if (newStatus === 'bloqueado') {
        await blockSubscriberNoPayment(added.uid);
        added.status = 'bloqueado';
      }

      setSubscribers(prev => [added, ...prev.filter(s => s.uid !== added.uid)]);
      onShowToast(`Assinante "${newName}" computado no banco com sucesso!`, 'success');
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewStatus('teste');
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Painel Master Admin
            </span>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              📱 WhatsApp de Recebimento PIX: <strong>{ADMIN_WHATSAPP_DISPLAY}</strong>
            </span>
            <span className="text-[9px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              ⚡ Sincronização em Tempo Real (Firestore)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            <span>Gestão de Assinantes & Controle de Acesso</span>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Contas</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalUsers}</p>
          <span className="text-[9px] text-slate-400 mt-0.5">Computados no banco</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 border-l-4 border-l-emerald-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assinaturas Ativas</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-emerald-600">{activeUsers}</p>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
              {totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '0%'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5">PIX Pago / Liberado</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cyan-100 border-l-4 border-l-cyan-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Em Teste Grátis</span>
            <Timer className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-black text-cyan-600 mt-2">{trialUsers}</p>
          <span className="text-[9px] text-slate-400 mt-0.5">Novos testes (15 min)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Testes Expirados</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{expiredTrialUsers}</p>
          <span className="text-[9px] text-slate-400 mt-0.5">Aguardando PIX</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-100 border-l-4 border-l-red-500 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bloqueados</span>
            <Ban className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600 mt-2">{blockedUsers}</p>
          <span className="text-[9px] text-slate-400 mt-0.5">Sem pagamento</span>
        </div>

      </div>

      {/* Control Bar: Filters, Search & Export */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, e-mail ou WhatsApp..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-cyan-500 shadow-inner"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-start">
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
            onClick={() => setStatusFilter('teste')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              statusFilter === 'teste' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Teste ({trialUsers})
          </button>
          <button
            onClick={() => setStatusFilter('teste_expirado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              statusFilter === 'teste_expirado' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Expirados ({expiredTrialUsers})
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
            title="Sincronizar dados do banco"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            onClick={exportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Exportar CSV"
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
                <th className="p-4 font-black">Usuário</th>
                <th className="p-4 font-black">E-mail / Telefone</th>
                <th className="p-4 font-black">Plano / Valor</th>
                <th className="p-4 font-black">Status do Acesso</th>
                <th className="p-4 font-black">Data Criação</th>
                <th className="p-4 font-black text-right">Controles de Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-cyan-600 font-bold animate-pulse">
                    Carregando base de usuários do banco de dados...
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum assinante encontrado para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => {
                  const remainingSeconds = getRemainingTrialSeconds(sub);
                  const remainingMinutes = Math.floor(remainingSeconds / 60);

                  return (
                    <tr key={sub.uid} className="hover:bg-slate-50/80 transition">
                      
                      {/* Nome & Role */}
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs shrink-0 ${
                            sub.role === 'admin' 
                              ? 'bg-red-100 text-red-800' 
                              : sub.status === 'ativo' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : sub.status === 'bloqueado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-cyan-100 text-cyan-800'
                          }`}>
                            {sub.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-black">{sub.name}</span>
                            {sub.role === 'admin' && (
                              <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                Master Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email / Telefone */}
                      <td className="p-4 text-slate-600">
                        <span className="block font-medium">{sub.email}</span>
                        {sub.phone ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-500">{sub.phone}</span>
                            <a
                              href={getClientWhatsAppDirectLink(sub.phone, sub.name, sub.plan, sub.monthlyValue || 20, sub.status === 'ativo' ? 'liberado' : 'cobrar')}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 text-[10px] font-bold flex items-center gap-0.5 ml-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                              title="Conversar com o cliente no WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">Sem telefone informado</span>
                        )}
                      </td>

                      {/* Plano & Valor */}
                      <td className="p-4">
                        <select
                          value={sub.plan}
                          onChange={(e) => handlePlanChange(sub.uid, e.target.value)}
                          className="bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="Plano Básico">Plano Básico (R$ 10,00)</option>
                          <option value="Plano Avançado (Pro)">Plano Avançado (Pro) (R$ 20,00)</option>
                          <option value="Plano VIP">Plano VIP (R$ 49,00)</option>
                        </select>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        {sub.status === 'ativo' ? (
                          <span className="inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Ativo (Pago)</span>
                          </span>
                        ) : sub.status === 'teste' ? (
                          <div className="inline-flex flex-col">
                            <span className="inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-cyan-700 bg-cyan-50 border-cyan-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                              <span>Em Teste</span>
                            </span>
                            <span className="text-[9px] text-cyan-800 font-bold mt-0.5">
                              {remainingMinutes > 0 ? `~${remainingMinutes} min restantes` : 'Expirando'}
                            </span>
                          </div>
                        ) : sub.status === 'teste_expirado' ? (
                          <span className="inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-amber-700 bg-amber-50 border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Teste Expirado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-red-700 bg-red-50 border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Bloqueado (Sem Pgto)</span>
                          </span>
                        )}
                      </td>

                      {/* Data Criação */}
                      <td className="p-4 text-slate-400 text-[11px]">
                        {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Ações / Botões de Ativar e Bloquear */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Botão de ATIVAR CONTA (Liberar PIX) */}
                          {sub.status !== 'ativo' && (
                            <button
                              onClick={() => handleActivateAccount(sub)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase shadow-sm transition flex items-center gap-1"
                              title="Confirmar pagamento e Ativar Acesso Imediato"
                            >
                              <Check className="w-3 h-3" />
                              <span>Ativar Conta</span>
                            </button>
                          )}

                          {/* Botão de BLOQUEAR CONTA (Sem Pagamento) */}
                          {sub.status !== 'bloqueado' && (
                            <button
                              onClick={() => handleBlockAccount(sub)}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-[10px] font-black uppercase transition flex items-center gap-1"
                              title="Bloquear conta caso não haja pagamento"
                            >
                              <Ban className="w-3 h-3 text-red-600" />
                              <span>Bloquear</span>
                            </button>
                          )}

                          {/* Estender +15 min de teste caso queira */}
                          {(sub.status === 'teste' || sub.status === 'teste_expirado') && (
                            <button
                              onClick={() => handleExtendTrial(sub)}
                              className="px-2 py-1.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 rounded-xl text-[10px] font-bold transition flex items-center gap-1"
                              title="Adicionar +15 minutos de teste gratuito"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>+15m</span>
                            </button>
                          )}

                          {/* Remover Registro */}
                          <button
                            onClick={() => handleDeleteSubscriber(sub.uid, sub.name)}
                            className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-xl transition"
                            title="Remover Registro do Banco"
                          >
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
                  Computado diretamente no Banco de Dados (Firestore)
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Plano Contratado
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="Plano Básico">Plano Básico (R$ 10,00)</option>
                    <option value="Plano Avançado (Pro)">Plano Avançado (Pro) (R$ 20,00)</option>
                    <option value="Plano VIP">Plano VIP (R$ 49,00)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="teste">Em Teste (15 min)</option>
                    <option value="ativo">Ativo (Pago)</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando no Banco...' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

