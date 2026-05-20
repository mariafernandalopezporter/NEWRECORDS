import React from 'react';
import { Plane, ChevronLeft, CheckCircle2, Clock, User, Calendar, MessageSquare, AlertCircle, MapPin, Lock, Database, ExternalLink, X, Pencil, Trash2, Settings } from 'lucide-react';
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
    name: 'Level 1: Gestión Crítica', 
    areas: ['jira_ticket', 'ifn', 'jta', 'diccionario'] 
  },
  { 
    name: 'Level 2: Integración Sistemas', 
    areas: ['videowall', 'sicco', 'despacho', 'crew'] 
  },
  { 
    name: 'Sistemas Complementarios', 
    areas: ['limops', 'aircom', 'ops_flt', 'mantenedor'] 
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

  const l1Areas: (keyof AircraftChecks)[] = ['jira_ticket', 'ifn', 'jta', 'diccionario'];
  const isL1Complete = l1Areas.every(id => aircraft.checks[id]?.checked);

  // Helper to check if previous area in sequence is checked
  const isPreviousChecked = (areaId: keyof AircraftChecks) => {
    const idx = l1Areas.indexOf(areaId);
    if (idx <= 0) return true; // Jira is first, or not in L1
    const prevAreaId = l1Areas[idx - 1];
    return !!aircraft.checks[prevAreaId]?.checked;
  };

  // Filter groups to only show systems with at least one active area in this activation type
  const activeGroups = SYSTEM_GROUPS.map(group => {
    const relevantAreas = isChangeActivation 
      ? group.areas.filter(id => l1Areas.includes(id))
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
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 text-latam-navy">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT: System Summary (The Design Request) */}
        <div className="lg:col-span-12">
          {/* Status/Checklist Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden mb-10">
            {!isL1Complete && !isChangeActivation && (
              <div className="bg-amber-50 border-b border-amber-100 p-3 flex items-center justify-center gap-2">
                <AlertCircle size={14} className="text-amber-600" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-900">
                  ⚠️ Atención: Complete los procesos de Level 1 para habilitar Level 2 y Complementarios
                </span>
              </div>
            )}
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
              {activeGroups.map((group, idx) => {
                const isLocked = !isL1Complete && group.name.includes('Level 2') || group.name.includes('Adicionales') || group.name.includes('Sistemas Complementarios');
                
                return (
                  <div key={idx} className={cn("space-y-4 group", isLocked && "opacity-60")}>
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-latam-navy transition-colors">{group.name}</span>
                        {isLocked && <Lock size={12} className="text-slate-300" />}
                      </div>
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
                      {group.areas.map(areaId => {
                        const isL1Area = l1Areas.includes(areaId);
                        const isSequenceLocked = isL1Area && !isPreviousChecked(areaId);
                        const finalLocked = isLocked || isSequenceLocked;

                        return (
                          <AreaCheckCard 
                            key={areaId}
                            label={AREA_LABELS[areaId]}
                            checked={!!aircraft.checks[areaId]?.checked}
                            timestamp={aircraft.checks[areaId]?.timestamp}
                            user={aircraft.checks[areaId]?.user}
                            value={aircraft.checks[areaId]?.value}
                            isAllowed={AREA_PERMISSIONS[areaId].some(email => email.toLowerCase() === userEmail.toLowerCase()) && (!finalLocked || aircraft.checks[areaId]?.checked)}
                            onCheck={() => {
                              if (finalLocked && !aircraft.checks[areaId]?.checked) {
                                if (isSequenceLocked) {
                                  alert(`Please complete the checks in order: ${l1Areas.join(' -> ').toUpperCase().replace(/_/g, ' ')}`);
                                } else {
                                  alert("Please complete Level 1 checks first (Jira, IFN, JTA, Diccionario).");
                                }
                                return;
                              }
                              if (areaId === 'jira_ticket' || !aircraft.checks[areaId]?.checked) {
                                handleAreaCheck(areaId);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-center border-t border-slate-100">
               <div className="flex items-center gap-8">
                 <LegendItem color="bg-emerald-500" label="Validated" />
                 <LegendItem color="bg-slate-200" label="Pending" />
                 <LegendItem color="bg-red-500" label="Action Required" />
               </div>
            </div>
          </div>

          {/* New technical details section */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/10">
              <div className="w-10 h-10 bg-latam-navy text-white rounded-xl flex items-center justify-center">
                <Settings size={20} />
              </div>
              <h2 className="text-lg font-black font-display tracking-widest text-latam-navy uppercase leading-none">
                Technical Mastery Overview
              </h2>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {/* Technical Group */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-latam-magenta">Technical classification</h3>
                <div className="space-y-3">
                  <DataRow label="Name/ID" value={aircraft.name} />
                  <DataRow label="Rot Code" value={aircraft.rotation_code} />
                  <DataRow label="ACR" value={aircraft.acr} />
                  <DataRow label="ICAO Subtype" value={aircraft.icao_subtype} />
                  <DataRow label="RST" value={aircraft.rst} />
                  <DataRow label="Local Type" value={aircraft.local_type} />
                  <DataRow label="Local Subtype" value={aircraft.local_subtype} />
                  <DataRow label="Active" value={aircraft.active} />
                </div>
              </div>

              {/* Engineering Group */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-latam-magenta">Engineering & Specs</h3>
                <div className="space-y-3">
                  <DataRow label="Manufacturer" value={aircraft.manufacturer} />
                  <DataRow label="Serial" value={aircraft.man_serial} />
                  <DataRow label="Engine" value={aircraft.engine} />
                  <DataRow label="Engine Type" value={aircraft.engine_type} />
                  <DataRow label="Delivered" value={aircraft.delivered} />
                  <DataRow label="ETOPS" value={aircraft.etops} />
                  <DataRow label="Range" value={aircraft.flight_range} />
                  <DataRow label="SELCAL" value={aircraft.selcal} />
                  <DataRow label="Performance Ind." value={aircraft.perf_index} />
                </div>
              </div>

              {/* Performance / Weights Group */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-latam-magenta">Weights & limits</h3>
                <div className="space-y-3">
                  <DataRow label="Max DOW" value={aircraft.max_dow} />
                  <DataRow label="Max ZFW" value={aircraft.max_zfw} />
                  <DataRow label="Max RW" value={aircraft.max_rw} />
                  <DataRow label="Max TOW" value={aircraft.max_tow} />
                  <DataRow label="Max LW" value={aircraft.max_lw} />
                  <DataRow label="Hold (Vol)" value={aircraft.hold_cap_vol} />
                  <DataRow label="Hold (Wgt)" value={aircraft.hold_cap_wgt} />
                  <DataRow label="Tail Wind" value={aircraft.tail_wind} />
                  <DataRow label="Cross Wind" value={aircraft.cross_wind} />
                </div>
              </div>

              {/* Operational Group */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-latam-magenta">Operational Data</h3>
                <div className="space-y-3">
                  <DataRow label="Base Airport" value={aircraft.base_airport} />
                  <DataRow label="Terminal" value={aircraft.terminal} />
                  <DataRow label="Stand" value={aircraft.stand} />
                  <DataRow label="Gate" value={aircraft.gate} />
                  <DataRow label="FOB (Dep)" value={aircraft.fob_dep} />
                  <DataRow label="Est. FOB" value={aircraft.est_fob} />
                  <DataRow label="Jump Seats (Cab)" value={aircraft.cabin_jump_seat} />
                  <DataRow label="Jump Seats (Cock)" value={aircraft.cockpit_jump_seat} />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-100">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Towing Operations</span>
                <div className="text-[11px] font-bold text-latam-navy space-y-1">
                  <div>Start: {aircraft.towing_start_position || '--'}</div>
                  <div>End: {aircraft.towing_end_position || '--'}</div>
                  <div className="text-slate-400 font-mono italic">{aircraft.towing_date_time || '--'}</div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Ref. Tracking</span>
                <div className="text-[11px] font-bold text-latam-navy space-y-1">
                  <div>Next ID: {aircraft.next_info_id || '--'}</div>
                  <div>Last Flight: {aircraft.last_flight_id || '--'}</div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Metadata Audit</span>
                <div className="text-[11px] font-bold text-latam-navy space-y-1">
                  <div>Updated at: {aircraft.updated_time || '--'}</div>
                  <div>Updated by: {aircraft.updated_by || '--'}</div>
                </div>
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
