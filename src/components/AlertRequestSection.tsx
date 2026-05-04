import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Calendar, MessageSquare, Save, CheckCircle2, Clock, User, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertRequest } from '../types';
import { cn } from '../lib/utils';

const alertRequestSchema = z.object({
  restrictionName: z.string().min(1, "Nombre de la restricción es requerido"),
  routeInfo: z.string().min(1, "Origen/Destino, Ruta, Vuelo o Matrícula es requerido"),
  periodFrom: z.string().min(1, "Fecha inicio es requerida"),
  periodTo: z.string().min(1, "Fecha fin es requerida"),
  replacesRestriction: z.string().optional(),
  remarks: z.string().optional(),
});

type AlertRequestFormData = z.infer<typeof alertRequestSchema>;

interface AlertRequestSectionProps {
  type: 'IFN' | 'JTA';
  requests: AlertRequest[];
  onSubmit: (data: any) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  userEmail: string;
}

const AUTHORIZED_APPROVERS = [
  'gonzalo.roco@latam.com',
  'felipe.orostica@latam.com',
  'jahirandres.benavides@latam.com',
  'mariafernanda.lopez@latam.com',
  'roberto.galleguillos@latam.com'
];

const AUTHORIZED_REQUESTERS = [
  'jose.moralesr@latam.com',
  'alexandra.campos@latam.com',
  'clemente.pena@latam.com',
  'felipe.orostica@latam.com',
  'jahirandres.benavides@latam.com',
  'mariafernanda.lopez@latam.com',
  'roberto.galleguillos@latam.com'
];

