import { getAISafeSummary } from "../src/data/clients.js";
import {
  ensureClientStore,
  getStoreProvider,
  listClients,
  listGiftLogs,
  logGiftDelivery,
  markClientDelivered,
} from "./store.js";

const SYSTEM_PROMPT_BASE = `You are an AI assistant for an internal client gift tracking system at a Mongolian financial company. You help Sales, Marketing, and Finance teams monitor gift delivery status. No personal client data is shared — you only receive aggregated totals. Answer questions helpfully based only on the summary provided. For Finance summaries, use a professional format. If asked for individual client details, explain that personal data is kept private. Respond in the same language the user uses (Mongolian or English). Be concise and direct.`;
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
  });
  return { clients };
}

export async function getGiftHistoryPayload(query = {}) {
  const deliveries = await listGiftLogs({
    limit: query.limit,
  });
  return { deliveries };
}

export async function deliverClientPayload(id) {
  const client = await markClientDelivered(id);
  if (!client) {
    return { status: 404, body: { error: "Client not found." } };
  }
  return { status: 200, body: { client } };
}

export async function logGiftPayload(payload) {
  const { clientId, date, type, deliveredBy, loan, note } = payload || {};

  if (!clientId) {
    return { status: 400, body: { error: "clientId is required." } };
  }

  const client = await logGiftDelivery({
    clientId,
    date,
    type,
    deliveredBy,
    loan,
    note,
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
