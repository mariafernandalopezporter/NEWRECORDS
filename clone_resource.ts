
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/15V3Q2rH5qAeHVQOIzWUtDaJvGmnFTrI4Uz6g3faobNY/export?format=csv&gid=1331518384';

async function cloneData() {
  console.log('Fetching data from Google Sheet...');
  const response = await fetch(SHEET_URL);
  const csvText = await response.text();
  
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().replace(/^\ufeff/, '').toUpperCase(),
    complete: (results) => {
      const headers = results.meta.fields || [];
      const parsed = results.data
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
            id: `ext-${index}`,
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
            base_airport: getVal(['BASE AIRPORT', 'BASE', 'STATION']) || 'UIO',
            category: getVal(['CATEGORY']) || '',
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
              ifn: {checked: false}, limops: {checked: false}, jta: {checked: false}, aircom: {checked: false}, sicco: {checked: false}, ops_flt: {checked: false}, despacho: {checked: false}, mantenedor: {checked: false}, videowall: {checked: false}, crew: {checked: false}, diccionario: {checked: false}, jira_ticket: {checked: false}
            }
          };
        });

      const dataDir = path.join(process.cwd(), 'src', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(dataDir, 'external_aircrafts.json'),
        JSON.stringify(parsed, null, 2)
      );
      
      console.log(`\x1b[32mSuccessfully cloned ${parsed.length} aircrafts to src/data/external_aircrafts.json\x1b[0m`);
      if (parsed.length > 0 && parsed[0].ac_type.includes('script')) {
        console.warn('\x1b[33mWarning: The data looks like a login page. Ensure the Google Sheet is set to "Anyone with the link can view".\x1b[0m');
      }
    }
  });
}

cloneData().catch(console.error);
