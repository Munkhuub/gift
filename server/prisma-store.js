import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  resetMarketingResources,
  reseedPrisma,
} from "../prisma/seed-data.js";
import { normalizeClient } from "../src/data/clients.js";
import { TIERS } from "../src/data/clients.js";
import {
  MERCH_CATEGORIES,
  normalizeMarketingMerchItem,
  normalizeMarketingMerchIssue,
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
    previousTier: client.previousTier || "",
    giftDone: client.giftDone,
    giftStillOwed: client.giftStillOwed,
    giftEligibilityStatus: client.giftEligibilityStatus,
    giftDate: formatDate(client.giftDate),
    loan: client.hasLoan,
    pickupNotified: client.pickupNotified,
    pickupCenter: client.pickupCenter,
    pickupNotifiedAt: formatDate(client.pickupNotifiedAt),
    isWaitlist: client.isWaitlist,
    tierChangedAt: formatDate(client.tierChangedAt),
    statusReason: client.statusReason,
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

function mapMarketingMerchItem(item) {
  return normalizeMarketingMerchItem({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    totalStock: item.totalStock,
    issuedStock: item.issuedStock,
    storageLocation: item.storageLocation,
    note: item.note,
  });
}

function mapMarketingMerchIssue(issue) {
  return normalizeMarketingMerchIssue({
    id: issue.id,
    itemId: issue.item.id,
    itemName: issue.item.name,
    category: issue.item.category,
    quantity: issue.quantity,
    recipientName: issue.recipientName,
    purpose: issue.purpose,
    issuedBy: issue.issuedBy,
    issuedAt: formatDate(issue.issuedAt),
    note: issue.note,
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
  queue,
  giftDate,
  dateFrom,
  dateTo,
} = {}) {
  const where = {};
  const normalizedTier = typeof tier === "string" ? tier.toUpperCase() : "";
  const normalizedStatus =
    typeof status === "string" ? status.toLowerCase() : "";
  const normalizedQueue = typeof queue === "string" ? queue.toLowerCase() : "";
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
    where.giftStillOwed = true;
    where.giftDone = false;
  }

  if (normalizedStatus === "delivered") {
    where.giftDone = true;
  }

  if (normalizedQueue === "active_god") {
    where.tier = "GOD";
  }

  if (normalizedQueue === "gift_owed") {
    where.giftStillOwed = true;
  }

  if (normalizedQueue === "former_god_owed") {
    where.previousTier = "GOD";
    where.giftStillOwed = true;
    where.NOT = { tier: "GOD" };
  }

  if (normalizedQueue === "waitlist_god") {
    where.tier = "GOD";
    where.isWaitlist = true;
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
      {
        note: {
          contains: normalizedSearch,
          mode: "insensitive",
        },
      },
      {
        statusReason: {
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

function buildMarketingInventoryFilters({
  category,
  search,
} = {}) {
  const where = {};
  const normalizedCategory =
    typeof category === "string" ? category.toUpperCase() : "";
  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  if (MERCH_CATEGORIES.includes(normalizedCategory)) {
    where.category = normalizedCategory;
  }

  if (normalizedSearch) {
    where.OR = [
      { name: { contains: normalizedSearch, mode: "insensitive" } },
      { storageLocation: { contains: normalizedSearch, mode: "insensitive" } },
      { note: { contains: normalizedSearch, mode: "insensitive" } },
    ];
  }

  return where;
}

async function ensurePrismaSeeded() {
  const [clientCount, merchItemCount, merchIssueCount] = await Promise.all([
    prisma.client.count(),
    prisma.marketingMerchItem.count(),
    prisma.marketingMerchIssue.count(),
  ]);

  if (clientCount === 0) {
    await reseedPrisma(prisma);
    return;
  }

  if (merchItemCount === 0 || merchIssueCount === 0) {
    await resetMarketingResources(prisma);
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
  const resources = await prisma.marketingMerchItem.findMany({
    where: buildMarketingInventoryFilters(filters),
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return resources.map(mapMarketingMerchItem);
}

export async function createMarketingResource({
  name,
  category,
  unit,
  totalStock,
  storageLocation,
  note,
}) {
  await ensureClientStore();

  const created = await prisma.marketingMerchItem.create({
    data: {
      name: name.trim(),
      category,
      unit: unit?.trim() || "pcs",
      totalStock: Number(totalStock || 0),
      issuedStock: 0,
      storageLocation: storageLocation?.trim() || "",
      note: note?.trim() || "",
    },
  });

  return mapMarketingMerchItem(created);
}

export async function updateMarketingResource(resourceId, updates = {}) {
  await ensureClientStore();
  const id = Number(resourceId);
  const existing = await prisma.marketingMerchItem.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const data = {};

  if (typeof updates.storageLocation === "string") {
    data.storageLocation = updates.storageLocation.trim();
  }

  if (typeof updates.unit === "string") {
    data.unit = updates.unit.trim();
  }

  if (typeof updates.note === "string") {
    data.note = updates.note.trim();
  }

  if (
    updates.totalStock === null ||
    updates.totalStock === "" ||
    updates.totalStock === undefined
  ) {
    if ("totalStock" in updates) {
      data.totalStock = existing.totalStock;
    }
  } else {
    data.totalStock = Number(updates.totalStock);
    if (data.totalStock < existing.issuedStock) {
      data.totalStock = existing.issuedStock;
    }
  }

  const updated = await prisma.marketingMerchItem.update({
    where: { id },
    data,
  });

  return mapMarketingMerchItem(updated);
}

export async function listMarketingResourceIssues({
  limit = 12,
  itemId,
  date,
  dateFrom,
  dateTo,
  search,
} = {}) {
  await ensureClientStore();
  const parsedLimit = Number(limit);
  const take = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 50))
    : 12;
  const where = {};
  const issuedAtRange = buildDateRange({ date, dateFrom, dateTo });
  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  if (itemId) {
    where.itemId = Number(itemId);
  }

  if (issuedAtRange) {
    where.issuedAt = issuedAtRange;
  }

  if (normalizedSearch) {
    where.OR = [
      { recipientName: { contains: normalizedSearch, mode: "insensitive" } },
      { purpose: { contains: normalizedSearch, mode: "insensitive" } },
      { issuedBy: { contains: normalizedSearch, mode: "insensitive" } },
      { note: { contains: normalizedSearch, mode: "insensitive" } },
      {
        item: {
          name: { contains: normalizedSearch, mode: "insensitive" },
        },
      },
    ];
  }

  const issues = await prisma.marketingMerchIssue.findMany({
    take,
    where,
    orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
    include: {
      item: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
  });

  return issues.map(mapMarketingMerchIssue);
}

export async function createMarketingResourceIssue({
  itemId,
  quantity,
  recipientName,
  purpose,
  issuedBy,
  issuedAt,
  note,
}) {
  await ensureClientStore();
  const id = Number(itemId);
  const parsedQuantity = Number(quantity || 0);
  const existing = await prisma.marketingMerchItem.findUnique({
    where: { id },
  });

  if (!existing) {
    return { error: "Merch item not found." };
  }

  const remainingStock = Math.max(existing.totalStock - existing.issuedStock, 0);

  if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
    return { error: "quantity must be greater than 0." };
  }

  if (parsedQuantity > remainingStock) {
    return {
      error: `Only ${remainingStock} item${remainingStock === 1 ? "" : "s"} remain in stock.`,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw(
      Prisma.sql`
        UPDATE "marketing_merch_items"
        SET "issuedStock" = "issuedStock" + ${parsedQuantity}
        WHERE "id" = ${id}
          AND ("totalStock" - "issuedStock") >= ${parsedQuantity}
        RETURNING
          "id",
          "name",
          "category",
          "unit",
          "totalStock",
          "issuedStock",
          "storageLocation",
          "note"
      `,
    );

    if (!Array.isArray(lockedRows) || lockedRows.length === 0) {
      const latest = await tx.marketingMerchItem.findUnique({
        where: { id },
        select: {
          totalStock: true,
          issuedStock: true,
        },
      });
      const latestRemaining = latest
        ? Math.max(latest.totalStock - latest.issuedStock, 0)
        : 0;

      return {
        error: `Only ${latestRemaining} item${latestRemaining === 1 ? "" : "s"} remain in stock.`,
      };
    }

    const issue = await tx.marketingMerchIssue.create({
      data: {
        itemId: id,
        quantity: parsedQuantity,
        recipientName: recipientName?.trim() || "",
        purpose: purpose?.trim() || "",
        issuedBy: issuedBy?.trim() || "",
        issuedAt: toDate(issuedAt) || new Date(),
        note: note?.trim() || "",
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return {
      item: mapMarketingMerchItem(lockedRows[0]),
      issue: mapMarketingMerchIssue(issue),
    };
  });

  return result;
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

  if (existing.giftDone) {
    return { error: "Энэ харилцагчийн бэлэг аль хэдийн хүргэгдсэн байна." };
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
        giftStillOwed: false,
        giftEligibilityStatus: "DELIVERED",
        giftDate: toDate(giftDate),
        giftType: existing.giftType || "Gift delivery",
      },
    }),
  ]);

  return { client: mapPrismaClient(updated) };
}

export async function logGiftDelivery({
  clientId,
  date,
  type,
  deliveredBy,
  loan,
  note,
  items,
}) {
  await ensureClientStore();
  const id = Number(clientId);
  const giftDate = date || today();
  const giftType = type || "";
  const staffName = deliveredBy || "";
  const hasLoan = Boolean(loan);
  const clientNote = note || "";
  const requestedItems = Array.isArray(items) ? items : [];
  const existing = await prisma.client.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  if (existing.giftDone) {
    return { error: "Энэ харилцагчийн бэлэг аль хэдийн хүргэгдсэн байна." };
  }

  // Normalize & validate inventory items (optional).
  const normalizedItems = requestedItems
    .map((entry) => ({
      itemId: Number(entry?.itemId),
      quantity: Number(entry?.quantity ?? 1),
    }))
    .filter((entry) => Number.isFinite(entry.itemId) && entry.itemId > 0)
    .map((entry) => ({
      itemId: entry.itemId,
      quantity:
        Number.isFinite(entry.quantity) && entry.quantity > 0
          ? Math.floor(entry.quantity)
          : 1,
    }));

  // Merge duplicates by itemId.
  const byId = new Map();
  for (const entry of normalizedItems) {
    byId.set(entry.itemId, (byId.get(entry.itemId) || 0) + entry.quantity);
  }
  const mergedItems = Array.from(byId, ([itemId, quantity]) => ({
    itemId,
    quantity,
  }));

  const selectedItemIds = mergedItems.map((entry) => entry.itemId);
  const selectedInventoryItems =
    selectedItemIds.length > 0
      ? await prisma.marketingMerchItem.findMany({
          where: {
            id: {
              in: selectedItemIds,
            },
          },
          select: {
            id: true,
            name: true,
            totalStock: true,
            issuedStock: true,
          },
        })
      : [];

  const inventoryById = new Map(
    selectedInventoryItems.map((item) => [Number(item.id), item]),
  );

  for (const entry of mergedItems) {
    const item = inventoryById.get(entry.itemId);

    if (!item) {
      return { error: "Сонгосон мерч олдсонгүй." };
    }

    const remaining = Math.max(
      Number(item.totalStock || 0) - Number(item.issuedStock || 0),
      0,
    );

    if (entry.quantity > remaining) {
      return {
        error: `${item.name}: үлдэгдэл хүрэлцэхгүй байна (үлдсэн: ${remaining}).`,
      };
    }
  }

  try {
    const deliveredAt = toDate(giftDate) || new Date();
    const clientName = `${existing.lastName} ${existing.firstName}`.trim();
    const resolvedGiftType =
      giftType ||
      mergedItems
        .map((entry) => inventoryById.get(entry.itemId)?.name || "")
        .filter(Boolean)
        .join(" • ") ||
      "Gift delivery";

    const updated = await prisma.$transaction(async (tx) => {
      // Deduct inventory first; if any row is already consumed by another
      // request, abort before writing delivery history.
      if (mergedItems.length > 0) {
        for (const entry of mergedItems) {
          const lockedRows = await tx.$queryRaw(
            Prisma.sql`
              UPDATE "marketing_merch_items"
              SET "issuedStock" = "issuedStock" + ${entry.quantity}
              WHERE "id" = ${entry.itemId}
                AND ("totalStock" - "issuedStock") >= ${entry.quantity}
              RETURNING "id"
            `,
          );

          if (!Array.isArray(lockedRows) || lockedRows.length === 0) {
            const itemName =
              inventoryById.get(entry.itemId)?.name || "Merch item";
            throw new Error(`${itemName}: үлдэгдэл хүрэлцэхгүй байна.`);
          }
        }

        await tx.marketingMerchIssue.createMany({
          data: mergedItems.map((entry) => ({
            itemId: entry.itemId,
            quantity: entry.quantity,
            recipientName: clientName,
            purpose: "VIP бэлэг хүргэлт",
            issuedBy: staffName?.trim() || "",
            issuedAt: deliveredAt,
            note: clientNote?.trim()
              ? `clientId=${id} • ${clientNote.trim()}`
              : `clientId=${id}`,
          })),
        });
      }

      await tx.giftLog.create({
        data: {
          clientId: id,
          giftType: resolvedGiftType,
          deliveredBy: staffName || null,
          note: clientNote,
          deliveredAt,
        },
      });

      const clientRow = await tx.client.update({
        where: { id },
        data: {
          giftDone: true,
          giftStillOwed: false,
          giftEligibilityStatus: "DELIVERED",
          giftDate: deliveredAt,
          giftType: resolvedGiftType,
          deliveredBy: staffName,
          hasLoan,
          note: clientNote,
        },
      });

      return clientRow;
    }, {
      maxWait: 10_000,
      timeout: 20_000,
    });

    return { client: mapPrismaClient(updated) };
  } catch (error) {
    return { error: error?.message || "Inventory update failed." };
  }
}

export async function updateClient(clientId, updates = {}) {
  await ensureClientStore();
  const id = Number(clientId);
  const existing = await prisma.client.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const data = {};

  if (typeof updates.hasLoan === "boolean") {
    data.hasLoan = updates.hasLoan;
  }

  if (typeof updates.pickupNotified === "boolean") {
    data.pickupNotified = updates.pickupNotified;
    if (updates.pickupNotified) {
      // Allow caller to explicitly set the date; fallback to "now".
      const explicitDate = toDate(updates.pickupNotifiedAt);
      data.pickupNotifiedAt = explicitDate || new Date();
    } else {
      data.pickupNotifiedAt = null;
    }
  }

  if (typeof updates.pickupCenter === "string") {
    data.pickupCenter = updates.pickupCenter.trim();
  }

  if (typeof updates.note === "string") {
    data.note = updates.note.trim();
  }

  const updated = await prisma.client.update({
    where: { id },
    data,
  });

  return mapPrismaClient(updated);
}
