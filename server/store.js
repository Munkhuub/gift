import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { initialClients, normalizeClient } from "../src/data/clients.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile =
  process.env.CLIENTS_DB_FILE || path.join(__dirname, "data", "clients.sqlite");
const seedClients = initialClients.map(normalizeClient);
const preferredStoreProvider = process.env.STORE_PROVIDER || "";
const isVercelRuntime = process.env.VERCEL === "1";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";
let db;
let supabase;
let memoryClients = seedClients.map(normalizeClient);

function today() {
  return new Date().toISOString().split("T")[0];
}

export function getStoreProvider() {
  if (shouldUseSupabase()) {
    return "supabase";
  }

  if (shouldUseMemory()) {
    return "memory";
  }

  return "sqlite";
}

function shouldUseSupabase() {
  if (preferredStoreProvider) {
    return preferredStoreProvider.toLowerCase() === "supabase";
  }

  return hasSupabaseConfig();
}

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function shouldUseMemory() {
  if (preferredStoreProvider) {
    return preferredStoreProvider.toLowerCase() === "memory";
  }

  return isVercelRuntime && !hasSupabaseConfig();
}

function getSupabase() {
  if (!shouldUseSupabase()) {
    return null;
  }

  if (supabase) {
    return supabase;
  }

  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}

function getDb() {
  if (db) {
    return db;
  }

  db = new DatabaseSync(dataFile);
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY,
      last TEXT NOT NULL,
      first TEXT NOT NULL,
      phone TEXT NOT NULL,
      tier TEXT NOT NULL,
      gift_done INTEGER NOT NULL DEFAULT 0,
      gift_date TEXT NOT NULL DEFAULT '',
      loan INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      gift_type TEXT NOT NULL DEFAULT '',
      delivered_by TEXT NOT NULL DEFAULT ''
    );
  `);

  return db;
}

function mapClientToSupabaseRow(client) {
  return {
    id: client.id,
    last_name: client.last,
    first_name: client.first,
    phone_masked: client.phone,
    tier: client.tier,
    gift_done: client.giftDone,
    gift_date: client.giftDate || null,
    has_loan: client.loan,
    note: client.note,
    gift_type: client.giftType,
    delivered_by: client.deliveredBy,
  };
}

function mapSupabaseRowToClient(row) {
  return normalizeClient({
    id: row.id,
    last: row.last_name,
    first: row.first_name,
    phone: row.phone_masked,
    tier: row.tier,
    giftDone: row.gift_done,
    giftDate: row.gift_date || "",
    loan: row.has_loan,
    note: row.note,
    giftType: row.gift_type,
    deliveredBy: row.delivered_by,
  });
}

function mapRowToClient(row) {
  return normalizeClient({
    id: row.id,
    last: row.last,
    first: row.first,
    phone: row.phone,
    tier: row.tier,
    giftDone: row.gift_done,
    giftDate: row.gift_date,
    loan: row.loan,
    note: row.note,
    giftType: row.gift_type,
    deliveredBy: row.delivered_by,
  });
}

function seedDatabase(database) {
  const row = database.prepare("SELECT COUNT(*) AS count FROM clients").get();

  if (row.count > 0) {
    return;
  }

  insertSeedClients(database);
}

function insertSeedClients(database) {
  const insert = database.prepare(`
    INSERT INTO clients (
      id, last, first, phone, tier, gift_done, gift_date, loan, note, gift_type, delivered_by
    ) VALUES (
      @id, @last, @first, @phone, @tier, @gift_done, @gift_date, @loan, @note, @gift_type, @delivered_by
    )
  `);

  for (const client of seedClients) {
    insert.run({
      id: client.id,
      last: client.last,
      first: client.first,
      phone: client.phone,
      tier: client.tier,
      gift_done: client.giftDone ? 1 : 0,
      gift_date: client.giftDate,
      loan: client.loan ? 1 : 0,
      note: client.note,
      gift_type: client.giftType,
      delivered_by: client.deliveredBy,
    });
  }
}

async function seedSupabaseDatabase(client) {
  const { count, error, status } = await client
    .from("clients")
    .select("id", { count: "exact", head: true });

  if (error) {
    if (status === 401 || error.code === "PGRST301") {
      throw new Error(
        "Supabase rejected the API key with 401 Unauthorized. Check that SUPABASE_URL and SUPABASE_SECRET_KEY come from the same project.",
      );
    }
    if (status === 403 || error.code === "42501") {
      throw new Error(
        "Supabase secret key is valid, but service_role does not have table permissions. Re-run server/supabase-schema.sql so the GRANT statements apply.",
      );
    }
    throw new Error(
      `Supabase clients table is not ready. Run server/supabase-schema.sql in Supabase SQL Editor first. ${error.message}`,
    );
  }

  if ((count || 0) > 0) {
    return;
  }

  const { error: insertError } = await client
    .from("clients")
    .insert(seedClients.map(mapClientToSupabaseRow));

  if (insertError) {
    throw new Error(`Could not seed Supabase mock data. ${insertError.message}`);
  }
}

async function ensureSupabaseStore() {
  const client = getSupabase();
  await seedSupabaseDatabase(client);
}

export async function resetClientStore() {
  if (shouldUseSupabase()) {
    const client = getSupabase();
    const { error: deleteError } = await client
      .from("clients")
      .delete()
      .gte("id", 0);

    if (deleteError) {
      throw new Error(`Could not clear Supabase client data. ${deleteError.message}`);
    }

    const { error: insertError } = await client
      .from("clients")
      .insert(seedClients.map(mapClientToSupabaseRow));

    if (insertError) {
      throw new Error(`Could not seed Supabase mock data. ${insertError.message}`);
    }

    return seedClients.length;
  }

  if (shouldUseMemory()) {
    memoryClients = seedClients.map(normalizeClient);
    return memoryClients.length;
  }

  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const database = getDb();
  database.exec("DELETE FROM clients");
  insertSeedClients(database);
  return seedClients.length;
}

export async function ensureClientStore() {
  if (shouldUseSupabase()) {
    await ensureSupabaseStore();
    return;
  }

  if (shouldUseMemory()) {
    return;
  }

  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  seedDatabase(getDb());
}

export async function listClients() {
  await ensureClientStore();

  if (shouldUseSupabase()) {
    const client = getSupabase();
    const { data, error } = await client
      .from("clients")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Could not load clients from Supabase. ${error.message}`);
    }

    return data.map(mapSupabaseRowToClient);
  }

  if (shouldUseMemory()) {
    return memoryClients.map(normalizeClient);
  }

  const rows = getDb()
    .prepare("SELECT * FROM clients ORDER BY id ASC")
    .all();
  return rows.map(mapRowToClient);
}

