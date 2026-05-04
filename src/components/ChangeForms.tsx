import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Repeat, Save, Calendar, Clock, History, Plane, ChevronRight, X } from 'lucide-react';
import { Aircraft } from '../types';
import { StatusBadge } from './Dashboard';
import { cn } from '../lib/utils';

const baseChangeSchema = z.object({
  ac_owner: z.string().min(1, "Owner es requerido"),
  ac_registration: z.string().min(1, "Registration es requerido"),
  base_actual: z.string().min(1, "Base actual es requerida"),
  new_base: z.string().min(1, "Nueva base es requerida"),
  fecha_desde: z.string().min(1, "Fecha y hora es requerida"),
});

const operatorChangeSchema = z.object({
  ac_owner_actual: z.string().min(1, "Owner actual es requerido"),
  ac_owner_new: z.string().min(1, "Nuevo owner es requerido"),
  ac_registration: z.string().min(1, "Registration es requerido"),
  base_actual: z.string().min(1, "Base actual es requerida"),
  fecha_desde: z.string().min(1, "Fecha y hora es requerida"),
});

interface ChangeFormsProps {
  type: 'base' | 'operator';
  onSubmit: (data: any) => void;
  aircrafts: Aircraft[];
  onViewAircraft: (id: string) => void;
  initialData?: Aircraft;
  mode?: 'create' | 'edit';
  onCancel?: () => void;
}

export const ChangeForms = ({ type, onSubmit, aircrafts, onViewAircraft, initialData, mode = 'create', onCancel }: ChangeFormsProps) => {
  const isBase = type === 'base';
  const isEdit = mode === 'edit';
  const targetActivationType = isBase ? 'base_change' : 'operator_change';
  
  const filteredActivations = [...aircrafts]
    .filter(a => a.activation_type === targetActivationType)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(isBase ? baseChangeSchema : operatorChangeSchema),
    defaultValues: initialData || undefined
  });

  return (
    <div className={cn("max-w-4xl mx-auto grid grid-cols-1 gap-8", !isEdit && "lg:grid-cols-5")}>
      {/* Form Section */}
      <div className={cn(isEdit ? "max-w-xl mx-auto w-full" : "lg:col-span-3", "space-y-8")}>
        <div className="flex items-center justify-between">
          <div className="text-left space-y-1">
            <h1 className="text-2xl font-bold font-display uppercase tracking-tight text-latam-navy">
              {isEdit ? `Edit ${isBase ? 'Base' : 'Operator'} Change` : (isBase ? 'Fleet Base Relocation' : 'Fleet Operator Change')}
            </h1>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
              {isEdit ? `Update existing ${targetActivationType.replace('_', ' ')} record` : 'Official log entry for aircraft status modification'}
            </p>
          </div>
          {isEdit && onCancel && (
            <button type="button" onClick={onCancel} className="p-2 text-slate-300 hover:text-latam-magenta transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card-latam border border-slate-200 p-8 space-y-6 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-latam-navy border-b border-slate-100 pb-4 mb-2">
            {isBase ? <MapPin size={20} /> : <Repeat size={20} />}
            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Transaction Metadata</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isBase ? (
              <>
                <FormGroup label="A/C Owner" required error={errors.ac_owner?.message?.toString()}>
                  <input {...register('ac_owner')} className="input-latam" />
                </FormGroup>
                <FormGroup label="A/C Registration" required error={errors.ac_registration?.message?.toString()}>
                  <input {...register('ac_registration')} className="input-latam" />
                </FormGroup>
                <FormGroup label="Current Base" required error={errors.base_actual?.message?.toString()}>
                  <input {...register('base_actual')} className="input-latam" />
                </FormGroup>
                <FormGroup label="Target Base" required error={errors.new_base?.message?.toString()}>
                  <input {...register('new_base')} className="input-latam" />
                </FormGroup>
              </>
            ) : (
              <>
                <FormGroup label="Existing Owner" required error={errors.ac_owner_actual?.message?.toString()}>
                  <input {...register('ac_owner_actual')} className="input-latam" />
                </FormGroup>
                <FormGroup label="Future Owner" required error={errors.ac_owner_new?.message?.toString()}>
                  <input {...register('ac_owner_new')} className="input-latam" />
                </FormGroup>
                <FormGroup label="A/C Registration" required error={errors.ac_registration?.message?.toString()}>
                  <input {...register('ac_registration')} className="input-latam" />
                </FormGroup>
                <FormGroup label="Station Hub" required error={errors.base_actual?.message?.toString()}>
                  <input {...register('base_actual')} className="input-latam" />
                </FormGroup>
              </>
            )}

            <div className="md:col-span-2">
              <FormGroup label="Effective Date & Time" required error={errors.fecha_desde?.message?.toString()}>
                <input type="datetime-local" {...register('fecha_desde')} className="input-latam" />
              </FormGroup>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button type="submit" className="w-full btn-primary py-4 flex items-center justify-center gap-2">
              <Save size={18} />
              {isEdit ? 'Save Changes' : 'Commit Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Status List Sidebar */}
      {!isEdit && (
        <div className="lg:col-span-2 space-y-6">
        <div className="card-latam border border-slate-200 h-full flex flex-col overflow-hidden bg-white shadow-sm">
          <div className="p-4 border-b bg-latam-navy text-white flex items-center gap-2">
            <History size={16} />
            <h3 className="text-xs font-black uppercase tracking-[0.15em]">Log Historial & Status</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredActivations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredActivations.map((ac) => (
                  <div 
                    key={ac.id} 
                    onClick={() => onViewAircraft(ac.id)}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-latam-navy group-hover:bg-latam-navy group-hover:text-white transition-colors">
                          <Plane size={12} />
                        </div>
                        <span className="text-sm font-bold text-latam-navy">{ac.ac_registration}</span>
                      </div>
                      <StatusBadge status={ac.status} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">Modified At</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{new Date(ac.createdAt).toLocaleDateString()} {new Date(ac.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <button className="text-[9px] font-black uppercase text-latam-magenta hover:brightness-110 flex items-center gap-0.5">
                        Details <ChevronRight size={10} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-300 italic text-[10px] uppercase font-black tracking-widest">
                No activity logs found for this module
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50 border-t text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest">
            Showing last 10 transactions
          </div>
        </div>
      </div>
      )}
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
