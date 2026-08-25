import React, { useState } from 'react';
import { Shield, KeyRound, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { Subscriber } from '../types';
import { loginMasterAdmin } from '../services/firebase';

interface AdminSecretLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: Subscriber) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminSecretLoginModal: React.FC<AdminSecretLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Digite a chave mestra de acesso.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const admin = await loginMasterAdmin(passcode);
      onSuccess(admin);
      onShowToast('Acesso de Administrador Master liberado com sucesso!', 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Chave mestra inválida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-red-500/30 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 border-b border-red-900/40 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 bg-red-600/20 border border-red-500/40 rounded-xl text-red-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-red-400 tracking-wider block">
                Área Restrita do Proprietário
              </span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">
                Painel Master Admin
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Digite sua senha exclusiva de administrador para gerenciar assinantes e faturamento.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-2xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5 flex items-center justify-between">
                <span>Senha Mestra Exclusiva</span>
                <span className="text-[9px] text-red-400 font-bold">Confidencial</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Insira sua senha de admin..."
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-red-500 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition font-mono"
                />
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-red-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-red-950/50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Validando Acesso...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Desbloquear Painel Master</span>
                </>
              )}
            </button>
          </form>

          <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-2xl text-center">
            <p className="text-[10px] text-slate-400">
              Esta janela é oculta aos clientes normais. Somente detentores da senha administrativa podem abrir o painel.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
