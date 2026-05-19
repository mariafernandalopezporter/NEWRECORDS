import {Aircraft, Notification, BaseChange, OperatorChange, ActivationType, CheckStatus, AircraftChecks, AREA_PERMISSIONS, ALL_USERS, AlertRequest} from '../types';
import Papa from 'papaparse';
import externalAircraftsData from '../data/external_aircrafts.json';
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
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

// Fallback logic for Firebase configuration
let db: any = null;
let auth: any = null;

const initializeFirebase = async () => {
  try {
    // Attempt to dynamically import the config if it exists
    // @ts-ignore
    const config = await import('../../firebase-applet-config.json');
    if (config && config.default) {
      const app = initializeApp(config.default);
      db = getFirestore(app);
      auth = getAuth(app);
      return true;
    }
  } catch (e) {
    console.log("Awaiting Firebase provisioning or manual config...");
  }
  return false;
};

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/15V3Q2rH5qAeHVQOIzWUtDaJvGmnFTrI4Uz6g3faobNY/export?format=csv&gid=1331518384';

class DataService {
  private aircrafts: Aircraft[] = [];
  private externalAircrafts: Aircraft[] = [];
  private notifications: Notification[] = [];
  private baseChanges: BaseChange[] = [];
  private operatorChanges: OperatorChange[] = [];
  private alertRequests: AlertRequest[] = [];
  private referenceAircrafts: Aircraft[] = [];
  private isFirebaseInitializing = true;
  private isFirebaseReady = false;

  constructor() {
    this.externalAircrafts = externalAircraftsData as Aircraft[];
    this.initLocalFallback();
    this.startPolling();
    initializeFirebase()
      .then(ready => {
        this.isFirebaseReady = ready;
        if (ready) this.syncWithFirebase();
      })
      .finally(() => {
        this.isFirebaseInitializing = false;
        // Trigger initial auth check with the final state
        if (!auth) this.triggerAuthChange(null);
      });
  }

  private pollingInterval: any;
  private startPolling() {
    // Initial fetch
    this.fetchSharedData();
    // Poll every 10 seconds for updates from other users
    this.pollingInterval = setInterval(() => this.fetchSharedData(), 10000);
  }

