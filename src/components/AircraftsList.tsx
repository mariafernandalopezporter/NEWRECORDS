import React from 'react';
import { Search, Filter, Download, Upload, Plane, ChevronRight, FileText, Pencil, Trash2, X, AlertCircle } from 'lucide-react';
import { Aircraft } from '../types';
import { StatusBadge } from './Dashboard';
import { cn } from '../lib/utils';
import { dataService } from '../services/dataService';
import { motion, AnimatePresence } from 'motion/react';

interface AircraftsListProps {
  aircrafts: Aircraft[];
  onViewAircraft: (id: string) => void;
  onEditAircraft: (id: string) => void;
  onDeleteAircraft: (id: string) => void;
  onDataImported?: () => void;
}

export const AircraftsList = ({ aircrafts, onViewAircraft, onEditAircraft, onDeleteAircraft, onDataImported }: AircraftsListProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filter, setFilter] = React.useState<Aircraft['status'] | 'all'>('all');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredAircrafts = aircrafts.filter(ac => {
    const matchesSearch = ac.ac_registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ac.ac_owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || ac.status === filter;
    return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    const headers = ["ID", "Owner", "Registration", "Type", "Base", "Status", "Created At"];
    const rows = filteredAircrafts.map(ac => [
      ac.id, ac.ac_owner, ac.ac_registration, ac.ac_type, ac.base_airport, ac.status, ac.createdAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fleet_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const [isImporting, setIsImporting] = React.useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        setIsImporting(true);
        await dataService.importFromCSV(text);
        if (onDataImported) onDataImported();
        setIsImporting(false);
        alert("Archivo importado con éxito.");
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display uppercase tracking-tight">AIRCRAFT REGISTRATIONS</h1>
        <div className="flex gap-2">
          <button 
            disabled={isImporting}
            onClick={exportToCSV}
            className="btn-magenta flex items-center gap-2"
          >
            <Download size={16} />
            <span>Exportar</span>
          </button>
        </div>
      </div>
      
      {/* Search and Table remains similar... */}

      <div className="card-latam">
        <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5 group-focus-within:text-latam-navy transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search by registration or owner..."
              className="input-latam pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${
                  filter === s 
                  ? 'bg-latam-navy text-white shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-100 hover:text-latam-navy'
                }`}
              >
                {s === 'all' ? 'All' : s === 'pending' ? 'Pending' : s === 'in_progress' ? 'In Progress' : 'Ready'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="text-[10px] text-slate-400 uppercase font-black border-b">
                <th className="p-4">Reg / Owner</th>
                <th className="p-4 text-center">Type</th>
                <th className="p-4 text-center">Base</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredAircrafts.length > 0 ? (
                filteredAircrafts.map((ac) => (
                  <tr key={ac.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-latam-navy group-hover:bg-latam-navy group-hover:text-white transition-colors">
                          <Plane size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-latam-navy leading-none underline decoration-latam-magenta/20 underline-offset-4">{ac.ac_registration}</p>
                            <span className={cn(
                              "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                              ac.activation_type === 'new_registry' ? 'bg-latam-navy text-white' :
                              ac.activation_type === 'base_change' ? 'bg-latam-magenta text-white' :
                              'bg-slate-900 text-white'
                            )}>
                              {ac.activation_type?.replace('_', ' ') || 'NEW REGISTRY'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase font-medium">{ac.ac_owner}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center text-xs font-medium text-slate-600">{ac.ac_type}</td>
                    <td className="p-4 text-center text-xs font-bold text-latam-navy">{ac.base_airport}</td>
                    <td className="p-4 text-center">
                      <StatusBadge status={ac.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => onEditAircraft(ac.id)}
                          className="p-2 text-slate-400 hover:text-latam-navy hover:bg-slate-100 rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => onDeleteAircraft(ac.id)}
                          className="p-2 text-slate-400 hover:text-latam-magenta hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => onViewAircraft(ac.id)}
                          className="text-[10px] font-black uppercase text-latam-magenta hover:brightness-110 tracking-widest flex items-center gap-1 ml-2"
                        >
                          Details <ChevronRight size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 italic text-sm">
                    No results found for your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
