import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Info, Settings, ShieldCheck, User, X, Copy, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Aircraft } from '../types';

const aircraftSchema = z.object({
  ac_owner: z.string().min(1, "A/C Owner es requerido"),
  ac_registration: z.string().min(1, "A/C Registration es requerido"),
  acr: z.string().min(1, "ACR es requerido"),
  ac_subtype: z.string().min(1, "A/C Subtype es requerido"),
  rotation_code: z.string().min(1, "Rot Code es requerido"),
  valid_from: z.string().min(1, "Valid From es requerida"),
  valid_to: z.string().min(1, "Valid To es requerida"),
  ac_type: z.string().min(1, "A/C Type es requerido"),
  rst: z.string().optional(),
  icao_subtype: z.string().optional(),
  base_airport: z.string().min(1, "Base Airport es requerido"),
  category: z.string().optional(),
  rff: z.string().optional(),
  manufacturer: z.string().optional(),
  man_serial: z.string().optional(),
  engine: z.string().optional(),
  engine_type: z.string().optional(),
  delivered: z.string().optional(),
  physical_j: z.number().optional().or(z.literal('')),
  physical_w: z.number().optional().or(z.literal('')),
  physical_y: z.number().optional().or(z.literal('')),
  remarks: z.string().optional(),
});

type AircraftFormData = z.infer<typeof aircraftSchema>;

interface AircraftFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  existingAircrafts: Aircraft[];
  externalAircrafts: Aircraft[];
  initialData?: Aircraft;
  mode?: 'create' | 'edit';
}

