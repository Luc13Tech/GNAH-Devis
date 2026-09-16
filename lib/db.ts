import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  type AppSettings,
  type Client,
  type Quote,
  defaultSettings,
} from "./types";

interface GnaDevisDB extends DBSchema {
  quotes: {
    key: string;
    value: Quote;
    indexes: {
      "by-date": string;
      "by-status": string;
      "by-client": string;
    };
  };

  clients: {
    key: string;
    value: Client;
    indexes: {
      "by-name": string;
    };
  };

  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = "gna-devis-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GnaDevisDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB est disponible uniquement dans le navigateur.");
  }

  if (!dbPromise) {
    dbPromise = openDB<GnaDevisDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("quotes")) {
          const quotes = db.createObjectStore("quotes", {
            keyPath: "id",
          });

          quotes.createIndex("by-date", "date");
          quotes.createIndex("by-status", "status");
          quotes.createIndex("by-client", "client.name");
        }

        if (!db.objectStoreNames.contains("clients")) {
          const clients = db.createObjectStore("clients", {
            keyPath: "id",
          });

          clients.createIndex("by-name", "name");
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      },
    });
  }

  return dbPromise;
}

/* =========================================
   SETTINGS
========================================= */

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();

  const settings = await db.get("settings", "app");

  if (!settings) {
    await db.put("settings", defaultSettings, "app");

    return structuredClone(defaultSettings);
  }

  return settings;
}

export async function saveSettings(
  settings: AppSettings,
): Promise<void> {
  const db = await getDB();

  await db.put("settings", settings, "app");
}

/* =========================================
   QUOTES
========================================= */

export async function getQuotes(): Promise<Quote[]> {
  const db = await getDB();

  const quotes = await db.getAllFromIndex(
    "quotes",
    "by-date",
  );

  return quotes.sort((a, b) => {
    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  });
}

export async function saveQuote(
  quote: Quote,
): Promise<void> {
  const db = await getDB();

  await db.put("quotes", quote);
}

export async function deleteQuote(
  quoteId: string,
): Promise<void> {
  const db = await getDB();

  await db.delete("quotes", quoteId);
}

/* =========================================
   CLIENTS
========================================= */

export async function getClients(): Promise<Client[]> {
  const db = await getDB();

  const clients = await db.getAllFromIndex(
    "clients",
    "by-name",
  );

  return clients.sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
}

export async function saveClient(
  client: Client,
): Promise<void> {
  const db = await getDB();

  await db.put("clients", client);
}

/* =========================================
   EXPORT BACKUP
========================================= */

export async function exportBackup(): Promise<string> {
  const db = await getDB();

  const quotes = await db.getAll("quotes");
  const clients = await db.getAll("clients");
  const settings = await db.get("settings", "app");

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),

    quotes,
    clients,

    settings:
      settings ?? structuredClone(defaultSettings),
  };

  return JSON.stringify(backup, null, 2);
}

/* =========================================
   IMPORT BACKUP
========================================= */

export async function importBackup(
  json: string,
): Promise<void> {
  const data = JSON.parse(json) as {
    version?: number;
    quotes?: Quote[];
    clients?: Client[];
    settings?: AppSettings;
  };

  if (!data || typeof data !== "object") {
    throw new Error("Fichier de sauvegarde invalide.");
  }

  if (
    !Array.isArray(data.quotes) ||
    !Array.isArray(data.clients) ||
    !data.settings
  ) {
    throw new Error(
      "La sauvegarde ne contient pas toutes les données nécessaires.",
    );
  }

  const db = await getDB();

  const tx = db.transaction(
    ["quotes", "clients", "settings"],
    "readwrite",
  );

  for (const quote of data.quotes) {
    await tx.objectStore("quotes").put(quote);
  }

  for (const client of data.clients) {
    await tx.objectStore("clients").put(client);
  }

  await tx
    .objectStore("settings")
    .put(data.settings, "app");

  await tx.done;
}