  private async fetchSharedData() {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const data = await response.json();
        this.aircrafts = data.aircrafts || [];
        this.notifications = data.notifications || [];
        this.alertRequests = data.alertRequests || [];
        this.baseChanges = data.baseChanges || [];
        this.operatorChanges = data.operatorChanges || [];
        this.referenceAircrafts = data.referenceData || [];
        this.saveLocal();
        // Trigger generic "data changed" if we had callbacks, but for now App.tsx re-renders on its own interval or after actions
      }
    } catch (e) {
      console.warn("Shared API not available yet, using local state");
    }
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
                  
                  // Basic Info (A-I)
                  ac_owner: getVal(['A/C OWNER', 'OWNER', 'OPERATOR']) || 'N/A',
                  ac_registration: getVal(['A/C REGISTRATION', 'REGISTRATION', 'MATRICULA']) || `EXT-${index}`,
                  acr: getVal(['ACR']) || '',
                  ac_subtype: getVal(['A/C SUBTYPE', 'SUBTYPE']) || '',
                  rotation_code: getVal(['ROT CODE', 'ROTATION CODE']) || '',
                  valid_from: getVal(['VALID_FROM', 'VALID FROM']) || '',
                  valid_to: getVal(['VALID_TO', 'VALID TO']) || '',
                  ac_type: getVal(['A/C TYPE', 'TYPE']) || '',
                  
                  // Technical Details (J-O)
                  rst: getVal(['RST']) || '',
                  local_type: getVal(['LOCAL TYPE']) || '',
                  local_subtype: getVal(['LOCAL SUBTYPE']) || '',
                  icao_subtype: getVal(['ICAO SUBTYPE', 'ICAO']) || '',
                  base_airport: getVal(['BASE AIRPORT', 'BASE', 'STATION']) || 'UIO',
                  category: getVal(['CATEGORY']) || '',

                  // Identity & Status (P-Y)
                  name: getVal(['NAME', 'NOMBRE']) || '',
                  active: getVal(['ACTIVE', 'ACTIVO']) || '',
                  etops: getVal(['ETOPS']) || '',
                  flight_range: getVal(['FLIGHT RANGE', 'RANGE']) || '',
                  rff: getVal(['RFF']) || '',
                  manufacturer: getVal(['MANUFACTURER']) || '',
                  man_serial: getVal(['MAN: SL#', 'SERIAL', 'MSN']) || '',
                  engine: getVal(['ENGINE']) || '',
                  engine_type: getVal(['ENGINE TYPE']) || '',
                  delivered: getVal(['DELIVERED']) || '',

                  // Performance & weights (Z-AH)
                  selcal: getVal(['SELCAL']) || '',
                  perf_index: getVal(['AIRCRAFT PERFORMANCE INDEX', 'PERFORMANCE INDEX']) || '',
                  max_dow: getVal(['MAX DRY OPERATING WEIGHT', 'DOW']) || '',
                  max_zfw: getVal(['MAX ZERO FUEL WEIGHT', 'ZFW']) || '',
                  max_rw: getVal(['MAX RAMP WEIGHT', 'RW']) || '',
                  max_tow: getVal(['MAX TAKEOFF WEIGHT', 'TOW']) || '',
                  max_lw: getVal(['MAX LANDING WEIGHT', 'LW']) || '',
                  hold_cap_vol: getVal(['HOLD CAPACITY(VOL)', 'HOLD VOL']) || '',
                  hold_cap_wgt: getVal(['HOLD CAPACITY(WGT)', 'HOLD WGT']) || '',

                  // Configuration (AI-AO)
                  physical_j: parseInt(getVal(['SEAT_CLASS_J', 'PHYSICAL_J']) || '0'), 
                  physical_w: parseInt(getVal(['SEAT_CLASS_W', 'PHYSICAL_W']) || '0'),
                  physical_y: parseInt(getVal(['SEAT_CLASS_Y', 'PHYSICAL_Y']) || '0'),
                  tail_wind: getVal(['TAIL WIND']) || '',
                  cross_wind: getVal(['CROSS WIND']) || '',
                  cabin_jump_seat: getVal(['CABIN JUMP SEAT']) || '',
                  cockpit_jump_seat: getVal(['COCKPIT JUMP SEAT']) || '',

                  // Operational (AQ-BB)
                  rem_fuel: getVal(['REMAINING FUEL']) || '',
                  fuel_supplied: getVal(['FUEL SUPPLIED']) || '',
                  fob_dep: getVal(['FOB(DEP)', 'FOB DEP']) || '',
                  est_fob: getVal(['ESTIMATED FOB']) || '',
                  est_fob_date: getVal(['ESTIMATED FOB DATE']) || '',
                  terminal: getVal(['TERMINAL']) || '',
                  stand: getVal(['STAND']) || '',
                  hangar: getVal(['HANGAR']) || '',
                  gate: getVal(['GATE']) || '',
                  towing_start_position: getVal(['TOWING_START_POSITION']) || '',
                  towing_end_position: getVal(['TOWING_END_POSITION']) || '',
                  towing_date_time: getVal(['TOWING_DATE_TIME']) || '',

                  // Tracking (BC-BI)
                  next_info_id: getVal(['NEXT INFORMATION ID']) || '',
                  next_info_time: getVal(['NEXT INFORMATION TIME']) || '',
                  last_flight_id: getVal(['LAST FLIGHT ID']) || '',
                  last_flight_time: getVal(['LAST FLIGHT TIME']) || '',
                  raw_status: getVal(['STATUS']) || 'PENDING',
                  updated_time: getVal(['UPDATED TIME']) || '',
                  updated_by: getVal(['UPDATED BY']) || '',

                  remarks: getVal(['REMARKS', 'OBSERVACIONES']) || colJValue || '',
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                  checks: { 
                    jira_ticket: {checked: false}, ifn: {checked: false}, jta: {checked: false}, diccionario: {checked: false}, videowall: {checked: false}, sicco: {checked: false}, despacho: {checked: false}, crew: {checked: false}, limops: {checked: false}, aircom: {checked: false}, ops_flt: {checked: false}, mantenedor: {checked: false}
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

  async importFromCSV(text: string) {
    return new Promise<void>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim().replace(/^\ufeff/, '').toUpperCase(),
        complete: async (results) => {
          const headers = results.meta.fields || [];
          const aircraftsToImport = results.data
            .filter((row: any) => Object.values(row).some(v => v !== ''))
            .map((row: any, index: number) => {
              const getVal = (searchKeys: string[]) => {
                for (const sk of searchKeys) {
                  const normalizedSK = sk.trim().toUpperCase();
                  if (row[normalizedSK] !== undefined) return row[normalizedSK];
                }
                for (const actualKey of headers) {
                  for (const sk of searchKeys) {
                    if (actualKey.includes(sk.trim().toUpperCase())) return row[actualKey];
                  }
                }
                return '';
              };

              const colJValue = headers[9] ? row[headers[9]] : '';

              return {
                id: `imp-${Date.now()}-${index}`,
                activation_type: 'new_registry',
                ac_owner: getVal(['A/C OWNER', 'OWNER', 'OPERATOR']) || 'N/A',
                ac_registration: getVal(['A/C REGISTRATION', 'REGISTRATION', 'MATRICULA']) || `EXT-${index}`,
                acr: getVal(['ACR']) || '',
                ac_subtype: getVal(['A/C SUBTYPE', 'SUBTYPE']) || '',
                rotation_code: getVal(['ROT CODE', 'ROTATION CODE']) || '',
                valid_from: getVal(['VALID_FROM', 'VALID FROM']) || '',
                valid_to: getVal(['VALID_TO', 'VALID TO']) || '',
                ac_type: getVal(['A/C TYPE', 'TYPE']) || '',
                rst: getVal(['RST']) || '',
                local_type: getVal(['LOCAL TYPE']) || '',
                local_subtype: getVal(['LOCAL SUBTYPE']) || '',
                icao_subtype: getVal(['ICAO SUBTYPE', 'ICAO']) || '',
                base_airport: getVal(['BASE AIRPORT', 'BASE', 'STATION']) || 'SCL',
                category: getVal(['CATEGORY']) || '',
                name: getVal(['NAME', 'NOMBRE']) || '',
                active: getVal(['ACTIVE', 'ACTIVO']) || 'Y',
                etops: getVal(['ETOPS']) || '',
                flight_range: getVal(['FLIGHT RANGE', 'RANGE']) || '',
                rff: getVal(['RFF']) || '',
                manufacturer: getVal(['MANUFACTURER']) || '',
                man_serial: getVal(['MAN: SL#', 'SERIAL', 'MSN']) || '',
                engine: getVal(['ENGINE']) || '',
                engine_type: getVal(['ENGINE TYPE']) || '',
                delivered: getVal(['DELIVERED']) || '',
                selcal: getVal(['SELCAL']) || '',
                perf_index: getVal(['AIRCRAFT PERFORMANCE INDEX', 'PERFORMANCE INDEX']) || '',
                max_dow: getVal(['MAX DRY OPERATING WEIGHT', 'DOW']) || '',
                max_zfw: getVal(['MAX ZERO FUEL WEIGHT', 'ZFW']) || '',
                max_rw: getVal(['MAX RAMP WEIGHT', 'RW']) || '',
                max_tow: getVal(['MAX TAKEOFF WEIGHT', 'TOW']) || '',
                max_lw: getVal(['MAX LANDING WEIGHT', 'LW']) || '',
                hold_cap_vol: getVal(['HOLD CAPACITY(VOL)', 'HOLD VOL']) || '',
                hold_cap_wgt: getVal(['HOLD CAPACITY(WGT)', 'HOLD WGT']) || '',
                physical_j: parseInt(getVal(['SEAT_CLASS_J', 'PHYSICAL_J']) || '0'), 
                physical_w: parseInt(getVal(['SEAT_CLASS_W', 'PHYSICAL_W']) || '0'),
                physical_y: parseInt(getVal(['SEAT_CLASS_Y', 'PHYSICAL_Y']) || '0'),
                tail_wind: getVal(['TAIL WIND']) || '',
                cross_wind: getVal(['CROSS WIND']) || '',
                cabin_jump_seat: getVal(['CABIN JUMP SEAT']) || '',
                cockpit_jump_seat: getVal(['COCKPIT JUMP SEAT']) || '',
                remarks: getVal(['REMARKS', 'OBSERVACIONES']) || colJValue || '',
                status: 'pending',
                createdAt: new Date().toISOString(),
                checks: { 
                  jira_ticket: {checked: false}, ifn: {checked: false}, jta: {checked: false}, diccionario: {checked: false}, videowall: {checked: false}, sicco: {checked: false}, despacho: {checked: false}, crew: {checked: false}, limops: {checked: false}, aircom: {checked: false}, ops_flt: {checked: false}, mantenedor: {checked: false}
                }
              } as Aircraft;
            });

          // Save to server
          try {
            await fetch('/api/reference-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ referenceData: aircraftsToImport })
            });
            this.referenceAircrafts = aircraftsToImport;
          } catch (e) {
            console.error('Error saving imported data:', e);
          }
          resolve();
        }
      });
    });
  }

  async getAircrafts() { return [...this.aircrafts]; }
  async getExternalAircrafts() { 
    return [...this.referenceAircrafts, ...this.externalAircrafts]; 
  }
  async getAlertRequests() { return [...this.alertRequests]; }

  async signIn() {
    if (!auth) {
      // Fallback for development/local mode if Firebase is not ready
      console.log("Using local fallback login");
      const mockUser = {
        email: "mariafernanda.lopez@latam.com",
        displayName: "Maria Fernanda Lopez",
        uid: "local-user"
      } as any;
      
      // We need to trigger the auth change manually since there's no Firebase listener
      this.triggerAuthChange(mockUser);
      return mockUser;
    }
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Error signing in", error);
      throw error;
    }
  }

  private authCallbacks: ((user: User | null) => void)[] = [];
  private triggerAuthChange(user: User | null) {
    this.authCallbacks.forEach(cb => cb(user));
  }

  async logout() {
    if (!auth) {
      this.triggerAuthChange(null);
      return;
    }
    await signOut(auth);
  }

  onAuthChange(callback: (user: User | null) => void) {
    this.authCallbacks.push(callback);
    
    let timeoutId: any;
    
    // Safety timeout: if auth is not ready in 5 seconds, assume local mode
    timeoutId = setTimeout(() => {
      if (this.isFirebaseInitializing) {
        console.log("Firebase initialization taking too long, providing initial state");
        callback(null);
      }
    }, 5000);

    if (this.isFirebaseInitializing && !auth) {
      const checkAuth = setInterval(() => {
        if (!this.isFirebaseInitializing || auth) {
          clearInterval(checkAuth);
          clearTimeout(timeoutId);
          if (auth) {
            onAuthStateChanged(auth, (user) => {
              this.triggerAuthChange(user);
              // Result is handled by triggerAuthChange which calls all callbacks
            });
          } else {
            callback(null);
          }
        }
      }, 500);
      return () => {
        clearInterval(checkAuth);
        clearTimeout(timeoutId);
        this.authCallbacks = this.authCallbacks.filter(cb => cb !== callback);
      };
    }
    
    clearTimeout(timeoutId);
    if (auth) {
      onAuthStateChanged(auth, (user) => {
        this.triggerAuthChange(user);
      });
    } else {
      callback(null);
    }

    return () => {
      this.authCallbacks = this.authCallbacks.filter(cb => cb !== callback);
    };
  }
  
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
      jira_ticket: { checked: false },
      ifn: { checked: false },
      jta: { checked: false },
      diccionario: { checked: false },
    };

    if (!isChange) {
      // Add standard checks for new registry
      const standardKeys = ['videowall', 'sicco', 'despacho', 'crew', 'limops', 'aircom', 'ops_flt', 'mantenedor'];
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
      try {
        const response = await fetch('/api/aircrafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activationData)
        });
        if (response.ok) {
          finalAircraft = await response.json();
          this.aircrafts.unshift(finalAircraft);
        } else {
          throw new Error("API failed");
        }
      } catch (e) {
        finalAircraft = {
          ...activationData,
          id: Math.random().toString(36).substr(2, 9),
        } as Aircraft;
        this.aircrafts.unshift(finalAircraft);
      }
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
        recipients: this.getRecipients(type, userEmail)
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
      try {
        await fetch(`/api/aircrafts/${aircraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checks: updatedChecks, status: newStatus })
        });
      } catch (e) {
        console.error("API update failed, local only");
      }
      aircraft.checks = updatedChecks;
      aircraft.status = newStatus;
      this.saveLocal();
    }

    // SYNC TO GOOGLE SHEET
    this.syncToSpreadsheet(aircraft.ac_registration, area.toUpperCase(), userEmail, timestamp, 'CHECK_UPDATE', {
      recipients: [userEmail, ...(AREA_PERMISSIONS[area] || [])],
      message: `${userEmail} ha realizado el check de ${area.toUpperCase()} para ${aircraft.ac_registration}`
    });

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
      try {
        await fetch(`/api/aircrafts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedData)
        });
      } catch (e) {
        console.error("API update failed");
      }
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
      try {
        await fetch(`/api/aircrafts/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error("API delete failed");
      }
      this.aircrafts.splice(aircraftIndex, 1);
      this.saveLocal();
    }
  }

  private getRecipients(type: ActivationType, creatorEmail: string): string[] {
    const recipients = new Set<string>();
    recipients.add(creatorEmail);
    
    if (type === 'new_registry') {
      // For new registry, notify all relevant areas
      Object.values(AREA_PERMISSIONS).forEach(list => {
        list.forEach(email => recipients.add(email));
      });
    } else {
      // For base_change and operator_change: diccionario, jta, ifn
      const groups: (keyof AircraftChecks)[] = ['diccionario', 'jta', 'ifn'];
      groups.forEach(g => {
        if (AREA_PERMISSIONS[g]) {
          AREA_PERMISSIONS[g].forEach(email => recipients.add(email));
        }
      });
    }
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
      try {
        const response = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notif)
        });
        if (response.ok) {
          const newNotif = await response.json();
          this.notifications.unshift(newNotif);
        } else {
          throw new Error("API failed");
        }
      } catch (e) {
        const newNotif: Notification = {
          ...notif,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          read_by: []
        };
        this.notifications.unshift(newNotif);
      }
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
        try {
          await fetch(`/api/notifications/${id}/read`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail })
          });
        } catch (e) {
          console.error("API failed");
        }
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
      try {
        const response = await fetch('/api/alert-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          const newRequest = await response.json();
          this.alertRequests.unshift(newRequest);
        } else {
          throw new Error("API failed");
        }
      } catch (e) {
        const newRequest = { ...data, id: Math.random().toString(36).substr(2, 9) } as AlertRequest;
        this.alertRequests.unshift(newRequest);
      }
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
      try {
        await fetch(`/api/alert-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', completedBy, completedAt })
        });
      } catch (e) {
        console.error("API failed");
      }
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
        emailBody: `El requerimiento (${req.restrictionName}) se ha cargado en ${req.type}`,
        message: `Solicitud de alerta ${req.type} completada por ${completedBy}`
      }
    );
  }

  async cancelAlertRequest(id: string, cancelledBy: string, reason: string) {
    const req = this.alertRequests.find(r => r.id === id);
    if (!req) return;

    if (db) {
      await updateDoc(doc(db, 'alert_requests', id), {
        status: 'cancelled',
        cancellationReason: reason,
        completedBy: cancelledBy,
        completedAt: new Date().toISOString()
      });
    } else {
      try {
        await fetch(`/api/alert-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'cancelled', 
            cancellationReason: reason, 
            completedBy: cancelledBy, 
            completedAt: new Date().toISOString() 
          })
        });
      } catch (e) {
        console.error("API failed");
      }
      req.status = 'cancelled';
      req.cancellationReason = reason;
      req.completedBy = cancelledBy;
      req.completedAt = new Date().toISOString();
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
        reason: reason,
        emailBody: `Este requerimiento (${req.restrictionName}) se ha cancelado. Justificación: ${reason}`,
        message: `Solicitud de alerta ${req.type} ANULADA por ${cancelledBy}. Motivo: ${reason}`
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
