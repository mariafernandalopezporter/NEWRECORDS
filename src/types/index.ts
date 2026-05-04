export type AircraftStatus = 'pending' | 'in_progress' | 'completed';

export interface CheckStatus {
  checked: boolean;
  timestamp?: string;
  user?: string;
  value?: string; // For things like Jira links
}

export interface AircraftChecks {
  ifn: CheckStatus;
  limops: CheckStatus;
  jta: CheckStatus;
  aircom: CheckStatus;
  sicco: CheckStatus;
  ops_flt: CheckStatus;
  despacho: CheckStatus;
  mantenedor: CheckStatus;
  videowall: CheckStatus;
  crew: CheckStatus;
  diccionario: CheckStatus;
  jira_ticket: CheckStatus;
}

export const ALL_USERS = [
  'felipesilva.stefanini@latam.com', 
  'mariafernanda.lopez@latam.com', 
  'jahirandres.benavides@latam.com',
  'felipe.orostica@latam.com',
  'dan.bravo@latam.com',
  'gonzalo.roco@latam.com',
  'thiago.nunes@latam.com',
  'Joseilys.Vasquez@latam.com',
  'cristina.quelal@latam.com'
];

export const AREA_PERMISSIONS: Record<keyof AircraftChecks, string[]> = {
  ifn: ['felipesilva.stefanini@latam.com', 'mariafernanda.lopez@latam.com', 'jahirandres.benavides@latam.com'],
  limops: ['jahirandres.benavides@latam.com', 'mariafernanda.lopez@latam.com', 'felipesilva.stefanini@latam.com'],
  jta: ['felipe.orostica@latam.com', 'felipesilva.stefanini@latam.com'],
  aircom: ['dan.bravo@latam.com'],
  sicco: ['gonzalo.roco@latam.com'],
  ops_flt: ['felipesilva.stefanini@latam.com', 'gonzalo.roco@latam.com'],
  despacho: ['thiago.nunes@latam.com'],
  mantenedor: ['felipesilva.stefanini@latam.com'],
  videowall: ['Joseilys.Vasquez@latam.com'],
  crew: ['cristina.quelal@latam.com'],
  diccionario: ['felipesilva.stefanini@latam.com', 'mariafernanda.lopez@latam.com', 'jahirandres.benavides@latam.com'],
  jira_ticket: ALL_USERS
};

export type ActivationType = 'new_registry' | 'base_change' | 'operator_change';

export interface Aircraft {
  id: string;
  activation_type: ActivationType;
  ac_owner: string;
  ac_registration: string;
  acr: string;
  ac_subtype: string;
  rotation_code: string;
  valid_from: string;
  valid_to: string;
  ac_type: string;
  rst: string;
  icao_subtype: string;
  base_airport: string;
  category: string;
  rff: string;
  manufacturer: string;
  man_serial: string;
  engine: string;
  engine_type: string;
  delivered: string;
  physical_j?: number;
  physical_w?: number;
  physical_y?: number;
  remarks: string;
  checks: AircraftChecks;
  status: AircraftStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  aircraft_id?: string;
  aircraft_registration?: string;
  type: 'new_aircraft' | 'area_checked' | 'completed';
  read_by: string[];
  createdAt: string;
}

export interface BaseChange {
  id: string;
  ac_owner: string;
  ac_registration: string;
  base_actual: string;
  new_base: string;
  fecha_desde: string;
  createdAt: string;
}

export interface OperatorChange {
  id: string;
  ac_owner_actual: string;
  ac_owner_new: string;
  ac_registration: string;
  base_actual: string;
  fecha_desde: string;
  createdAt: string;
}

export interface AlertRequest {
  id: string;
  type: 'IFN' | 'JTA';
  restrictionName: string;
  routeInfo: string;
  periodFrom: string;
  periodTo: string;
  replacesRestriction?: string;
  remarks: string;
  status: 'pending' | 'completed' | 'cancelled';
  requesterEmail: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
}
