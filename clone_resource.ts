
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/15V3Q2rH5qAeHVQOIzWUtDaJvGmnFTrI4Uz6g3faobNY/export?format=csv&gid=1331518384';
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'data', 'external_aircrafts.json');
const FLEET_CSV_PATH = path.join(process.cwd(), 'fleet_source.csv');

function mapToAircraft(ac: any, index: number) {
  // Convert Owner code to full name
  const owners: Record<string, string> = {
    'JJ': 'LATAM BRASIL',
    'LA': 'LATAM CHILE',
    'XL': 'LATAM ECUADOR',
    'LP': 'LATAM PERU',
    '4C': 'LATAM COLOMBIA',
    'UC': 'LATAM CARGO CHILE',
    'M3': 'LATAM CARGO BRASIL',
    'L7': 'LATAM CARGO COLOMBIA',
    '4M': 'LATAM ARGENTINA',
    'PZ': 'LATAM PARAGUAY',
    'HN': 'LATAM CARGO MEXICO'
  };

  const getCleanVal = (val: any) => {
    if (!val || val === '[NULL]') return '';
    return String(val).replace(/"/g, '').trim();
  };

  return {
    id: `ccv-${index}`,
    activation_type: 'new_registry',
    ac_owner: owners[ac['A/C owner']] || ac['A/C owner'] || 'N/A',
    ac_registration: getCleanVal(ac['A/C Registration']),
    acr: getCleanVal(ac['ACR']),
    ac_subtype: getCleanVal(ac['A/C Subtype']),
    rotation_code: getCleanVal(ac['Rot Code']),
    valid_from: getCleanVal(ac['Valid_From']),
    valid_to: getCleanVal(ac['Valid_To']),
    ac_type: getCleanVal(ac['A/C Type']),
    rst: getCleanVal(ac['RST']),
    local_type: getCleanVal(ac['Local Type']),
    local_subtype: getCleanVal(ac['Local Subtype']),
    icao_subtype: getCleanVal(ac['ICAO Subtype']),
    base_airport: getCleanVal(ac['Base Airport']) || 'SCL',
    category: getCleanVal(ac['Category']),
    name: getCleanVal(ac['Name']),
    active: getCleanVal(ac['Active']) === 'Y' ? 'TRUE' : 'FALSE',
    etops: getCleanVal(ac['ETOPS']),
    flight_range: getCleanVal(ac['Flight Range']),
    rff: getCleanVal(ac['RFF']),
    manufacturer: getCleanVal(ac['Manufacturer']),
    man_serial: getCleanVal(ac['Man: SL#']),
    engine: getCleanVal(ac['Engine']),
    engine_type: getCleanVal(ac['Engine Type']),
    delivered: getCleanVal(ac['Delivered']),
    selcal: getCleanVal(ac['SELCAL']),
    perf_index: getCleanVal(ac['Aircraft Performance Index']),
    max_dow: getCleanVal(ac['Max Dry Operating Weight']),
    max_zfw: getCleanVal(ac['Max Zero Fuel Weight']),
    max_rw: getCleanVal(ac['Max Ramp Weight']),
    max_tow: getCleanVal(ac['Max Takeoff Weight']),
    max_lw: getCleanVal(ac['Max Landing Weight']),
    hold_cap_vol: getCleanVal(ac['Hold Capacity(Vol)']),
    hold_cap_wgt: getCleanVal(ac['Hold Capacity(Wgt)']),
    physical_j: parseInt(getCleanVal(ac['Seat_Class_J']) || '0'),
    physical_w: parseInt(getCleanVal(ac['Seat_Class_W']) || '0'),
    physical_y: parseInt(getCleanVal(ac['Seat_Class_Y']) || '0'),
    tail_wind: getCleanVal(ac['Tail Wind']),
    cross_wind: getCleanVal(ac['Cross Wind']),
    cabin_jump_seat: getCleanVal(ac['Cabin Jump Seat']),
    cockpit_jump_seat: getCleanVal(ac['Cockpit Jump Seat']),
    remarks: getCleanVal(ac['Remarks']),
    status: 'pending',
    createdAt: new Date().toISOString(),
    checks: {
      ifn: { checked: false }, limops: { checked: false }, jta: { checked: false }, aircom: { checked: false }, 
      sicco: { checked: false }, ops_flt: { checked: false }, despacho: { checked: false }, mantenedor: { checked: false }, 
      videowall: { checked: false }, crew: { checked: false }, diccionario: { checked: false }, jira_ticket: { checked: false }
    }
  };
}

async function cloneData() {
  let parsedFromSheet: any[] = [];
  
  try {
    console.log('Fetching data from Google Sheet...');
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();

    if (!csvText.includes('<!DOCTYPE html>') && !csvText.includes('login') && !csvText.includes('Sign in')) {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim().toUpperCase()
      });
      
      parsedFromSheet = results.data
        .filter((row: any) => Object.values(row).some(v => v !== ''))
        .map((row: any, index: number) => mapToAircraft(row, index));
        
      console.log(`\x1b[32mSuccessfully cloned ${parsedFromSheet.length} aircrafts from Google Sheet.\x1b[0m`);
    } else {
       console.warn('\x1b[33mWarning: Google Sheet inaccessible.\x1b[0m');
    }
  } catch (error) {
    console.warn('\x1b[33mWarning: Error fetching sheet.\x1b[0m');
  }

  // Read local CSV source
  if (!fs.existsSync(FLEET_CSV_PATH)) {
    console.error(`Local CSV source not found at ${FLEET_CSV_PATH}`);
    return;
  }

  console.log('Processing local CSV source...');
  const localCsvText = fs.readFileSync(FLEET_CSV_PATH, 'utf8');
  const ccvResults = Papa.parse(localCsvText, {
    header: true,
    skipEmptyLines: 'greedy'
  });
  
  const now = new Date();
  
  const allRegistrations: string[] = [];
  const filteredLocalData = ccvResults.data
    .filter((row: any) => {
      const reg = row['A/C Registration'];
      if (!reg) return false;
      
      allRegistrations.push(reg);
      // Basic validation: active flag
      if (row['Active'] === 'N') return false;

      // Date filtering: ONLY skip if it's explicitly expired
      if (row['Valid_To']) {
        const toStr = String(row['Valid_To']);
        const to = new Date(toStr.replace(' ', 'T'));
        
        // Only skip if Valid_To is in the past
        if (!isNaN(to.getTime()) && now > to) return false;
      }
      
      return true;
    })
    .map((row: any, index: number) => mapToAircraft(row, parsedFromSheet.length + index));

  console.log(`Total registrations found in CSV: ${allRegistrations.length}`);
  console.log(`Registrations after filtering: ${filteredLocalData.length}`);

  // Merge: Ensure uniqueness by registration
  const finalFlota: any[] = [];
  const registered = new Set<string>();

  // Add sheet data (fresher)
  parsedFromSheet.forEach(row => {
    if (row.ac_registration && !registered.has(row.ac_registration)) {
      finalFlota.push(row);
      registered.add(row.ac_registration);
    }
  });

  // Add local CSV data (fallback/complement)
  filteredLocalData.forEach(row => {
    if (row.ac_registration && !registered.has(row.ac_registration)) {
      finalFlota.push(row);
      registered.add(row.ac_registration);
    }
  });

  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalFlota, null, 2));
  console.log(`\x1b[32mSuccessfully saved ${finalFlota.length} unique and valid aircrafts to ${OUTPUT_PATH}\x1b[0m`);
}

cloneData().catch(console.error);
