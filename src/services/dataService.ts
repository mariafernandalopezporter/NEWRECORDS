import {Aircraft, Notification, BaseChange, OperatorChange, ActivationType, CheckStatus, AircraftChecks, AREA_PERMISSIONS, ALL_USERS, AlertRequest} from '../types';
import Papa from 'papaparse';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

// Fallback logic for Firebase configuration
let db: any = null;

const initializeFirebase = async () => {
  try {
    // Attempt to dynamically import the config if it exists
    // @ts-ignore
    const config = await import('../../firebase-applet-config.json');
    if (config && config.default) {
      const app = initializeApp(config.default);
      db = getFirestore(app);
      return true;
    }
  } catch (e) {
    console.log("Awaiting Firebase provisioning or manual config...");
  }
  return false;
};

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_tURLeAGHDQ1ovKLO6SD3cI3xIPWMF9/export?format=csv&gid=329232321';

class DataService {
  private aircrafts: Aircraft[] = [];
  private externalAircrafts: Aircraft[] = [];
  private notifications: Notification[] = [];
  private baseChanges: BaseChange[] = [];
  private operatorChanges: OperatorChange[] = [];
  private alertRequests: AlertRequest[] = [];
  private isFirebaseReady = false;

  constructor() {
    this.initLocalFallback();
    initializeFirebase().then(ready => {
      this.isFirebaseReady = ready;
      if (ready) this.syncWithFirebase();
    });
  }

  private initLocalFallback() {
    const savedAircrafts = localStorage.getItem('fleet_aircrafts');
    const savedNotifications = localStorage.getItem('fleet_notifications');
    const savedBaseChanges = localStorage.getItem('fleet_base_changes');
    const savedOperatorChanges = localStorage.getItem('fleet_operator_changes');
    const savedAlertRequests = localStorage.getItem('fleet_alert_requests');

    if (savedAircrafts) this.aircrafts = JSON.parse(savedAircrafts);
    if (savedNotifications) this.notifications = JSON.parse(savedNotifications);
    if (savedBaseChanges) this.baseChanges = JSON.parse(savedBaseChanges);
    if (savedOperatorChanges) this.operatorChanges = JSON.parse(savedOperatorChanges);
    if (savedAlertRequests) this.alertRequests = JSON.parse(savedAlertRequests);
  }