export async function markClientDelivered(clientId, giftDate = today()) {
  await ensureClientStore();
  const id = Number(clientId);

  if (shouldUseSupabase()) {
    const client = getSupabase();
    const { data, error } = await client
      .from("clients")
      .update({
        gift_done: true,
        gift_date: giftDate,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Could not update Supabase client. ${error.message}`);
    }

    return mapSupabaseRowToClient(data);
  }

  if (shouldUseMemory()) {
    let updatedClient = null;

    memoryClients = memoryClients.map((client) => {
      if (client.id !== id) {
        return client;
      }

      updatedClient = normalizeClient({
        ...client,
        giftDone: true,
        giftDate,
      });
      return updatedClient;
    });

    return updatedClient;
  }

  const database = getDb();
  const existing = database
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(id);

  if (!existing) {
    return null;
  }

  database
    .prepare("UPDATE clients SET gift_done = 1, gift_date = ? WHERE id = ?")
    .run(giftDate, id);

  return mapRowToClient({
    ...existing,
    gift_done: 1,
    gift_date: giftDate,
  });
}

export async function logGiftDelivery({
  clientId,
  date,
  type,
  deliveredBy,
  loan,
  note,
}) {
  await ensureClientStore();
  const id = Number(clientId);
  const nextGiftDate = date || today();
  const nextGiftType = type || "";
  const nextDeliveredBy = deliveredBy || "";
  const nextLoan = loan ? 1 : 0;
  const nextNote = note || "";

  if (shouldUseSupabase()) {
    const client = getSupabase();
    const { data, error } = await client
      .from("clients")
      .update({
        gift_done: true,
        gift_date: nextGiftDate,
        gift_type: nextGiftType,
        delivered_by: nextDeliveredBy,
        has_loan: Boolean(nextLoan),
        note: nextNote,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Could not log gift delivery in Supabase. ${error.message}`);
    }

    return mapSupabaseRowToClient(data);
  }

  if (shouldUseMemory()) {
    let updatedClient = null;

    memoryClients = memoryClients.map((client) => {
      if (client.id !== id) {
        return client;
      }

      updatedClient = normalizeClient({
        ...client,
        giftDone: true,
        giftDate: nextGiftDate,
        giftType: nextGiftType,
        deliveredBy: nextDeliveredBy,
        loan: Boolean(nextLoan),
        note: nextNote,
      });
      return updatedClient;
    });

    return updatedClient;
  }

  const database = getDb();
  const existing = database
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(id);

  if (!existing) {
    return null;
  }

  database
    .prepare(`
      UPDATE clients
      SET gift_done = 1,
          gift_date = ?,
          gift_type = ?,
          delivered_by = ?,
          loan = ?,
          note = ?
      WHERE id = ?
    `)
    .run(nextGiftDate, nextGiftType, nextDeliveredBy, nextLoan, nextNote, id);

  return mapRowToClient({
    ...existing,
    gift_done: 1,
    gift_date: nextGiftDate,
    gift_type: nextGiftType,
    delivered_by: nextDeliveredBy,
    loan: nextLoan,
    note: nextNote,
  });
}
