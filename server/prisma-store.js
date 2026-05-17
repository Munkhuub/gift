import { prisma } from "../lib/prisma.ts";
import { reseedPrisma } from "../prisma/seed-data.js";
import { normalizeClient } from "../src/data/clients.js";
import { TIERS } from "../src/data/clients.js";

function today() {
  return new Date().toISOString().split("T")[0];
}

function toDate(value) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().split("T")[0];
}

function mapPrismaClient(client) {
  return normalizeClient({
    id: client.id,
    last: client.lastName,
    first: client.firstName,
    phone: client.phoneMasked,
    tier: client.tier,
    giftDone: client.giftDone,
    giftDate: formatDate(client.giftDate),
    loan: client.hasLoan,
    note: client.note,
    giftType: client.giftType,
    deliveredBy: client.deliveredBy,
  });
}

function mapGiftLog(log) {
  return {
    id: log.id,
    clientId: log.client.id,
    clientName: `${log.client.lastName} ${log.client.firstName}`,
    tier: log.client.tier,
    phone: log.client.phoneMasked,
    giftType: log.giftType,
    deliveredBy: log.deliveredBy || "",
    note: log.note || "",
    deliveredAt: new Date(log.deliveredAt).toISOString().split("T")[0],
  };
}

function buildClientFilters({ tier, search, status } = {}) {
  const where = {};
  const normalizedTier = typeof tier === "string" ? tier.toUpperCase() : "";
  const normalizedStatus =
    typeof status === "string" ? status.toLowerCase() : "";
  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  if (TIERS.includes(normalizedTier)) {
    where.tier = normalizedTier;
  }

  if (normalizedStatus === "pending") {
    where.giftDone = false;
  }

  if (normalizedStatus === "delivered") {
    where.giftDone = true;
  }

  if (normalizedSearch) {
    where.OR = [
      {
        firstName: {
          contains: normalizedSearch,
          mode: "insensitive",
        },
      },
      {
        lastName: {
          contains: normalizedSearch,
          mode: "insensitive",
        },
      },
      {
        phoneMasked: {
          contains: normalizedSearch,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

async function ensurePrismaSeeded() {
  const count = await prisma.client.count();

  if (count === 0) {
    await reseedPrisma(prisma);
  }
}

export function getStoreProvider() {
  return "prisma";
}

export async function ensureClientStore() {
  await ensurePrismaSeeded();
}

export async function resetClientStore() {
  return reseedPrisma(prisma);
}

export async function listClients(filters = {}) {
  await ensureClientStore();
  const clients = await prisma.client.findMany({
    where: buildClientFilters(filters),
    orderBy: { id: "asc" },
  });

  return clients.map(mapPrismaClient);
}

export async function listGiftLogs({ limit = 8 } = {}) {
  await ensureClientStore();
  const parsedLimit = Number(limit);
  const take = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 20))
    : 8;

  const logs = await prisma.giftLog.findMany({
    take,
    orderBy: [{ deliveredAt: "desc" }, { id: "desc" }],
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tier: true,
          phoneMasked: true,
        },
      },
    },
  });

  return logs.map(mapGiftLog);
}

export async function markClientDelivered(clientId, giftDate = today()) {
  await ensureClientStore();
  const id = Number(clientId);
  const existing = await prisma.client.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const [, updated] = await prisma.$transaction([
    prisma.giftLog.create({
      data: {
        clientId: id,
        giftType: existing.giftType || "Gift delivery",
        deliveredBy: existing.deliveredBy || null,
        note: existing.note || "",
        deliveredAt: toDate(giftDate) || new Date(),
      },
    }),
    prisma.client.update({
      where: { id },
      data: {
        giftDone: true,
        giftDate: toDate(giftDate),
        giftType: existing.giftType || "Gift delivery",
      },
    }),
  ]);

  return mapPrismaClient(updated);
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
  const giftDate = date || today();
  const giftType = type || "";
  const staffName = deliveredBy || "";
  const hasLoan = Boolean(loan);
  const clientNote = note || "";
  const existing = await prisma.client.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const [, updated] = await prisma.$transaction([
    prisma.giftLog.create({
      data: {
        clientId: id,
        giftType: giftType || "Gift delivery",
        deliveredBy: staffName || null,
        note: clientNote,
        deliveredAt: toDate(giftDate) || new Date(),
      },
    }),
    prisma.client.update({
      where: { id },
      data: {
        giftDone: true,
        giftDate: toDate(giftDate),
        giftType,
        deliveredBy: staffName,
        hasLoan,
        note: clientNote,
      },
    }),
  ]);

  return mapPrismaClient(updated);
}