  private syncWithFirebase() {
    // Aircrafts listener
    onSnapshot(collection(db, 'aircrafts'), (snapshot) => {
      this.aircrafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
      this.saveLocal();
    });

    // Notifications listener
    onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      this.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      this.saveLocal();
    });

    // Alert Requests listener
    onSnapshot(query(collection(db, 'alert_requests'), orderBy('createdAt', 'desc')), (snapshot) => {
      this.alertRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertRequest));
      this.saveLocal();
    });
  }

  private saveLocal() {
    localStorage.setItem('fleet_aircrafts', JSON.stringify(this.aircrafts));
    localStorage.setItem('fleet_notifications', JSON.stringify(this.notifications));
    localStorage.setItem('fleet_base_changes', JSON.stringify(this.baseChanges));
    localStorage.setItem('fleet_operator_changes', JSON.stringify(this.operatorChanges));
    localStorage.setItem('fleet_alert_requests', JSON.stringify(this.alertRequests));
  }

  async fetchExternalAircrafts() {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();
      
      return new Promise<Aircraft[]>((resolve) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header) => header.trim().replace(/^\ufeff/, '').toUpperCase(),
          complete: (results) => {
            // Get actual header keys from the first row of data
            const headers = results.meta.fields || [];
            
            const parsed = results.data
              .filter((row: any) => Object.values(row).some(v => v !== '')) // Remove empty rows
              .map((row: any, index: number) => {
                const getVal = (searchKeys: string[]) => {
                  // Strategy 1: Exact normalized match
                  for (const sk of searchKeys) {
                    const normalizedSK = sk.trim().toUpperCase();
                    if (row[normalizedSK] !== undefined) return row[normalizedSK];
                  }
                  // Strategy 2: Partial match (contains)
                  for (const actualKey of headers) {
                    for (const sk of searchKeys) {
                      if (actualKey.includes(sk.trim().toUpperCase())) return row[actualKey];
                    }
                  }
                  return '';
                };

                // Column J is usually the 10th column (index 9)
                const colJValue = headers[9] ? row[headers[9]] : '';

                const reg = getVal(['REGISTRATION', 'MATRICULA', 'MATRÍCULA', 'REG', 'A/C REGISTRATION', 'AIRCRAFT']) || `EXT-${index}`;
                const owner = getVal(['OWNER', 'DUEÑO', 'DUENO', 'OPERATOR', 'OPERADOR', 'A/C OWNER', 'PROPIETARIO']) || 'N/A';
                const type = getVal(['TYPE', 'MODELO', 'A/C TYPE', 'SUBTYPE', 'PRODUCTO']) || 'A320';

                return {
                  id: `ext-${index}`,
                  activation_type: 'new_registry',
                  ac_owner: owner,
                  ac_registration: reg,
                  acr: getVal(['ACR']) || '',
                  ac_subtype: getVal(['SUBTYPE', 'A/C SUBTYPE', 'SUBTIPO']) || '',
                  rotation_code: getVal(['ROTATION CODE', 'ROTATION', 'ROTACION']) || '',
                  valid_from: '',
                  valid_to: '',
                  ac_type: type,
                  rst: getVal(['RST']) || '',
                  icao_subtype: getVal(['ICAO SUBTYPE', 'ICAO']) || '',
                  base_airport: getVal(['BASE', 'BASE AIRPORT', 'STATION', 'AEROPUERTO']) || 'UIO',
                  category: getVal(['CATEGORY', 'CATEGORIA']) || '',
                  rff: getVal(['RFF']) || '',
                  manufacturer: getVal(['MANUFACTURER', 'FABRICANTE']) || '',
                  man_serial: getVal(['SERIAL', 'MSN', 'MSN/SERIAL', 'SERIE']) || '',
                  engine: getVal(['ENGINE', 'MOTOR']) || '',
                  engine_type: getVal(['ENGINE TYPE', 'TIPO MOTOR']) || '',
                  delivered: getVal(['DELIVERED', 'FECHA ENTREGA', 'ENTREGA']) || '',
                  physical_j: 0, 
                  physical_w: 0,
                  physical_y: 0,
                  remarks: getVal(['REMARKS', 'OBSERVACIONES', 'OBSERVACION', 'COMENTARIOS', 'DESCRIPCION']) || colJValue || '',
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                  checks: { 
                    ifn: {checked: false}, limops: {checked: false}, jta: {checked: false}, aircom: {checked: false}, sicco: {checked: false}, ops_flt: {checked: false}, despacho: {checked: false}, mantenedor: {checked: false}, videowall: {checked: false}, crew: {checked: false} 
                  }
                } as Aircraft;
              });
            this.externalAircrafts = parsed;
            resolve(parsed);
          }
        });
      });
    } catch (error) {
      console.error('Error fetching Google Sheet:', error);
      return [];
    }
  }

  async getAircrafts() { return [...this.aircrafts]; }
  async getExternalAircrafts() { return [...this.externalAircrafts]; }
  async getAlertRequests() { return [...this.alertRequests]; }
  
  async createActivation(
    type: ActivationType, 
    data: any, 
    userEmail: string
  ) {
    const isChange = type === 'base_change' || type === 'operator_change';
    
    // Normalize data to UPPERCASE (all strings)
    const normalizedData = { ...data };
    Object.keys(normalizedData).forEach(key => {
      if (typeof normalizedData[key] === 'string') {
        normalizedData[key] = normalizedData[key].toUpperCase();
      }
    });

    // Initial checks for the activation
    const freshChecks: any = {
      ifn: { checked: false },
      jta: { checked: false },
      diccionario: { checked: false },
      jira_ticket: { checked: false },
    };

    if (!isChange) {
      // Add standard checks for new registry
      const standardKeys = ['limops', 'aircom', 'sicco', 'ops_flt', 'despacho', 'mantenedor', 'videowall', 'crew'];
      standardKeys.forEach(k => freshChecks[k] = { checked: false });
    }

    const activationData: Aircraft = {
      ...normalizedData,
      id: '', // Will be set below
      activation_type: type,
      status: 'pending',
      checks: freshChecks,
      createdAt: new Date().toISOString(),
      // Ensure missing fields for changes are present
      ac_owner: normalizedData.ac_owner || normalizedData.ac_owner_new || 'N/A',
      ac_registration: normalizedData.ac_registration || '',
      base_airport: normalizedData.new_base || normalizedData.base_airport || 'N/A',
      remarks: normalizedData.remarks || (type === 'base_change' ? `Base: ${normalizedData.base_actual} -> ${normalizedData.new_base}` : `Op: ${normalizedData.ac_owner_actual} -> ${normalizedData.ac_owner_new}`)
    };

    let finalAircraft: Aircraft;
    if (db) {
      const docRef = await addDoc(collection(db, 'aircrafts'), {
        ...activationData,
        createdAt: serverTimestamp()
      });
      finalAircraft = { ...activationData, id: docRef.id } as Aircraft;
    } else {
      finalAircraft = {
        ...activationData,
        id: Math.random().toString(36).substr(2, 9),
      } as Aircraft;
      this.aircrafts.unshift(finalAircraft);
      this.saveLocal();
    }

    // Sync to GSheet with rich data for the pretty email
    const actionMap: Record<ActivationType, string> = {
      new_registry: 'NEW_AIRCRAFT',
      base_change: 'BASE_CHANGE',
      operator_change: 'OPERATOR_CHANGE'
    };

    this.syncToSpreadsheet(
      finalAircraft.ac_registration, 
      type.toUpperCase(), 
      userEmail, 
      finalAircraft.createdAt, 
      actionMap[type],
      {
        owner: finalAircraft.ac_owner,
        type: finalAircraft.ac_type,
        base: finalAircraft.base_airport,
        from: (data as any).base_actual || (data as any).ac_owner_actual,
        to: (data as any).new_base || (data as any).ac_owner_new,
        recipients: this.getRecipients(type)
      }
    );

    const titleMap: Record<ActivationType, string> = {
      new_registry: 'Nueva Matrícula',
      base_change: 'Cambio de Base',
      operator_change: 'Cambio de Operador'
    };

    await this.addNotification({
      title: titleMap[type],
      message: `${titleMap[type]} para ${finalAircraft.ac_registration}`,
      aircraft_registration: finalAircraft.ac_registration,
      type: 'new_aircraft'
    });
    
    return finalAircraft;
  }

  async addAircraft(aircraft: Omit<Aircraft, 'id' | 'createdAt' | 'checks' | 'status' | 'activation_type'>, userEmail: string) {
    return this.createActivation('new_registry', aircraft, userEmail);
  }

  async updateCheck(aircraftId: string, area: keyof Aircraft['checks'], userEmail: string, value?: string) {
    const aircraft = this.aircrafts.find(a => a.id === aircraftId);
    if (!aircraft) return;

    const timestamp = new Date().toLocaleString();
    const updatedChecks = { ...aircraft.checks };
    updatedChecks[area] = { checked: true, timestamp, user: userEmail, value };

    // Get expected checklist areas for this type
    const isChange = aircraft.activation_type === 'base_change' || aircraft.activation_type === 'operator_change';
    const expectedKeys = isChange 
      ? ['ifn', 'jta', 'diccionario', 'jira_ticket'] 
      : Object.keys(aircraft.checks);

    const relevantCompletedCount = expectedKeys.filter(k => (updatedChecks as any)[k]?.checked).length;
    const newStatus = relevantCompletedCount === expectedKeys.length ? 'completed' : 'in_progress';

    if (db) {
      await updateDoc(doc(db, 'aircrafts', aircraftId), {
        checks: updatedChecks,
        status: newStatus
      });
    } else {
      aircraft.checks = updatedChecks;
      aircraft.status = newStatus;
      this.saveLocal();
    }

    // SYNC TO GOOGLE SHEET
    this.syncToSpreadsheet(aircraft.ac_registration, area.toUpperCase(), userEmail, timestamp, 'CHECK_UPDATE');

    // Email alert for 50% checklist
    const totalExpected = expectedKeys.length;
    const isHalfWay = totalExpected > 2 
      ? relevantCompletedCount === Math.ceil(totalExpected / 2) 
      : relevantCompletedCount === 1;

    if (isHalfWay) {
      this.syncToSpreadsheet(aircraft.ac_registration, 'CHECKLIST_MILESTONE', userEmail, timestamp, 'CHECKLIST_HALF_DONE');
    }

    if (newStatus === 'completed') {
      await this.addNotification({
        title: 'Checklist Completado',
        message: `Aeronave ${aircraft.ac_registration} verificada por todas las áreas`,
        aircraft_registration: aircraft.ac_registration,
        type: 'completed'
      });
    }
  }

  async updateAircraft(id: string, data: Partial<Aircraft>, userEmail: string) {
    const aircraft = this.aircrafts.find(a => a.id === id);
    if (!aircraft) return;

    // Normalize strings to uppercase (except link if it was one, but here it's general data)
    const normalizedData = { ...data };
    Object.keys(normalizedData).forEach(key => {
      if (typeof (normalizedData as any)[key] === 'string' && key !== 'id') {
        (normalizedData as any)[key] = (normalizedData as any)[key].toUpperCase();
      }
    });

    if (db) {
      await updateDoc(doc(db, 'aircrafts', id), normalizedData);
    } else {
      Object.assign(aircraft, normalizedData);
      this.saveLocal();
    }

    // Trigger update webhook
    this.syncToSpreadsheet(
      aircraft.ac_registration, 
      'AIRCRAFT_EDITED', 
      userEmail, 
      new Date().toLocaleString(), 
      'EDIT',
      { message: "Se ha editado una matrícula, ve a revisarla." }
    );
  }

  async deleteAircraft(id: string) {
    console.log(`Attempting to delete aircraft with ID: ${id}`);
    const aircraftIndex = this.aircrafts.findIndex(a => a.id === id);
    if (aircraftIndex === -1) {
      console.warn(`Aircraft with ID ${id} not found in local state.`);
      return;
    }

    if (db) {
      try {
        await deleteDoc(doc(db, 'aircrafts', id));
        console.log(`Successfully deleted aircraft ${id} from Firestore.`);
      } catch (error) {
        console.error(`Error deleting aircraft ${id}:`, error);
      }
    } else {
      this.aircrafts.splice(aircraftIndex, 1);
      this.saveLocal();
    }
  }

  private getRecipients(type: ActivationType): string[] {
    if (type === 'new_registry') return ALL_USERS;
    
    // For base_change and operator_change: diccionario, jta, ifn
    const groups: (keyof AircraftChecks)[] = ['diccionario', 'jta', 'ifn'];
    const recipients = new Set<string>();
    groups.forEach(g => {
      if (AREA_PERMISSIONS[g]) {
        AREA_PERMISSIONS[g].forEach(email => recipients.add(email));
      }
    });
    return Array.from(recipients);
  }

  private async syncToSpreadsheet(reg: string, area: string, user: string, time: string, action: string, extra?: any) {
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvZ4OygtDpg8CuRn6afBc3zbfgYmCwTPOlcjDAsaBvt8udXcoHhWfAXW1eMDNeZ4M/exec'; 

    if (!APPS_SCRIPT_URL) return;

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg, area, user, time, action, extra })
      });
    } catch (e) {
      console.error('Error syncing to GSheet:', e);
    }
  }

  async addNotification(notif: Omit<Notification, 'id' | 'createdAt' | 'read_by'>) {
    if (db) {
      await addDoc(collection(db, 'notifications'), {
        ...notif,
        read_by: [],
        createdAt: serverTimestamp()
      });
    } else {
      const newNotif: Notification = {
        ...notif,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        read_by: []
      };
      this.notifications.unshift(newNotif);
      this.saveLocal();
    }
  }

  async getNotifications() { return [...this.notifications]; }
  
  async markNotificationRead(id: string, userEmail: string) {
    const n = this.notifications.find(notif => notif.id === id);
    if (n && !n.read_by.includes(userEmail)) {
      if (db && !id.startsWith('temp-')) {
        await updateDoc(doc(db, 'notifications', id), {
          read_by: [...n.read_by, userEmail]
        });
      } else {
        n.read_by.push(userEmail);
        this.saveLocal();
      }
    }
  }

  async addBaseChange(change: Omit<BaseChange, 'id' | 'createdAt'>, userEmail: string) {
    if (db) {
       await addDoc(collection(db, 'base_changes'), { ...change, createdAt: serverTimestamp() });
    } else {
      const newChange = { ...change, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
      this.baseChanges.push(newChange);
      this.saveLocal();
    }

    return this.createActivation('base_change', change, userEmail);
  }

  async addOperatorChange(change: Omit<OperatorChange, 'id' | 'createdAt'>, userEmail: string) {
    if (db) {
       await addDoc(collection(db, 'operator_changes'), { ...change, createdAt: serverTimestamp() });
    } else {
      const newChange = { ...change, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
      this.operatorChanges.push(newChange);
      this.saveLocal();
    }

    return this.createActivation('operator_change', change, userEmail);
  }

  async addAlertRequest(request: Omit<AlertRequest, 'id' | 'createdAt' | 'status' | 'completedBy' | 'completedAt'>) {
    const data = {
      ...request,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (db) {
      await addDoc(collection(db, 'alert_requests'), {
        ...data,
        createdAt: serverTimestamp()
      });
    } else {
      const newRequest = { ...data, id: Math.random().toString(36).substr(2, 9) } as AlertRequest;
      this.alertRequests.unshift(newRequest);
      this.saveLocal();
    }

    // Sync to spreadsheet
    this.syncToSpreadsheet(
      data.restrictionName,
      data.type,
      data.requesterEmail,
      data.createdAt,
      'ALERT_REQUEST_CREATED',
      {
        route: data.routeInfo,
        from: data.periodFrom,
        to: data.periodTo,
        replaces: data.replacesRestriction || 'NO',
        remarks: data.remarks || '',
        message: `Nuevo requerimiento de alerta ${data.type} ingresado por ${data.requesterEmail}`
      }
    );

    // Send Google Chat notification
    this.sendGoogleChatNotification(data as AlertRequest);
  }

  async updateAlertRequestStatus(id: string, completedBy: string) {
    const req = this.alertRequests.find(r => r.id === id);
    if (!req) return;

    const completedAt = new Date().toISOString();
    if (db) {
      await updateDoc(doc(db, 'alert_requests', id), {
        status: 'completed',
        completedBy,
        completedAt
      });
    } else {
      req.status = 'completed';
      req.completedBy = completedBy;
      req.completedAt = completedAt;
      this.saveLocal();
    }

    // Trigger notification webhook for completion
    this.syncToSpreadsheet(
      req.restrictionName,
      req.type,
      completedBy,
      completedAt,
      'ALERT_REQUEST_COMPLETED',
      {
        requester: req.requesterEmail,
        route: req.routeInfo,
        message: `Solicitud de alerta ${req.type} completada por ${completedBy}`
      }
    );
  }

  async cancelAlertRequest(id: string, cancelledBy: string) {
    const req = this.alertRequests.find(r => r.id === id);
    if (!req) return;

    if (db) {
      await updateDoc(doc(db, 'alert_requests', id), {
        status: 'cancelled',
      });
    } else {
      req.status = 'cancelled';
      this.saveLocal();
    }

    // Trigger notification webhook for cancellation
    this.syncToSpreadsheet(
      req.restrictionName,
      req.type,
      cancelledBy,
      new Date().toISOString(),
      'ALERT_REQUEST_CANCELLED',
      {
        requester: req.requesterEmail,
        route: req.routeInfo,
        message: `Solicitud de alerta ${req.type} ANULADA por ${cancelledBy}`
      }
    );
  }

  private async sendGoogleChatNotification(data: AlertRequest) {
    const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAAAI42Ej3g/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=XTaN_2j2TAUwrmrSpD8ip32DtodCnNr5aF3OF7GV6f4';
    
    const message = {
      text: `*Se ha creado una nueva restricción en ${data.type}*\n\n` +
            `*Especificación:* ${data.restrictionName}\n` +
            `*Ruta/Vuelo/Matrícula:* ${data.routeInfo}\n` +
            `*Periodo:* ${new Date(data.periodFrom).toLocaleString()} - ${new Date(data.periodTo).toLocaleString()}\n` +
            `*Reemplaza:* ${data.replacesRestriction || 'No aplica'}\n` +
            `*Observaciones:* ${data.remarks || 'Sin observaciones'}\n` +
            `*Solicitado por:* ${data.requesterEmail}\n\n` +
            `Recuerda hacer el check de mision cumplida en *OPS NEWAC&Changes*: https://ai.studio/apps/f3c655e7-7453-4535-b982-199e98da7dd9?fullscreenApplet=true`
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (e) {
      console.error('Error sending Google Chat notification:', e);
    }
  }
}

export const dataService = new DataService();
