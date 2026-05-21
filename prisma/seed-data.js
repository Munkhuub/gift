import { initialClients, normalizeClient } from "../src/data/clients.js";
import {
  initialMarketingResources,
  normalizeMarketingResource,
} from "../src/data/marketingResources.js";

function parseGiftDate(giftDate) {
  if (!giftDate) {
    return null;
  }

  return new Date(`${giftDate}T00:00:00.000Z`);
}

function buildGiftCreate(client) {
  if (!client.giftDone && !client.giftType && !client.deliveredBy && !client.note) {
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
    giftDone: normalized.giftDone,
    giftDate: parseGiftDate(normalized.giftDate),
    hasLoan: normalized.loan,
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

function buildMarketingResourceCreate(resource) {
  const normalized = normalizeMarketingResource(resource);

  return {
    id: normalized.id,
    name: normalized.name,
    campaign: normalized.campaign,
    resourceType: normalized.resourceType,
    owner: normalized.owner,
    status: normalized.status,
    quantity: normalized.quantity,
    budget: normalized.budget,
    neededBy: parseGiftDate(normalized.neededBy),
    vendor: normalized.vendor,
    note: normalized.note,
  };
}

export function getPrismaSeedMarketingResources() {
  return initialMarketingResources.map(buildMarketingResourceCreate);
}

export async function seedMarketingResources(prismaClient) {
  const marketingResources = getPrismaSeedMarketingResources();

  for (const resource of marketingResources) {
    await prismaClient.marketingResource.create({
      data: resource,
    });
  }

  return marketingResources.length;
}

export async function reseedPrisma(prismaClient) {
  const clients = getPrismaSeedClients();

  // Hosted pooled Postgres can time out while starting explicit transactions,
  // so the seed reset uses simple sequential deletes instead.
  await prismaClient.giftLog.deleteMany();
  await prismaClient.marketingResource.deleteMany();
  await prismaClient.client.deleteMany();

  for (const client of clients) {
    await prismaClient.client.create({
      data: client,
    });
  }

  const marketingResources = await seedMarketingResources(prismaClient);

  return {
    clients: clients.length,
    marketingResources,
  };
}
