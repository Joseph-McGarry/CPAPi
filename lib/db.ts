import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type SupplyKey = string; // allow custom keys for new reminders

export type SupplyRow = {
  id: number;
  skey: SupplyKey;      // internal unique key
  label: string;        // user-facing name
  intervalDays: number; // 7,14,21,30,60,90,180
  lastReplaced: string; // ISO
  notifyHour: number;   // 0-23
  notifyMinute: number; // 0-59
  notificationId?: string | null;
};

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web. Run on iOS or Android.');
  }
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('cpapi.db');
    try { await _db.execAsync('PRAGMA journal_mode = WAL;'); } catch {}
  }
  return _db;
}

export async function initDatabase(): Promise<void> {
    const db = await getDb();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS supplies (
        id INTEGER PRIMARY KEY NOT NULL,
        skey TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        intervalDays INTEGER NOT NULL,
        lastReplaced TEXT NOT NULL,
        notifyHour INTEGER NOT NULL,
        notifyMinute INTEGER NOT NULL
      );
    `);
    // Add column if it doesn't exist (ignore error if it already exists)
    try { await db.execAsync(`ALTER TABLE supplies ADD COLUMN notificationId TEXT;`); } catch {}
  }
  
  // 3) Add this helper:
  export async function updateNotificationId(id: number, notificationId: string | null): Promise<void> {
    const db = await getDb();
    await db.runAsync(`UPDATE supplies SET notificationId=? WHERE id=?;`, [notificationId, id]);
  }

const DEFAULTS: Array<Pick<SupplyRow, 'skey' | 'label' | 'intervalDays' | 'notifyHour' | 'notifyMinute'>> = [
  { skey: 'Mask',          label: 'Mask',          intervalDays: 30, notifyHour: 21, notifyMinute: 0 },
  { skey: 'Nose Cushion',  label: 'Nose Cushion',  intervalDays: 7,  notifyHour: 21, notifyMinute: 0 },
  { skey: 'Hose',          label: 'Hose',          intervalDays: 90, notifyHour: 21, notifyMinute: 0 },
  { skey: 'Water Supply',  label: 'Water Supply',  intervalDays: 7,  notifyHour: 21, notifyMinute: 0 },
  { skey: 'Filter',        label: 'Filter',        intervalDays: 7,  notifyHour: 21, notifyMinute: 0 },
];

export async function seedDefaults(): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  for (const d of DEFAULTS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO supplies (skey, label, intervalDays, lastReplaced, notifyHour, notifyMinute)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [d.skey, d.label, d.intervalDays, nowIso, d.notifyHour, d.notifyMinute]
    );
  }
}

export async function getAllSupplies(): Promise<SupplyRow[]> {
  const db = await getDb();
  return await db.getAllAsync<SupplyRow>(`SELECT * FROM supplies ORDER BY label ASC;`);
}

export async function getSupplyById(id: number): Promise<SupplyRow | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<SupplyRow>(`SELECT * FROM supplies WHERE id=? LIMIT 1;`, [id]);
  return rows[0] ?? null;
}

export async function createSupply(
  label: string,
  intervalDays: number,
  notifyHour: number,
  notifyMinute: number
): Promise<SupplyRow> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const skey = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO supplies (skey, label, intervalDays, lastReplaced, notifyHour, notifyMinute)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [skey, label, intervalDays, nowIso, notifyHour, notifyMinute]
  );
  const rows = await db.getAllAsync<SupplyRow>(`SELECT * FROM supplies WHERE skey=? LIMIT 1;`, [skey]);
  return rows[0];
}

export async function updateSupplyById(
  id: number,
  updates: Partial<Pick<SupplyRow, 'label' | 'intervalDays' | 'notifyHour' | 'notifyMinute'>>
): Promise<void> {
  const db = await getDb();
  const current = await getSupplyById(id);
  if (!current) return;

  const next = {
    label: updates.label ?? current.label,
    intervalDays: updates.intervalDays ?? current.intervalDays,
    notifyHour: updates.notifyHour ?? current.notifyHour,
    notifyMinute: updates.notifyMinute ?? current.notifyMinute,
  };

  await db.runAsync(
    `UPDATE supplies SET label=?, intervalDays=?, notifyHour=?, notifyMinute=? WHERE id=?;`,
    [next.label, next.intervalDays, next.notifyHour, next.notifyMinute, id]
  );
}

export async function deleteSupplyById(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM supplies WHERE id=?;`, [id]);
}

export async function markReplacedNowById(id: number): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  await db.runAsync(`UPDATE supplies SET lastReplaced=? WHERE id=?;`, [nowIso, id]);
}

// (Kept for compatibility if you still call by skey somewhere)
export async function markReplacedNow(skey: SupplyKey): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  await db.runAsync(`UPDATE supplies SET lastReplaced=? WHERE skey=?;`, [nowIso, skey]);
}

