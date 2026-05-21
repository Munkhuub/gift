import { prisma } from "../lib/prisma.js";
import {
  reseedPrisma,
  seedMarketingResources,
} from "../prisma/seed-data.js";
import { normalizeClient } from "../src/data/clients.js";
import { TIERS } from "../src/data/clients.js";
import {
  MARKETING_RESOURCE_STATUSES,
  MARKETING_RESOURCE_TYPES,
  normalizeMarketingResource,
} from "../src/data/marketingResources.js";

function today() {
  return new Date().toISOString().split("T")[0];
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function mapMarketingResource(resource) {
  return normalizeMarketingResource({
    id: resource.id,
    name: resource.name,
    campaign: resource.campaign,
    resourceType: resource.resourceType,
    owner: resource.owner,
    status: resource.status,
    quantity: resource.quantity,
    budget: resource.budget,
    neededBy: formatDate(resource.neededBy),
    vendor: resource.vendor,
    note: resource.note,
  });
}

function buildDateRange({ date, dateFrom, dateTo } = {}) {
  const exactDate = toDate(date);
  if (exactDate) {
    const nextDay = new Date(exactDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return { gte: exactDate, lt: nextDay };
  }

  const range = {};
  const fromDate = toDate(dateFrom);
  const toDateValue = toDate(dateTo);

  if (fromDate) {
    range.gte = fromDate;
  }

  if (toDateValue) {
    const nextDay = new Date(toDateValue);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    range.lt = nextDay;
  }

  return Object.keys(range).length > 0 ? range : null;
}

function buildClientFilters({
  tier,
  search,
  status,
  giftDate,
  dateFrom,
  dateTo,
} = {}) {
  const where = {};
  const normalizedTier = typeof tier === "string" ? tier.toUpperCase() : "";
  const normalizedStatus =
    typeof status === "string" ? status.toLowerCase() : "";
  const normalizedSearch = typeof search === "string" ? search.trim() : "";
  const giftDateRange = buildDateRange({
    date: giftDate,
    dateFrom,
    dateTo,
  });

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

  if (giftDateRange) {
    where.giftDate = giftDateRange;
  }

  return where;
}

function buildMarketingResourceFilters({
  status,
  resourceType,
  search,
  neededBy,
  dateFrom,
  dateTo,
} = {}) {
  const where = {};
  const normalizedStatus =
    typeof status === "string" ? status.toUpperCase() : "";
  const normalizedType =
    typeof resourceType === "string" ? resourceType.toUpperCase() : "";
  const normalizedSearch = typeof search === "string" ? search.trim() : "";
  const neededByRange = buildDateRange({
    date: neededBy,
    dateFrom,
    dateTo,
  });

  if (MARKETING_RESOURCE_STATUSES.includes(normalizedStatus)) {
    where.status = normalizedStatus;
  }

  if (MARKETING_RESOURCE_TYPES.includes(normalizedType)) {
    where.resourceType = normalizedType;
  }

  if (normalizedSearch) {
    where.OR = [
      { name: { contains: normalizedSearch, mode: "insensitive" } },
      { campaign: { contains: normalizedSearch, mode: "insensitive" } },
      { owner: { contains: normalizedSearch, mode: "insensitive" } },
      { vendor: { contains: normalizedSearch, mode: "insensitive" } },
    ];
  }

  if (neededByRange) {
    where.neededBy = neededByRange;
  }

  return where;
}

async function ensurePrismaSeeded() {
  const [clientCount, marketingResourceCount] = await Promise.all([
    prisma.client.count(),
    prisma.marketingResource.count(),
  ]);

  if (clientCount === 0) {
    await reseedPrisma(prisma);
    return;
  }

  if (marketingResourceCount === 0) {
    await seedMarketingResources(prisma);
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

export async function listGiftLogs({
  limit = 8,
  tier,
  date,
  dateFrom,
  dateTo,
} = {}) {
  await ensureClientStore();
  const parsedLimit = Number(limit);
  const take = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 20))
    : 8;
  const normalizedTier = typeof tier === "string" ? tier.toUpperCase() : "";
  const deliveredAtRange = buildDateRange({
    date,
    dateFrom,
    dateTo,
  });
  const where = {};

  if (TIERS.includes(normalizedTier)) {
    where.client = { tier: normalizedTier };
  }

  if (deliveredAtRange) {
    where.deliveredAt = deliveredAtRange;
  }

  const logs = await prisma.giftLog.findMany({
    take,
    where,
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

export async function listMarketingResources(filters = {}) {
  await ensureClientStore();
  const resources = await prisma.marketingResource.findMany({
    where: buildMarketingResourceFilters(filters),
    orderBy: [{ neededBy: "asc" }, { id: "asc" }],
  });

  return resources.map(mapMarketingResource);
}

export async function createMarketingResource({
  name,
  campaign,
  resourceType,
  owner,
  status,
  quantity,
  budget,
  neededBy,
  vendor,
  note,
}) {
  await ensureClientStore();

  const created = await prisma.marketingResource.create({
    data: {
      name: name.trim(),
      campaign: campaign?.trim() || "",
      resourceType,
      owner: owner?.trim() || "",
      status,
      quantity:
        quantity === null || quantity === undefined || quantity === ""
          ? null
          : Number(quantity),
      budget:
        budget === null || budget === undefined || budget === ""
          ? null
          : Number(budget),
      neededBy: toDate(neededBy),
      vendor: vendor?.trim() || "",
      note: note?.trim() || "",
    },
  });

  return mapMarketingResource(created);
}

export async function updateMarketingResource(resourceId, updates = {}) {
  await ensureClientStore();
  const id = Number(resourceId);
  const existing = await prisma.marketingResource.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const data = {};

  if (typeof updates.status === "string") {
    data.status = updates.status.toUpperCase();
  }

  if (typeof updates.owner === "string") {
    data.owner = updates.owner.trim();
  }

  if (typeof updates.note === "string") {
    data.note = updates.note.trim();
  }

  if (typeof updates.vendor === "string") {
    data.vendor = updates.vendor.trim();
  }

  if (typeof updates.neededBy === "string") {
    data.neededBy = toDate(updates.neededBy);
  }

  if (
    updates.quantity === null ||
    updates.quantity === "" ||
    updates.quantity === undefined
  ) {
    if ("quantity" in updates) {
      data.quantity = null;
    }
  } else {
    data.quantity = Number(updates.quantity);
  }

  if (
    updates.budget === null ||
    updates.budget === "" ||
    updates.budget === undefined
  ) {
    if ("budget" in updates) {
      data.budget = null;
    }
  } else {
    data.budget = Number(updates.budget);
  }

  const updated = await prisma.marketingResource.update({
    where: { id },
    data,
  });

  return mapMarketingResource(updated);
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
