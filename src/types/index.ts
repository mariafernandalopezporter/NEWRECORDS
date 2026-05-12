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
  'gonzalo.roco@latam.com',
  'thiago.nunes@latam.com',
  'cristina.quelal@latam.com'
];

export const AREA_PERMISSIONS: Record<keyof AircraftChecks, string[]> = {
  ifn: ['felipesilva.stefanini@latam.com', 'mariafernanda.lopez@latam.com'],
  limops: ['felipesilva.stefanini@latam.com', 'mariafernanda.lopez@latam.com'],
  jta: ['felipe.orostica@latam.com', 'mariafernanda.lopez@latam.com', 'jahirandres.benavides@latam.com'],
  aircom: ['aircom.tech@latam.com', 'mariafernanda.lopez@latam.com', 'dan.bravo@latam.com'],
  sicco: ['gonzalo.roco@latam.com', 'mariafernanda.lopez@latam.com', 'felipesilva.stefanini@latam.com'],
  ops_flt: ['flt.ops@latam.com', 'mariafernanda.lopez@latam.com', 'felipesilva.stefanini@latam.com'],
  despacho: ['thiago.nunes@latam.com', 'mariafernanda.lopez@latam.com'],
  mantenedor: ['mantenimiento.tech@latam.com', 'mariafernanda.lopez@latam.com'],
  videowall: ['videowall.ops@latam.com', 'mariafernanda.lopez@latam.com', 'Joseilys.Vasquez@latam.com'],
  crew: ['cristina.quelal@latam.com', 'mariafernanda.lopez@latam.com'],
  diccionario: ['felipesilva.stefanini@latam.com', 'gonzalo.roco@latam.com', 'felipe.orostica@latam.com', 'mariafernanda.lopez@latam.com'],
  jira_ticket: ['felipe.orostica@latam.com', 'mariafernanda.lopez@latam.com', 'gonzalo.roco@latam.com', 'felipesilva.stefanini@latam.com']
};

export type ActivationType = 'new_registry' | 'base_change' | 'operator_change';

export interface Aircraft {
  id: string;
  activation_type: ActivationType;
  
  // Basic Info (A-I)
  ac_owner: string;
  ac_registration: string;
  acr: string;
  ac_subtype: string;
  rotation_code: string;
  valid_from: string;
  valid_to: string;
  ac_type: string;
  
  // Technical Details (J-O)
  rst: string;
  local_type?: string;
  local_subtype?: string;
  icao_subtype: string;
  base_airport: string;
  category: string;
  
  // Identity & Status (P-Y)
  name?: string;
  active?: string;
  etops?: string;
  flight_range?: string;
  rff: string;
  manufacturer: string;
  man_serial: string;
  engine: string;
  engine_type: string;
  delivered: string;

  // Performance & weights (Z-AH)
  selcal?: string;
  perf_index?: string;
  max_dow?: string;
  max_zfw?: string;
  max_rw?: string;
  max_tow?: string;
  max_lw?: string;
  hold_cap_vol?: string;
  hold_cap_wgt?: string;

  // Configuration (AI-AO)
  physical_j?: number;
  physical_w?: number;
  physical_y?: number;
  tail_wind?: string;
  cross_wind?: string;
  cabin_jump_seat?: string;
  cockpit_jump_seat?: string;

  // Operational (AQ-BB)
  rem_fuel?: string;
  fuel_supplied?: string;
  fob_dep?: string;
  est_fob?: string;
  est_fob_date?: string;
  terminal?: string;
  stand?: string;
  hangar?: string;
  gate?: string;
  towing_start_position?: string;
  towing_end_position?: string;
  towing_date_time?: string;

  // Tracking (BC-BI)
  next_info_id?: string;
  next_info_time?: string;
  last_flight_id?: string;
  last_flight_time?: string;
  raw_status?: string;
  updated_time?: string;
  updated_by?: string;

  // Workflow System Fields
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
  cancellationReason?: string;
  requesterEmail: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
}
