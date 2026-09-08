import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PreviousSet, WorkoutSession } from "@shared/types";

interface FitnessDB extends DBSchema {
  sessions: {
    key: string;
    value: {
      session: WorkoutSession;
      previous: PreviousSet[];
      dirty: boolean;
      updatedAt: number;
    };
  };
  queue: {
    key: string;
    value: {
      id: string;
      method: string;
      path: string;
      body: unknown;
      createdAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FitnessDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FitnessDB>("fitness-neu", 1, {
      upgrade(db) {
        db.createObjectStore("sessions");
        db.createObjectStore("queue", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function saveLocalSession(
  session: WorkoutSession,
  previous: PreviousSet[],
  dirty: boolean,
) {
  const db = await getDb();
  await db.put("sessions", { session, previous, dirty, updatedAt: Date.now() }, session.id);
}

export async function loadLocalSession(id: string) {
  const db = await getDb();
  return db.get("sessions", id);
}

export async function loadDirtySessions() {
  const db = await getDb();
  return db.getAll("sessions");
}

export async function clearLocalSession(id: string) {
  const db = await getDb();
  await db.delete("sessions", id);
}

export async function enqueueRequest(method: string, path: string, body: unknown) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.put("queue", { id, method, path, body, createdAt: Date.now() });
  return id;
}

export async function readQueue() {
  const db = await getDb();
  return db.getAll("queue");
}

export async function removeQueued(id: string) {
  const db = await getDb();
  await db.delete("queue", id);
}
