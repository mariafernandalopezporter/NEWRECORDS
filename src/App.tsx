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
import { Bell, CheckCircle, Info, Plane, Clock, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab ] = React.useState('dashboard');
  const [selectedAircraftId, setSelectedAircraftId] = React.useState<string | null>(null);
  const [editAircraftId, setEditAircraftId] = React.useState<string | null>(null);
  const [aircrafts, setAircrafts] = React.useState<Aircraft[]>([]);
  const [externalAircrafts, setExternalAircrafts] = React.useState<Aircraft[]>([]);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [alertRequests, setAlertRequests] = React.useState<AlertRequest[]>([]);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const userEmail = user?.email || "";

  React.useEffect(() => {
    const unsubscribe = dataService.onAuthChange((authUser) => {
      if (authUser && authUser.email?.toLowerCase().endsWith('@latam.com')) {
        setUser(authUser);
        setAuthError(null);
      } else if (authUser) {
        dataService.logout();
        setAuthError("Debe ingresar con una cuenta @latam.com");
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    let interval: any;
    if (user) {
      loadData();
      // Poll every 10 seconds for real-time updates across users
      interval = setInterval(loadData, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await dataService.signIn();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await dataService.logout();
    setActiveTab('dashboard');
  };

  const loadData = async () => {
    const [fetchedAircrafts, fetchedNotifications, fetchedAlertRequests, fetchedExternal] = await Promise.all([
      dataService.getAircrafts(),
      dataService.getNotifications(),
      dataService.getAlertRequests(),
      dataService.getExternalAircrafts()
    ]);
    setAircrafts(fetchedAircrafts);
    setNotifications(fetchedNotifications);
    setAlertRequests(fetchedAlertRequests);
    setExternalAircrafts(fetchedExternal);
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

  const handleCancelAlertRequest = async (id: string, reason: string) => {
    await dataService.cancelAlertRequest(id, userEmail, reason);
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
          onDataImported={loadData}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-latam-navy border-t-transparent rounded-full animate-spin" />
          <p className="text-latam-navy font-black uppercase tracking-widest text-[10px]">Cargando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-latam-navy flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center"
        >
          <div className="mb-8">
            <div className="w-20 h-20 bg-latam-navy text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Plane size={40} />
            </div>
            <h1 className="text-2xl font-black text-latam-navy uppercase tracking-tight mb-2">Fleet Activation</h1>
            <p className="text-slate-500 text-sm font-medium">Gestión de Activaciones y Restricciones de Flota</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold">
              <Info size={16} />
              {authError}
            </div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full bg-latam-navy hover:bg-slate-800 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <LogIn size={20} />
            Ingresar con LATAM
          </button>
          
          <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Acceso restringido personal autorizado
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userEmail={userEmail}
      notificationsCount={unreadCount}
      logout={handleLogout}
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
