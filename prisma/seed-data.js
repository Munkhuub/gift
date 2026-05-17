import { initialClients, normalizeClient } from "../src/data/clients.js";

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

export async function reseedPrisma(prismaClient) {
  const clients = getPrismaSeedClients();

  await prismaClient.$transaction([
    prismaClient.giftLog.deleteMany(),
    prismaClient.client.deleteMany(),
  ]);

  for (const client of clients) {
    await prismaClient.client.create({
      data: client,
    });
  }

  return clients.length;
}
