import { promises as fs } from 'fs';
import path from 'path';
import { DatabaseSchema, User, YieldRecord } from './types';

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

let cache: DatabaseSchema | null = null;

async function ensureLoaded(): Promise<DatabaseSchema> {
  if (!cache) {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    cache = JSON.parse(raw) as DatabaseSchema;
  }
  return cache;
}

async function persist(db: DatabaseSchema) {
  cache = db;
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function getUsers(): Promise<User[]> {
  const db = await ensureLoaded();
  return db.users;
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((user) => user.username === username);
}

export async function getRecords(): Promise<YieldRecord[]> {
  const db = await ensureLoaded();
  return db.records;
}

export async function getRecordById(id: string): Promise<YieldRecord | undefined> {
  const records = await getRecords();
  return records.find((record) => record.id === id);
}

export async function saveRecord(record: YieldRecord): Promise<YieldRecord> {
  const db = await ensureLoaded();
  db.records.push(record);
  await persist(db);
  return record;
}

export async function updateRecord(id: string, updates: Partial<YieldRecord>): Promise<YieldRecord | undefined> {
  const db = await ensureLoaded();
  const index = db.records.findIndex((record) => record.id === id);
  if (index === -1) return undefined;
  const updated: YieldRecord = { ...db.records[index], ...updates, id } as YieldRecord;
  db.records[index] = updated;
  await persist(db);
  return updated;
}

export async function deleteRecord(id: string): Promise<boolean> {
  const db = await ensureLoaded();
  const initialLength = db.records.length;
  db.records = db.records.filter((record) => record.id !== id);
  const changed = db.records.length !== initialLength;
  if (changed) {
    await persist(db);
  }
  return changed;
}

export function getDatabasePath(): string {
  return DB_PATH;
}
