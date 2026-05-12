import React from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  requestTitle: string;
}

export const CancellationModal = ({ isOpen, onClose, onConfirm, requestTitle }: CancellationModalProps) => {
  const [reason, setReason] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Anular Requerimiento</h3>
                    <p className="text-xs text-slate-500 font-medium">{requestTitle}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Justificación de Anulación
                  </label>
                  <textarea
                    autoFocus
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explique el motivo por el cual se anula esta solicitud..."
                    className="w-full min-h-[120px] p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-latam-navy focus:bg-white outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-100 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!reason.trim()}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200"
                  >
                    <Send size={14} />
                    Confirmar Anulación
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
