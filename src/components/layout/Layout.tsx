import React from 'react';
import { LayoutDashboard, Plane, PlusCircle, MapPin, Repeat, Bell, ChevronRight, LogOut, Menu, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  key?: React.Key;
}

const SidebarItem = ({ icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full px-4 py-3 gap-3 transition-colors relative group",
      active ? "text-white bg-white/10 border-l-4 border-latam-magenta" : "text-white/70 hover:text-white hover:bg-white/5"
    )}
  >
    <div className={cn("transition-transform duration-200", active && "scale-110")}>
      {icon}
    </div>
    {!collapsed && <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">{label}</span>}
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail: string;
  notificationsCount: number;
  logout: () => void;
}

export const Layout = ({ children, activeTab, setActiveTab, userEmail, notificationsCount, logout }: LayoutProps) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'aircrafts', label: 'AIRCRAFT REGISTRATIONS', icon: <Plane size={20} /> },
    { id: 'new_aircraft', label: 'Nueva Matrícula', icon: <PlusCircle size={20} /> },
    { id: 'base_change', label: 'Cambio de Base', icon: <MapPin size={20} /> },
    { id: 'operator_change', label: 'Cambio de Operador', icon: <Repeat size={20} /> },
    { id: 'ifn_alerts', label: 'Requerimientos IFN', icon: <Bell size={20} /> },
    { id: 'jta_alerts', label: 'Requerimientos JTA', icon: <AlertCircle size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-latam-gray overflow-hidden">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 260 }}
        className="hidden md:flex flex-col bg-latam-navy text-white z-30"
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-latam-navy shadow-sm">
            <Plane size={18} weight="bold" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col font-display leading-none"
            >
              <h1 className="text-lg font-bold tracking-tight text-white mb-0">LATAM</h1>
              <span className="text-[10px] opacity-60 font-light tracking-[0.2em] uppercase">AeroOps</span>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 mt-4">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id || (item.id === 'aircrafts' && activeTab === 'aircraft_detail')}
              collapsed={collapsed}
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
            />
          ))}
        </nav>

          <div className={cn("px-6 py-4 border-t border-white/10 flex flex-col gap-4", collapsed && "items-center")}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
              {!collapsed && <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Sheets Linked</span>}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-latam-slate flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {userEmail ? userEmail.substring(0, 2) : '??'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-white truncate">{userEmail ? userEmail.split('@')[0] : 'Unknown'}</span>
                  <span className="text-[8px] text-white/40 uppercase tracking-wider">User</span>
                </div>
              </div>
            )}
            {!collapsed && <button onClick={logout} className="flex items-center gap-2 text-[8px] text-white/40 mt-1 uppercase tracking-widest hover:text-latam-magenta transition-colors">
              <LogOut size={10} />
              Cerrar Sesión
            </button>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full py-2 hover:bg-white/5 text-white/20 flex justify-center transition-colors"
          >
            <ChevronRight className={cn("transition-transform", !collapsed && "rotate-180")} size={16} />
          </button>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute bottom-0 left-0 right-0 h-1 accent-line z-30" />
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-latam-navy hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="text-latam-navy">Main Fleet Dashboard</span>
              <span className="opacity-30">/</span>
              <span className="text-slate-600">
                {menuItems.find(i => i.id === activeTab)?.label || 
                 (activeTab === 'aircraft_detail' ? 'Aircraft Detail' : 
                  activeTab === 'notifications' ? 'Notifications' : '')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-gray-400 hover:text-latam-navy transition-colors"
            >
              <Bell size={22} />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-latam-magenta text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                  {notificationsCount}
                </span>
              )}
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-slate-400">{userEmail}</span>
            <button 
              onClick={logout}
              className="p-2 text-gray-400 hover:text-latam-magenta transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* View Surface */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-latam-navy text-white z-50 flex flex-col md:hidden"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-latam-gold rounded-xl flex items-center justify-center text-latam-navy font-bold">
                    <Plane size={24} />
                  </div>
                  <div className="flex flex-col font-display">
                    <span className="text-sm opacity-70 leading-none uppercase tracking-tighter">OPS</span>
                    <span className="text-xl font-bold leading-tight tracking-tighter">NEWAC&Changes</span>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 text-white/50">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 mt-4">
                {menuItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                  />
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
