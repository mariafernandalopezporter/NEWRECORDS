import React from 'react';
import { Plane, ChevronLeft, CheckCircle2, Clock, User, Calendar, MessageSquare, AlertCircle, MapPin, Lock, Database, ExternalLink, X, Pencil, Trash2 } from 'lucide-react';
import { Aircraft, AircraftChecks, AREA_PERMISSIONS } from '../types';
import { StatusBadge } from './Dashboard';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AircraftDetailProps {
  aircraft: Aircraft;
  onBack: () => void;
  onCheck: (area: keyof AircraftChecks, value?: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  userEmail: string;
}

const SYSTEM_GROUPS: { name: string; areas: (keyof AircraftChecks)[] }[] = [
  { 
    name: 'Gestión', 
    areas: ['jira_ticket', 'diccionario'] 
  },
  { 
    name: 'OPS', 
    areas: ['ifn', 'jta', 'limops', 'aircom', 'sicco', 'ops_flt', 'videowall'] 
  },
  { 
    name: 'Dispatch', 
    areas: ['despacho'] 
  },
  { 
    name: 'Crew', 
    areas: ['crew'] 
  }
];

const AREA_LABELS: Record<keyof AircraftChecks, string> = {
  ifn: 'IFN',
  limops: 'LIMOPS',
  jta: 'JTA',
  aircom: 'AIRCOM',
  sicco: 'SICCO',
  ops_flt: 'OPS FLE',
  despacho: 'Sistemas DESPACHO',
  mantenedor: 'MANTENEDOR',
  videowall: 'VIDEOWALL',
  crew: 'CREW',
  diccionario: 'DICCIONARIO',
  jira_ticket: 'Ticket Jira'
};

export const AircraftDetail = ({ aircraft, onBack, onCheck, onEdit, onDelete, userEmail }: AircraftDetailProps) => {
  const [showJiraModal, setShowJiraModal] = React.useState(false);
  const [tempJiraValue, setTempJiraValue] = React.useState('');
  
  const isChangeActivation = aircraft.activation_type === 'base_change' || aircraft.activation_type === 'operator_change';
  
  const handleAreaCheck = (areaId: keyof AircraftChecks) => {
    const isAllowed = AREA_PERMISSIONS[areaId].some(email => email.toLowerCase().trim() === userEmail.toLowerCase().trim());
    if (!isAllowed) {
      alert(`Access Restricted. Area ${areaId.toUpperCase()} requires specific authorization.`);
      return;
    }

    if (areaId === 'jira_ticket') {
      setTempJiraValue(aircraft.checks[areaId]?.value || "");
      setShowJiraModal(true);
    } else {
      onCheck(areaId);
    }
  };

  const handleSaveJira = () => {
    onCheck('jira_ticket', tempJiraValue);
    setShowJiraModal(false);
  };

  // Filter groups to only show systems with at least one active area in this activation type
  const activeGroups = SYSTEM_GROUPS.map(group => {
    const relevantAreas = isChangeActivation 
      ? group.areas.filter(id => ['ifn', 'jta', 'diccionario', 'jira_ticket'].includes(id))
      : group.areas;
    
    if (relevantAreas.length === 0) return null;

    const checkedCount = relevantAreas.filter(id => aircraft.checks[id]?.checked).length;
    const progress = Math.round((checkedCount / relevantAreas.length) * 100);

    return { ...group, areas: relevantAreas, progress };
  }).filter(g => g !== null) as ({ name: string, areas: (keyof AircraftChecks)[], progress: number })[];

  const globalProgress = Math.round(
    (activeGroups.reduce((acc, g) => acc + g.progress, 0) / activeGroups.length) || 0
  );

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Navigation and Top Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-latam-navy transition-all group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Dashboard Overview
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => onEdit(aircraft.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-latam-navy hover:text-white transition-all"
              title="Editar Matrícula"
            >
              <Pencil size={12} />
              Editar
            </button>
            <button 
              type="button"
              onClick={() => onDelete(aircraft.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-latam-magenta hover:text-white transition-all"
              title="Eliminar Matrícula"
            >
              <Trash2 size={12} />
              Eliminar
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Node Connected</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-8 flex items-center gap-6">
          <div className="w-20 h-20 bg-latam-navy text-white rounded-2xl shadow-xl flex items-center justify-center transform hover:rotate-3 transition-transform cursor-default">
            <Plane size={40} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-4 flex-wrap mb-2">
              <h1 className="text-5xl font-black font-display tracking-tighter text-latam-navy uppercase leading-none">
                {aircraft.ac_registration}
              </h1>
              <StatusBadge status={aircraft.status} />
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>{aircraft.ac_owner}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              <span>{aircraft.ac_type}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              <span className="bg-slate-100 px-2 py-0.5 rounded text-latam-magenta">{aircraft.activation_type}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT: System Summary (The Design Request) */}
        <div className="lg:col-span-12">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-latam-magenta text-white rounded-xl shadow-lg shadow-latam-magenta/20 flex items-center justify-center">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black font-display tracking-widest text-latam-navy uppercase leading-none">
                    Estado de Activación Por Sistemas
                  </h2>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-latam-navy font-display">{globalProgress}%</span>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
              {activeGroups.map((group, idx) => (
                <div key={idx} className="space-y-4 group">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-latam-navy transition-colors">{group.name}</span>
                    <span className="text-sm font-black text-latam-navy">{group.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                      style={{ width: `${group.progress}%` }} 
                    />
                  </div>
                  
                  {/* Sub-areas list under each system */}
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {group.areas.map(areaId => (
                      <AreaCheckCard 
                        key={areaId}
                        label={AREA_LABELS[areaId]}
                        checked={!!aircraft.checks[areaId]?.checked}
                        timestamp={aircraft.checks[areaId]?.timestamp}
                        user={aircraft.checks[areaId]?.user}
                        value={aircraft.checks[areaId]?.value}
                        isAllowed={AREA_PERMISSIONS[areaId].some(email => email.toLowerCase() === userEmail.toLowerCase())}
                        onCheck={() => {
                          // Allow clicking Jira Ticket even if checked to update link, 
                          // but others only if not checked
                          if (areaId === 'jira_ticket' || !aircraft.checks[areaId]?.checked) {
                            handleAreaCheck(areaId);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-center border-t border-slate-100">
               <div className="flex items-center gap-8">
                 <LegendItem color="bg-emerald-500" label="Validated" />
                 <LegendItem color="bg-slate-200" label="Pending" />
                 <LegendItem color="bg-red-500" label="Action Required" />
               </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showJiraModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJiraModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-latam-magenta text-white rounded-lg">
                    <Database size={18} />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-latam-navy">Jira Ticket Asset</h3>
                </div>
                <button onClick={() => setShowJiraModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Jira Link or ID</label>
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Eje: OPS-2024-123 o link completo"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-latam-navy font-bold placeholder:text-slate-300 focus:border-latam-magenta outline-none transition-all"
                    value={tempJiraValue}
                    onChange={(e) => setTempJiraValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveJira()}
                  />
                  <p className="mt-3 text-[10px] text-slate-400 leading-relaxed italic">
                    Este campo es visible para todos los validadores de la red. Una vez guardado, el check se marcará como validado.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowJiraModal(false)}
                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveJira}
                    className="flex-1 py-4 bg-latam-magenta text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-latam-magenta/30 hover:brightness-110 transition-all"
                  >
                    Validar Checklist
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MetaCard = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center gap-1 group hover:border-latam-magenta transition-colors">
    <span className="flex items-center gap-2 text-[9px] uppercase font-black text-slate-400 tracking-widest">
      {icon} {label}
    </span>
    <div className="text-latam-navy font-black text-sm tracking-tighter uppercase truncate">
      {value}
    </div>
  </div>
);

const AreaCheckCard: React.FC<{ label: string; checked: boolean; timestamp?: string; user?: string; onCheck: () => void; isAllowed: boolean; value?: string }> = ({ label, checked, timestamp, user, onCheck, isAllowed, value }) => (
  <div 
    onClick={onCheck}
    className={cn(
      "p-2.5 rounded-lg border transition-all flex items-center justify-between group/card select-none",
      checked 
      ? 'bg-emerald-50/50 border-emerald-100 sm:hover:bg-emerald-100/50' 
      : 'bg-white border-slate-100 sm:hover:border-latam-magenta sm:hover:shadow-md cursor-pointer'
    )}
  >
    <div className="flex items-center gap-2.5 overflow-hidden w-full">
      <div className={cn(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
        checked ? "bg-emerald-500 border-emerald-500" : "border-slate-200"
      )}>
        {checked && <CheckCircle2 size={10} className="text-white" strokeWidth={4} />}
      </div>
      <div className="flex flex-col min-w-0 pr-2">
        <span className={cn(
          "text-[10px] font-bold leading-tight truncate", 
          checked ? "text-emerald-900" : "text-slate-600"
        )}>
          {label}
        </span>
        {checked && (
          <div className="flex flex-col mt-0.5">
            <span className="text-[8px] text-emerald-600/70 font-mono italic truncate">
              {user?.split('@')[0]}
            </span>
            {value && (
              <a 
                href={value.startsWith('http') ? value : `https://${value}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[8px] text-latam-magenta underline font-black truncate flex items-center gap-0.5 mt-0.5"
              >
                TICKET <ExternalLink size={8} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
    {!checked && !isAllowed && (
      <Lock size={10} className="text-slate-200 shrink-0" />
    )}
  </div>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${color}`} />
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

const DataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-end border-b border-slate-50 pb-2">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    <span className="text-xs font-bold text-latam-navy tracking-tighter">{value || '--'}</span>
  </div>
);

const CapacityBox = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100 flex flex-col items-center">
    <span className="text-[8px] font-black text-slate-400 mb-1 leading-none tracking-tighter">{label}</span>
    <span className={`block w-full font-black py-1 rounded-lg text-white text-[10px] leading-none ${color}`}>{value}</span>
  </div>
);
