import React from 'react';
import { Plane, AlertCircle, CheckCircle2, Clock, Users, MapPin, Settings, Database, Bell, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { Aircraft, AlertRequest } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  aircrafts: Aircraft[];
  alertRequests: AlertRequest[];
  onViewAircraft: (id: string) => void;
}

export const Dashboard = ({ aircrafts, alertRequests, onViewAircraft }: DashboardProps) => {
  const stats = {
    total: aircrafts.length,
    pending: aircrafts.filter(a => a.status === 'pending').length,
    inProgress: aircrafts.filter(a => a.status === 'in_progress').length,
    completed: aircrafts.filter(a => a.status === 'completed').length,
    pendingIFN: alertRequests.filter(r => r.type === 'IFN' && r.status === 'pending').length,
    pendingJTA: alertRequests.filter(r => r.type === 'JTA' && r.status === 'pending').length,
  };

  const recentAircrafts = [...aircrafts].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-latam-navy uppercase tracking-tight">Main Fleet Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium opacity-70">Supervisa el estado de las activaciones de aeronaves en tiempo real.</p>
        </div>
        <div className="flex bg-white p-1 rounded border border-slate-200 shadow-sm">
          <div className="px-5 py-2 text-center border-r border-slate-100">
            <span className="block text-xl font-bold text-latam-navy leading-none">{stats.total}</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black mt-1 block">Total Registry</span>
          </div>
          <div className="px-5 py-2 text-center">
            <span className="block text-xl font-bold text-latam-magenta leading-none">{stats.pending}</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-latam-magenta/60 font-black mt-1 block">Pending Action</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard 
          label="Completed Units" 
          value={stats.completed} 
          icon={<CheckCircle2 size={24} />}
          color="border-emerald-500"
          valueColor="text-emerald-600"
        />
        <StatCard 
          label="In Progress Checks" 
          value={stats.inProgress} 
          icon={<Clock size={24} />}
          color="border-amber-500"
          valueColor="text-amber-600"
        />
        <StatCard 
          label="Awaiting Activation" 
          value={stats.pending} 
          icon={<AlertCircle size={24} />}
          color="border-latam-magenta"
          valueColor="text-latam-magenta"
        />
        <StatCard 
          label="Pending IFN Alerts" 
          value={stats.pendingIFN} 
          icon={<Bell size={24} />}
          color="border-latam-navy"
          valueColor="text-latam-navy"
        />
        <StatCard 
          label="Pending JTA Alerts" 
          value={stats.pendingJTA} 
          icon={<ShieldAlert size={24} />}
          color="border-latam-navy"
          valueColor="text-latam-navy"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="card-latam border border-slate-200">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h4 className="font-bold text-latam-navy text-xs uppercase tracking-widest">Actividad Reciente & Status</h4>
            <button 
              onClick={() => onViewAircraft('all')}
              className="text-[10px] font-bold text-latam-magenta uppercase tracking-widest hover:brightness-110"
            >
              Exportar LOG
            </button>
          </div>
          <div className="overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-[10px] text-slate-400 uppercase font-black border-b">
                    <th className="p-4">Event Type</th>
                    <th className="p-4">Registration</th>
                    <th className="p-4">Owner</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentAircrafts.length > 0 ? (
                    recentAircrafts.map((ac) => (
                      <tr 
                         key={ac.id} 
                         onClick={() => onViewAircraft(ac.id)}
                         className="border-b hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="p-4">
                          <span className={cn(
                            "text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter",
                            ac.activation_type === 'new_registry' ? 'bg-latam-navy text-white' :
                            ac.activation_type === 'base_change' ? 'bg-latam-magenta text-white' :
                            'bg-slate-900 text-white'
                          )}>
                            {ac.activation_type?.replace('_', ' ') || 'NEW REGISTRY'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-latam-navy">{ac.ac_registration}</td>
                        <td className="p-4 text-xs font-medium text-slate-500">{ac.ac_owner}</td>
                        <td className="p-4">
                          <StatusBadge status={ac.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400 text-xs italic">No activity recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Systems Distribution */}
        <div className="card-latam p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Settings size={60} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-latam-navy mb-6 flex items-center gap-2">
            <Database size={16} className="text-latam-magenta" />
            Estado de Activación por Sistemas
          </h3>
          <div className="space-y-5">
            <SystemProgress 
              label="Gestión" 
              keys={['jira_ticket', 'diccionario']} 
              aircrafts={aircrafts} 
            />
            <SystemProgress 
              label="OPS" 
              keys={['ifn', 'jta', 'limops', 'aircom', 'sicco', 'ops_flt', 'videowall']} 
              aircrafts={aircrafts} 
            />
            <SystemProgress 
              label="Dispatch" 
              keys={['despacho']} 
              aircrafts={aircrafts} 
            />
            <SystemProgress 
              label="Crew" 
              keys={['crew']} 
              aircrafts={aircrafts} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, icon, valueColor }: { label: string; value: number; icon: React.ReactNode; color: string; valueColor: string }) => (
  <div className={`bg-white p-6 rounded shadow-sm border-b-4 ${color} relative overflow-hidden`}>
    <div className="absolute top-4 right-4 opacity-10 text-slate-900">
      {icon}
    </div>
    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.1em] mb-1">{label}</p>
    <h3 className={`text-4xl font-bold font-display ${valueColor}`}>{value.toLocaleString()}</h3>
  </div>
);

const SystemProgress = ({ label, keys, aircrafts }: { label: string; keys: (keyof Aircraft['checks'])[]; aircrafts: Aircraft[] }) => {
  const calculateProgress = () => {
    if (aircrafts.length === 0) return 0;
    const totalExpected = aircrafts.length * keys.length;
    const totalCompleted = aircrafts.reduce((acc, ac) => {
      return acc + keys.filter(k => ac.checks[k]?.checked).length;
    }, 0);
    return Math.round((totalCompleted / totalExpected) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{label}</span>
        <span className="text-[10px] font-bold text-latam-navy leading-none">{progress}%</span>
      </div>
      <div className="h-1.5 bg-slate-50 rounded-sm overflow-hidden border border-slate-100/50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn(
            "h-full transition-colors",
            progress === 100 ? "bg-emerald-500" : progress > 50 ? "bg-latam-navy" : "bg-slate-300"
          )}
        />
      </div>
    </div>
  );
};

export const StatusBadge = ({ status }: { status: Aircraft['status'] }) => {
  const styles = {
    pending: "bg-red-50 text-red-700 border-red-100",
    in_progress: "bg-amber-50 text-amber-700 border-amber-100",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <span className={`status-badge border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
