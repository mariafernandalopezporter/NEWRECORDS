import React from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/Dashboard';
import { AircraftsList } from './components/AircraftsList';
import { AircraftForm } from './components/AircraftForm';
import { ChangeForms } from './components/ChangeForms';
import { AircraftDetail } from './components/AircraftDetail';
import { AlertRequestSection } from './components/AlertRequestSection';
import { dataService } from './services/dataService';
import { Aircraft, AircraftChecks, Notification as AppNotification, AlertRequest } from './types';
import { Bell, CheckCircle, Info, Plane, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab ] = React.useState('dashboard');
  const [selectedAircraftId, setSelectedAircraftId] = React.useState<string | null>(null);
  const [editAircraftId, setEditAircraftId] = React.useState<string | null>(null);
  const [aircrafts, setAircrafts] = React.useState<Aircraft[]>([]);
  const [externalAircrafts, setExternalAircrafts] = React.useState<Aircraft[]>([]);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [alertRequests, setAlertRequests] = React.useState<AlertRequest[]>([]);
  const userEmail = "mariafernanda.lopez@latam.com";

  React.useEffect(() => {
    loadData();
    dataService.fetchExternalAircrafts().then(setExternalAircrafts);
  }, []);

  const loadData = async () => {
    const [fetchedAircrafts, fetchedNotifications, fetchedAlertRequests] = await Promise.all([
      dataService.getAircrafts(),
      dataService.getNotifications(),
      dataService.getAlertRequests()
    ]);
    setAircrafts(fetchedAircrafts);
    setNotifications(fetchedNotifications);
    setAlertRequests(fetchedAlertRequests);
  };

  const handleCreateAircraft = async (data: any) => {
    await dataService.addAircraft(data, userEmail);
    await loadData();
    setActiveTab('aircrafts');
  };

  const handleEditAircraft = async (data: any) => {
    if (editAircraftId) {
      await dataService.updateAircraft(editAircraftId, data, userEmail);
      await loadData();
      setEditAircraftId(null);
      setActiveTab('aircrafts');
    }
  };

  const handleDeleteAircraft = async (id: string) => {
    // Note: window.confirm might be blocked in some iframe environments
    await dataService.deleteAircraft(id);
    await loadData();
  };

  const handleBaseChange = async (data: any) => {
    await dataService.addBaseChange(data, userEmail);
    await loadData();
    setActiveTab('dashboard');
  };

  const handleOperatorChange = async (data: any) => {
    await dataService.addOperatorChange(data, userEmail);
    await loadData();
    setActiveTab('dashboard');
  };

  const handleCreateAlertRequest = async (data: any) => {
    await dataService.addAlertRequest({ ...data, requesterEmail: userEmail });
    await loadData();
  };

  const handleCompleteAlertRequest = async (id: string) => {
    await dataService.updateAlertRequestStatus(id, userEmail);
    await loadData();
  };

  const handleCancelAlertRequest = async (id: string) => {
    await dataService.cancelAlertRequest(id, userEmail);
    await loadData();
  };

  const handleCheckArea = async (area: keyof AircraftChecks, value?: string) => {
    if (selectedAircraftId) {
      await dataService.updateCheck(selectedAircraftId, area, userEmail, value);
      await loadData();
    }
  };

  const handleViewAircraft = (id: string) => {
    setSelectedAircraftId(id);
    setActiveTab('aircraft_detail');
  };

  const handleOpenEdit = (id: string) => {
    setEditAircraftId(id);
    setActiveTab('edit_aircraft');
  };

  const selectedAircraft = aircrafts.find(a => a.id === selectedAircraftId);
  const editAircraft = aircrafts.find(a => a.id === editAircraftId);
  const unreadCount = notifications.filter(n => !n.read_by.includes(userEmail)).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard aircrafts={aircrafts} alertRequests={alertRequests} onViewAircraft={handleViewAircraft} />;
      case 'aircrafts':
        return <AircraftsList 
          aircrafts={aircrafts} 
          onViewAircraft={handleViewAircraft} 
          onEditAircraft={handleOpenEdit}
          onDeleteAircraft={handleDeleteAircraft}
        />;
      case 'new_aircraft':
        return <AircraftForm 
          onSubmit={handleCreateAircraft} 
          onCancel={() => setActiveTab('dashboard')} 
          existingAircrafts={aircrafts} 
          externalAircrafts={externalAircrafts}
        />;
      case 'edit_aircraft':
        if (!editAircraft) return <p>Aeronave no encontrada.</p>;
        
        if (editAircraft.activation_type === 'new_registry') {
          return (
            <AircraftForm 
              onSubmit={handleEditAircraft} 
              onCancel={() => setActiveTab('aircrafts')} 
              existingAircrafts={aircrafts} 
              externalAircrafts={externalAircrafts}
              initialData={editAircraft}
              mode="edit"
            />
          );
        } else {
          return (
            <ChangeForms 
              type={editAircraft.activation_type === 'base_change' ? 'base' : 'operator'}
              onSubmit={handleEditAircraft}
              aircrafts={aircrafts}
              onViewAircraft={handleViewAircraft}
              initialData={editAircraft}
              mode="edit"
              onCancel={() => setActiveTab('aircrafts')}
            />
          );
        }
      case 'base_change':
        return (
          <ChangeForms 
            type="base" 
            onSubmit={handleBaseChange} 
            aircrafts={aircrafts} 
            onViewAircraft={(id) => {
              setSelectedAircraftId(id);
              setActiveTab('aircraft_detail');
            }}
          />
        );
      case 'operator_change':
        return (
          <ChangeForms 
            type="operator" 
            onSubmit={handleOperatorChange} 
            aircrafts={aircrafts}
            onViewAircraft={(id) => {
              setSelectedAircraftId(id);
              setActiveTab('aircraft_detail');
            }}
          />
        );
      case 'ifn_alerts':
        return (
          <AlertRequestSection 
            type="IFN" 
            requests={alertRequests} 
            onSubmit={handleCreateAlertRequest} 
            onComplete={handleCompleteAlertRequest}
            onCancel={handleCancelAlertRequest}
            userEmail={userEmail}
          />
        );
      case 'jta_alerts':
        return (
          <AlertRequestSection 
            type="JTA" 
            requests={alertRequests} 
            onSubmit={handleCreateAlertRequest} 
            onComplete={handleCompleteAlertRequest}
            onCancel={handleCancelAlertRequest}
            userEmail={userEmail}
          />
        );
      case 'aircraft_detail':
        return selectedAircraft ? (
          <AircraftDetail 
            aircraft={selectedAircraft} 
            onBack={() => setActiveTab('aircrafts')} 
            onCheck={handleCheckArea}
            onEdit={handleOpenEdit}
            onDelete={async (id) => {
              await handleDeleteAircraft(id);
              setActiveTab('aircrafts');
            }}
            userEmail={userEmail}
          />
        ) : <p>Aeronave no encontrada.</p>;
      case 'notifications':
        return <NotificationsList notifications={notifications} userEmail={userEmail} onMarkRead={async (id) => {
          await dataService.markNotificationRead(id, userEmail);
          loadData();
        }} />;
      default:
        return <Dashboard aircrafts={aircrafts} alertRequests={alertRequests} onViewAircraft={handleViewAircraft} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userEmail={userEmail}
      notificationsCount={unreadCount}
    >
      {renderContent()}
    </Layout>
  );
}