export const AircraftForm = ({ onSubmit, onCancel, existingAircrafts, externalAircrafts, initialData, mode = 'create' }: AircraftFormProps) => {
  const [showCloneSearch, setShowCloneSearch] = React.useState(false);
  const [cloneSearch, setCloneSearch] = React.useState('');
  const isEdit = mode === 'edit';
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AircraftFormData>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: initialData ? {
      ...initialData,
      physical_j: initialData.physical_j || '',
      physical_w: initialData.physical_w || '',
      physical_y: initialData.physical_y || '',
    } as any : undefined
  });

  const allAvailableForClone = [...existingAircrafts, ...externalAircrafts];
  const filteredForClone = allAvailableForClone.filter(ac => 
    ac.ac_registration.toLowerCase().includes(cloneSearch.toLowerCase()) ||
    ac.ac_owner.toLowerCase().includes(cloneSearch.toLowerCase())
  ).slice(0, 10);

  const handleClone = (ac: Aircraft) => {
    // Clone all data except the unique identity
    const { id, createdAt, checks, status, ac_registration, ...clonableData } = ac;
    
    // If it's an external aircraft, ensure physical seats are empty strings for the form
    const isExternal = ac.id.startsWith('ext');
    
    reset({
      ...clonableData,
      ac_registration: '', // Keep registration empty to avoid duplicates
      valid_from: '',
      valid_to: '',
      physical_j: isExternal ? '' : (ac.physical_j || ''),
      physical_w: isExternal ? '' : (ac.physical_w || ''),
      physical_y: isExternal ? '' : (ac.physical_y || ''),
      remarks: isExternal ? (ac.remarks || '') : (`Clonado de ${ac_registration}. ` + (ac.remarks || ''))
    } as any);
    setShowCloneSearch(false);
    setCloneSearch('');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display uppercase tracking-tight text-latam-navy">
            {isEdit ? 'Edit Aircraft Registry' : 'New Registry Activation'}
          </h1>
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">
            {isEdit ? 'Update existing fleet resource' : 'Manual Input or Database Clone Mode'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isEdit && (
            <button 
              type="button" 
              onClick={() => setShowCloneSearch(!showCloneSearch)}
              className="flex items-center gap-2 px-4 py-2 bg-latam-navy text-white rounded font-bold text-[10px] uppercase tracking-widest hover:brightness-110 shadow-sm transition-all"
            >
              <Copy size={14} />
              Clone Resource
            </button>
          )}
          <button type="button" onClick={onCancel} className="p-2 text-slate-300 hover:text-latam-magenta">
            <X size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCloneSearch && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card-latam p-6 bg-latam-navy text-white space-y-4 border-none">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  Resource Lookup Interface
                </h3>
                <span className="text-[8px] bg-latam-magenta px-2 py-0.5 rounded font-black tracking-widest">CLONE_MODE</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input 
                  type="text"
                  placeholder="Registry prefix or Owner name..."
                  className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded outline-none focus:ring-2 focus:ring-latam-magenta text-white placeholder:text-white/30 text-sm font-bold"
                  value={cloneSearch}
                  onChange={(e) => setCloneSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredForClone.map(ac => (
                  <button
                    key={ac.id}
                    type="button"
                    onClick={() => handleClone(ac)}
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-all text-left group"
                  >
                    <div>
                      <span className="block font-bold text-latam-magenta leading-none group-hover:underline">{ac.ac_registration}</span>
                      <span className="text-[9px] opacity-40 truncate block max-w-[180px] mt-1 uppercase font-bold">{ac.ac_owner}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase block mb-1 ${ac.id.startsWith('ext') ? 'bg-latam-slate text-white' : 'bg-white/20 text-white'}`}>
                        {ac.id.startsWith('ext') ? 'MASTER_SHEET' : 'LOCAL_DB'}
                      </span>
                    </div>
                  </button>
                ))}
                {cloneSearch && filteredForClone.length === 0 && (
                  <p className="text-white/50 text-[10px] uppercase font-black tracking-widest p-4">No match found in current directory.</p>
                )}
                {!cloneSearch && allAvailableForClone.length === 0 && (
                  <p className="text-white/50 text-[10px] uppercase font-black tracking-widest p-4 col-span-2">Registry repository is currently empty.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* General */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-latam-navy">
          <Info size={16} strokeWidth={3} />
          <h3 className="text-[11px] font-black uppercase tracking-widest">General</h3>
        </div>
        <div className="card-latam p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border border-slate-200">
          <FormGroup label="A/C Owner" required error={errors.ac_owner?.message}>
            <input {...register('ac_owner')} className="input-latam" />
          </FormGroup>
          <FormGroup label="A/C Registration" required error={errors.ac_registration?.message}>
            <input {...register('ac_registration')} className="input-latam" />
          </FormGroup>
          <FormGroup label="ACR" required error={errors.acr?.message}>
            <input {...register('acr')} className="input-latam" />
          </FormGroup>
          <FormGroup label="A/C Subtype" required error={errors.ac_subtype?.message}>
            <input {...register('ac_subtype')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Rot Code" required error={errors.rotation_code?.message}>
            <input {...register('rotation_code')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Valid From" required error={errors.valid_from?.message}>
            <input type="date" {...register('valid_from')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Valid To" required error={errors.valid_to?.message}>
            <input type="date" {...register('valid_to')} className="input-latam" />
          </FormGroup>
        </div>
      </section>

      {/* Aircraft Information */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-latam-navy">
          <Settings size={16} strokeWidth={3} />
          <h3 className="text-[11px] font-black uppercase tracking-widest">Aircraft Information</h3>
        </div>
        <div className="card-latam p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-200">
          <FormGroup label="A/C Type" required error={errors.ac_type?.message}>
            <input {...register('ac_type')} className="input-latam" />
          </FormGroup>
          <FormGroup label="A/C Subtype">
            <input {...register('ac_subtype')} className="input-latam opacity-50" readOnly />
          </FormGroup>
          <FormGroup label="RST">
            <input {...register('rst')} className="input-latam" />
          </FormGroup>
          <FormGroup label="ICAO Subtype">
            <input {...register('icao_subtype')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Base Airport" required error={errors.base_airport?.message}>
            <input {...register('base_airport')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Category">
            <input {...register('category')} className="input-latam" />
          </FormGroup>
        </div>
      </section>

      {/* Aircraft Specifications */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-latam-navy">
          <ShieldCheck size={16} strokeWidth={3} />
          <h3 className="text-[11px] font-black uppercase tracking-widest">Aircraft Specifications</h3>
        </div>
        <div className="card-latam p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-200">
          <FormGroup label="RFF">
            <input {...register('rff')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Manufacturer">
            <input {...register('manufacturer')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Man: SL#">
            <input {...register('man_serial')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Engine">
            <input {...register('engine')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Engine Type">
            <input {...register('engine_type')} className="input-latam" />
          </FormGroup>
          <FormGroup label="Delivered">
            <input {...register('delivered')} className="input-latam" />
          </FormGroup>
        </div>
      </section>

      {/* Physical Seat */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-latam-navy">
          <User size={16} strokeWidth={3} />
          <h3 className="text-[11px] font-black uppercase tracking-widest">Physical Seat</h3>
        </div>
        <div className="card-latam p-6 grid grid-cols-3 gap-6 border border-slate-200 bg-slate-50/30">
          <FormGroup label="J">
            <input type="number" {...register('physical_j', { valueAsNumber: true })} className="input-latam" />
          </FormGroup>
          <FormGroup label="W">
            <input type="number" {...register('physical_w', { valueAsNumber: true })} className="input-latam" />
          </FormGroup>
          <FormGroup label="Y">
            <input type="number" {...register('physical_y', { valueAsNumber: true })} className="input-latam" />
          </FormGroup>
        </div>
      </section>

      <div className="card-latam p-6">
        <FormGroup label="Observaciones / Remarks">
          <textarea {...register('remarks')} className="input-latam min-h-[100px]" placeholder="..." />
        </FormGroup>
      </div>

      <div className="flex items-center justify-end gap-4 pt-6">
        <button type="button" onClick={onCancel} className="px-8 py-3 rounded-lg text-gray-500 font-bold hover:bg-gray-100 transition-colors">
          Cancelar
        </button>
        <button type="submit" className="btn-primary px-12 py-3 flex items-center gap-2">
          <Save size={20} />
          {isEdit ? 'Guardar Cambios' : 'Registrar Matrícula'}
        </button>
      </div>
    </form>
  );
};

export const FormGroup = ({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string }) => (
  <div className="space-y-1.5 flex flex-col">
    <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
      {label}
      {required && <span className="text-latam-magenta">*</span>}
    </label>
    {children}
    {error && <span className="text-[9px] text-latam-magenta font-black uppercase tracking-tighter mt-1">{error}</span>}
  </div>
);
