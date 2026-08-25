import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        return (
          <div
            key={t.id}
            onClick={() => onDismiss(t.id)}
            className={`pointer-events-auto flex items-center gap-3 p-3.5 rounded-2xl shadow-xl border text-xs font-bold transition-all animate-fadeIn cursor-pointer ${
              t.type === 'success'
                ? 'bg-white text-emerald-900 border-emerald-300 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-white text-red-900 border-red-300 shadow-red-500/10'
                : 'bg-white text-cyan-900 border-cyan-300 shadow-cyan-500/10'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-cyan-500 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
};