const NotificationsList = ({ notifications, userEmail, onMarkRead }: { 
  notifications: AppNotification[], 
  userEmail: string,
  onMarkRead: (id: string) => void 
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-bold font-display uppercase tracking-tight text-latam-navy">System Notifications</h1>
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Real-time alerts for fleet status updates</p>
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n) => {
            const isRead = n.read_by.includes(userEmail);
            return (
              <motion.div 
                layout
                key={n.id} 
                onClick={() => onMarkRead(n.id)}
                className={cn(
                  "card-latam p-4 flex gap-4 items-center cursor-pointer transition-all border",
                  !isRead ? 'border-latam-navy bg-white shadow-md' : 'border-slate-200 bg-slate-50 opacity-60'
                )}
              >
                <div className={cn(
                  "p-2.5 rounded shadow-sm",
                  n.type === 'new_aircraft' ? 'bg-latam-navy text-white' : 
                  n.type === 'completed' ? 'bg-emerald-500 text-white' : 
                  'bg-slate-200 text-slate-600'
                )}>
                  {n.type === 'new_aircraft' ? <Plane size={18} /> : 
                   n.type === 'completed' ? <CheckCircle size={18} /> : 
                   <Info size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={cn("text-xs font-black uppercase tracking-widest", !isRead ? 'text-latam-navy' : 'text-slate-500')}>{n.title}</h3>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
                      <Clock size={10} />
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-medium line-clamp-1">{n.message}</p>
                </div>
                {!isRead && <div className="w-2 h-2 shrink-0 bg-latam-magenta rounded-full shadow-[0_0_8px_rgba(230,0,126,0.5)]" />}
              </motion.div>
            );
          })
        ) : (
          <div className="card-latam border border-slate-200 p-12 text-center text-slate-400 uppercase tracking-widest font-black text-xs">
            <Bell size={32} className="mx-auto mb-4 opacity-10" />
            <p>Queue Empty</p>
          </div>
        )}
      </div>
    </div>
  );
};
