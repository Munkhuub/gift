import { getAISafeSummary } from "../src/data/clients.js";
import {
  createMarketingResource,
  createMarketingResourceIssue,
  ensureClientStore,
  getStoreProvider,
  listClients,
  listGiftLogs,
  listMarketingResources,
  listMarketingResourceIssues,
  logGiftDelivery,
  markClientDelivered,
  updateClient,
  updateMarketingResource,
} from "./store.js";
import {
  MERCH_CATEGORIES,
} from "../src/data/marketingResources.js";

const SYSTEM_PROMPT_BASE = `You are an AI assistant for an internal GOD-tier client gift tracking system at a Mongolian financial company. You help Sales, Marketing, and Finance teams monitor VIP gift delivery status, former GOD clients who still need gifts, and new GOD users promoted from waitlist. No personal client data is shared — you only receive aggregated totals. Answer questions helpfully based only on the summary provided. For Finance summaries, use a professional format. If asked for individual client details, explain that personal data is kept private and that the workflow is limited to aggregated portfolio insights. Respond in the same language the user uses (Mongolian or English). Be concise and direct.`;
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function buildUpstreamError(provider, response, data) {
  const message =
    data?.error?.message ||
    `${provider} request failed with status ${response.status}.`;
  const error = new Error(message);

  error.provider = provider;
  error.status = response.status;
  error.statusText = response.statusText;
  error.requestId =
    response.headers.get("request-id") ||
    response.headers.get("anthropic-request-id") ||
    "";
  error.details = data;

  return error;
}

async function askAI(question, clients) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const summary = getAISafeSummary(clients);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: `${SYSTEM_PROMPT_BASE}\n\nCurrent aggregated data:\n${summary}`,
      messages: [{ role: "user", content: question }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw buildUpstreamError("Anthropic", response, data);
  }

  return data.content?.[0]?.text || "No response.";
}

export async function getHealthPayload() {
  await ensureClientStore();
  return { ok: true, provider: getStoreProvider() };
}

export async function getClientsPayload(query = {}) {
  const clients = await listClients({
    tier: query.tier,
    search: query.search,
    status: query.status,
    queue: query.queue,
    giftDate: query.giftDate,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  return { clients };
}

export async function getGiftHistoryPayload(query = {}) {
  const deliveries = await listGiftLogs({
    limit: query.limit,
    tier: query.tier,
    date: query.date,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  return { deliveries };
}

export async function deliverClientPayload(id) {
  const result = await markClientDelivered(id);
  if (!result) {
    return { status: 404, body: { error: "Client not found." } };
  }
  if (result.error) {
    return { status: 400, body: { error: result.error } };
  }
  return { status: 200, body: { client: result.client } };
}

export async function getMarketingResourcesPayload(query = {}) {
  const resources = await listMarketingResources({
    category: query.category,
    search: query.search,
  });

  return { resources };
}

export async function getMarketingResourceIssuesPayload(query = {}) {
  const issues = await listMarketingResourceIssues({
    limit: query.limit,
    itemId: query.itemId,
    search: query.search,
    date: query.date,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });

  return { issues };
}

export async function createMarketingResourcePayload(payload) {
  const {
    name,
    category,
    unit,
    totalStock,
    storageLocation,
    note,
  } = payload || {};

  if (!name?.trim()) {
    return { status: 400, body: { error: "name is required." } };
  }

  const normalizedCategory = String(category || "").toUpperCase();

  if (!MERCH_CATEGORIES.includes(normalizedCategory)) {
    return { status: 400, body: { error: "category is invalid." } };
  }

  if (!Number.isFinite(Number(totalStock)) || Number(totalStock) < 0) {
    return { status: 400, body: { error: "totalStock must be 0 or greater." } };
  }

  const resource = await createMarketingResource({
    name,
    category: normalizedCategory,
    unit,
    totalStock,
    storageLocation,
    note,
  });

  return { status: 200, body: { resource } };
}

export async function updateMarketingResourcePayload(id, payload) {
  const resource = await updateMarketingResource(id, {
    ...payload,
  });

  if (!resource) {
    return { status: 404, body: { error: "Merch item not found." } };
  }

  return { status: 200, body: { resource } };
}

export async function createMarketingResourceIssuePayload(payload) {
  const {
    itemId,
    quantity,
    recipientName,
    purpose,
    issuedBy,
    issuedAt,
    note,
  } = payload || {};

  if (!itemId) {
    return { status: 400, body: { error: "itemId is required." } };
  }

  if (!recipientName?.trim()) {
    return { status: 400, body: { error: "recipientName is required." } };
  }

  if (!purpose?.trim()) {
    return { status: 400, body: { error: "purpose is required." } };
  }

  const result = await createMarketingResourceIssue({
    itemId,
    quantity,
    recipientName,
    purpose,
    issuedBy,
    issuedAt,
    note,
  });

  if (result.error) {
    return { status: 400, body: { error: result.error } };
  }

  return { status: 200, body: result };
}

export async function logGiftPayload(payload) {
  const { clientId, date, type, deliveredBy, loan, note, items } = payload || {};

  if (!clientId) {
    return { status: 400, body: { error: "clientId is required." } };
  }

  const result = await logGiftDelivery({
    clientId,
    date,
    type,
    deliveredBy,
    loan,
    note,
    items,
  });

  if (!result) {
    return { status: 404, body: { error: "Client not found." } };
  }

  if (result.error) {
    return { status: 400, body: { error: result.error } };
  }

  return { status: 200, body: { client: result.client } };
}

export async function updateClientPayload(id, payload) {
  const updates = payload || {};
  const client = await updateClient(id, {
    hasLoan: typeof updates.hasLoan === "boolean" ? updates.hasLoan : undefined,
    pickupNotified:
      typeof updates.pickupNotified === "boolean"
        ? updates.pickupNotified
        : undefined,
    pickupCenter:
      typeof updates.pickupCenter === "string" ? updates.pickupCenter : undefined,
    pickupNotifiedAt:
      typeof updates.pickupNotifiedAt === "string"
        ? updates.pickupNotifiedAt
        : undefined,
    note: typeof updates.note === "string" ? updates.note : undefined,
  });

  if (!client) {
    return { status: 404, body: { error: "Client not found." } };
  }

  return { status: 200, body: { client } };
}

export async function askAiPayload(payload) {
  const question = payload?.question?.trim();

  if (!question) {
    return { status: 400, body: { error: "question is required." } };
  }

  try {
    const clients = await listClients();
    const text = await askAI(question, clients);
    return { status: 200, body: { text } };
  } catch (error) {
    console.error("AI upstream request failed", {
      provider: error.provider || "Anthropic",
      message: error.message || "AI request failed.",
      status: error.status || null,
      statusText: error.statusText || null,
      requestId: error.requestId || null,
      details: error.details || null,
    });

    return {
      status: 502,
      body: { error: error.message || "AI request failed." },
    };
  }
}
