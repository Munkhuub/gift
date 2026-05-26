import { initialClients, normalizeClient } from "../src/data/clients.js";
import {
  initialMarketingMerchItems,
  initialMarketingMerchIssues,
  normalizeMarketingMerchItem,
  normalizeMarketingMerchIssue,
} from "../src/data/marketingResources.js";

function parseGiftDate(giftDate) {
  if (!giftDate) {
    return null;
  }

  return new Date(`${giftDate}T00:00:00.000Z`);
}

function buildGiftCreate(client) {
  if (!client.giftDone) {
    return [];
  }

  return [
    {
      giftType: client.giftType || "Gift delivery",
      deliveredBy: client.deliveredBy || null,
      note: client.note || "",
      deliveredAt: parseGiftDate(client.giftDate) || new Date(),
    },
  ];
}

function buildClientCreate(client) {
  const normalized = normalizeClient(client);

  return {
    id: normalized.id,
    firstName: normalized.first,
    lastName: normalized.last,
    phoneMasked: normalized.phone,
    tier: normalized.tier,
    previousTier: normalized.previousTier || null,
    giftDone: normalized.giftDone,
    giftStillOwed: normalized.giftStillOwed,
    giftEligibilityStatus: normalized.giftEligibilityStatus,
    giftDate: parseGiftDate(normalized.giftDate),
    hasLoan: normalized.loan,
    isWaitlist: normalized.isWaitlist,
    tierChangedAt: parseGiftDate(normalized.tierChangedAt),
    statusReason: normalized.statusReason,
    note: normalized.note,
    giftType: normalized.giftType,
    deliveredBy: normalized.deliveredBy,
    gifts: {
      create: buildGiftCreate(normalized),
    },
  };
}

export function getPrismaSeedClients() {
  return initialClients.map(buildClientCreate);
}

function buildMarketingMerchItemCreate(item) {
  const normalized = normalizeMarketingMerchItem(item);

  return {
    id: normalized.id,
    name: normalized.name,
    category: normalized.category,
    unit: normalized.unit,
    totalStock: normalized.totalStock,
    issuedStock: normalized.issuedStock,
    storageLocation: normalized.storageLocation,
    note: normalized.note,
  };
}

function buildMarketingMerchIssueCreate(issue) {
  const normalized = normalizeMarketingMerchIssue(issue);

  return {
    id: normalized.id,
    itemId: normalized.itemId,
    quantity: normalized.quantity,
    recipientName: normalized.recipientName,
    purpose: normalized.purpose,
    issuedBy: normalized.issuedBy,
    issuedAt: parseGiftDate(normalized.issuedAt) || new Date(),
    note: normalized.note,
  };
}

async function syncSerialSequence(prismaClient, tableName) {
  await prismaClient.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX("id") FROM "${tableName}"), 0) + 1, false);`,
  );
}

export function getPrismaSeedMarketingMerchItems() {
  return initialMarketingMerchItems.map(buildMarketingMerchItemCreate);
}

export function getPrismaSeedMarketingMerchIssues() {
  return initialMarketingMerchIssues.map(buildMarketingMerchIssueCreate);
}

export async function seedMarketingResources(prismaClient) {
  const merchItems = getPrismaSeedMarketingMerchItems();
  const merchIssues = getPrismaSeedMarketingMerchIssues();

  for (const item of merchItems) {
    await prismaClient.marketingMerchItem.create({
      data: item,
    });
  }

  for (const issue of merchIssues) {
    await prismaClient.marketingMerchIssue.create({
      data: issue,
    });
  }

  await syncSerialSequence(prismaClient, "marketing_merch_items");
  await syncSerialSequence(prismaClient, "marketing_merch_issues");

  return {
    merchItems: merchItems.length,
    merchIssues: merchIssues.length,
  };
}

export async function resetMarketingResources(prismaClient) {
  await prismaClient.marketingMerchIssue.deleteMany();
  await prismaClient.marketingMerchItem.deleteMany();

  return seedMarketingResources(prismaClient);
}

export async function reseedPrisma(prismaClient) {
  const clients = getPrismaSeedClients();
  let marketingResources;

  // Hosted pooled Postgres can time out while starting explicit transactions,
  // so the seed reset uses simple sequential deletes instead.
  await prismaClient.giftLog.deleteMany();
  marketingResources = await resetMarketingResources(prismaClient);
  await prismaClient.client.deleteMany();

  for (const client of clients) {
    await prismaClient.client.create({
      data: client,
    });
  }

  return {
    clients: clients.length,
    marketingResources,
  };
}
