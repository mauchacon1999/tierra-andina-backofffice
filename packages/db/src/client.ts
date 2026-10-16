import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export interface CreateDbOptions {
  /** Máximo de conexiones en el pool. */
  max?: number;
  /** Segundos antes de abortar un intento de conexión. */
  connectTimeout?: number;
}

/** Crea un cliente Drizzle independiente (útil para tests o para la base de test). */
export function createDb(url: string, options: CreateDbOptions = {}) {
  const client = postgres(url, {
    max: options.max ?? 10,
    connect_timeout: options.connectTimeout ?? 5,
    onnotice: () => {},
  });
  const db = drizzle(client, { schema });

  return {
    db,
    client,
    /** Ejecuta SELECT 1. Lanza si la base no responde. */
    ping: async (): Promise<void> => {
      await db.execute(sql`select 1`);
    },
    close: (): Promise<void> => client.end({ timeout: 5 }),
  };
}

export type DbClient = ReturnType<typeof createDb>;
export type Database = DbClient["db"];

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[@ta/db] Falta la variable DATABASE_URL. Copia .env.example a .env en la raíz del repo.",
    );
  }
  return url;
}

// Instancia por defecto. postgres.js es perezoso: no abre conexiones hasta la primera consulta.
const defaultClient = createDb(requireDatabaseUrl());

export const db = defaultClient.db;
export const ping = defaultClient.ping;
export const closeDb = defaultClient.close;