export const AlertRequestSection = ({ type, requests, onSubmit, onComplete, onCancel, userEmail }: AlertRequestSectionProps) => {
  const isApprover = AUTHORIZED_APPROVERS.includes(userEmail.toLowerCase());
  const isRequester = AUTHORIZED_REQUESTERS.includes(userEmail.toLowerCase());
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AlertRequestFormData>({
    resolver: zodResolver(alertRequestSchema)
  });

  const handleFormSubmit = (data: AlertRequestFormData) => {
    onSubmit({ ...data, type });
    reset();
  };

  const filteredRequests = requests
    .filter(r => r.type === type)
    .filter(r => filter === 'all' || r.status === filter);

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="text-center md:text-left space-y-2">
        <h1 className="text-3xl font-bold font-display uppercase tracking-tight text-latam-navy">
          Requerimiento de Alertas {type}
        </h1>
        <p className="text-xs uppercase font-black tracking-widest text-slate-400">
          Gestión de restricciones operacionales para flota LATAM
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        {isRequester ? (
          <div className="lg:col-span-5 space-y-6">
            <div className="card-latam p-6 border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-latam-navy text-white rounded">
                  <AlertCircle size={18} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-latam-navy">Nueva Solicitud</h2>
              </div>

              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormGroup label="Nombre de la Restricción" required error={errors.restrictionName?.message}>
                  <input 
                    {...register('restrictionName')} 
                    placeholder="Ej: Curfew, Closure, Payload..." 
                    className="input-latam" 
                  />
                </FormGroup>

                <FormGroup label="Ruta / Vuelo / Matrícula" required error={errors.routeInfo?.message}>
                  <input 
                    {...register('routeInfo')} 
                    placeholder="Origen-Destino, Ruta, Vuelo o Matrícula" 
                    className="input-latam" 
                  />
                </FormGroup>

                <div className="grid grid-cols-2 gap-4">
                  <FormGroup label="Desde" required error={errors.periodFrom?.message}>
                    <input type="datetime-local" {...register('periodFrom')} className="input-latam" />
                  </FormGroup>
                  <FormGroup label="Hasta" required error={errors.periodTo?.message}>
                    <input type="datetime-local" {...register('periodTo')} className="input-latam" />
                  </FormGroup>
                </div>

                <FormGroup label="¿Reemplaza a otra restricción?">
                  <input {...register('replacesRestriction')} placeholder="Indicar cual (opcional)" className="input-latam" />
                </FormGroup>

                <FormGroup label="Observaciones">
                  <textarea 
                    {...register('remarks')} 
                    className="input-latam min-h-[100px] resize-none" 
                    placeholder="Detalles adicionales..."
                  />
                </FormGroup>

                <button type="submit" className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-4">
                  <Save size={18} />
                  Enviar Solicitud
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-12 md:lg:col-span-5 hidden">
            {/* Empty space or unauthorized message if needed, but we'll adjust grid below */}
          </div>
        )}

        {/* List Section */}
        <div className={cn("space-y-6", isRequester ? "lg:col-span-7" : "lg:col-span-12")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['all', 'pending', 'completed', 'cancelled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                      filter === f ? "bg-white text-latam-navy shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={req.id}
                  className={cn(
                    "card-latam p-5 border transition-all",
                    req.status === 'completed' ? "border-emerald-100 bg-emerald-50/30" : 
                    req.status === 'cancelled' ? "border-red-100 bg-red-50/20 opacity-60 grayscale-[0.5]" :
                    "border-slate-200 bg-white shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black uppercase tracking-tight text-latam-navy">
                        {req.restrictionName}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <User size={12} />
                        {req.requesterEmail}
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[8px] font-black uppercase tracking-[0.2em]",
                      req.status === 'completed' ? "bg-emerald-500 text-white" : 
                      req.status === 'cancelled' ? "bg-red-500 text-white" :
                      "bg-orange-100 text-orange-600"
                    )}>
                      {req.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[8px] uppercase font-black text-slate-400 tracking-widest mb-1">Criterio</span>
                        <p className="font-bold text-slate-700">{req.routeInfo}</p>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase font-black text-slate-400 tracking-widest mb-1">Periodo Vigencia</span>
                        <div className="flex flex-col gap-1 text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-slate-300" />
                            {new Date(req.periodFrom).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-slate-300" />
                            {new Date(req.periodTo).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {req.replacesRestriction && (
                        <div>
                          <span className="block text-[8px] uppercase font-black text-slate-400 tracking-widest mb-1">Reemplaza a</span>
                          <p className="font-bold text-latam-magenta">{req.replacesRestriction}</p>
                        </div>
                      )}
                      {req.remarks && (
                        <div>
                          <span className="block text-[8px] uppercase font-black text-slate-400 tracking-widest mb-1">Observaciones</span>
                          <p className="text-slate-600 leading-relaxed italic">"{req.remarks}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                      {(req.requesterEmail.toLowerCase() === userEmail.toLowerCase() || isApprover) && (
                        <button
                          onClick={() => onCancel(req.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded font-black text-[9px] uppercase tracking-widest hover:bg-red-50 transition-all"
                        >
                          <X size={14} />
                          Anular Solicitud
                        </button>
                      )}
                      {isApprover && (
                        <button
                          onClick={() => onComplete(req.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 shadow-sm transition-all"
                        >
                          <CheckCircle2 size={14} />
                          Marcar como Completado
                        </button>
                      )}
                    </div>
                  )}

                  {req.status === 'completed' && (
                    <div className="pt-4 border-t border-emerald-100 flex justify-between items-center text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} />
                        Procesado por {req.completedBy}
                      </div>
                      <div>{new Date(req.completedAt!).toLocaleString()}</div>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="p-20 card-latam border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-4">
                <Clock size={40} className="opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center">No hay solicitudes registradas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FormGroup = ({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string }) => (
  <div className="space-y-1.5 flex flex-col">
    <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
      {label}
      {required && <span className="text-latam-magenta">*</span>}
    </label>
    {children}
    {error && <span className="text-[9px] text-latam-magenta font-black uppercase tracking-tighter mt-1">{error}</span>}
  </div>
);
