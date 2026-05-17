import { getAISafeSummary } from "../src/data/clients.js";
import {
  ensureClientStore,
  getStoreProvider,
  listClients,
  logGiftDelivery,
  markClientDelivered,
} from "./store.js";

const SYSTEM_PROMPT_BASE = `You are an AI assistant for an internal client gift tracking system at a Mongolian financial company. You help Sales, Marketing, and Finance teams monitor gift delivery status. No personal client data is shared — you only receive aggregated totals. Answer questions helpfully based only on the summary provided. For Finance summaries, use a professional format. If asked for individual client details, explain that personal data is kept private. Respond in the same language the user uses (Mongolian or English). Be concise and direct.`;

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
}

async function askGemini(question, clients) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const summary = getAISafeSummary(clients);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: `${SYSTEM_PROMPT_BASE}\n\nCurrent aggregated data:\n${summary}`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: question }],
          },
        ],
      }),
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "AI request failed.");
  }

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, could not get a response."
  );
}

export async function getHealthPayload() {
  await ensureClientStore();
  return { ok: true, provider: getStoreProvider() };
}

export async function getClientsPayload() {
  const clients = await listClients();
  return { clients };
}

export async function deliverClientPayload(id) {
  const client = await markClientDelivered(id);

  if (!client) {
    return {
      status: 404,
      body: { error: "Client not found." },
    };
  }

  return {
    status: 200,
    body: { client },
  };
}

export async function logGiftPayload(payload) {
  const { clientId, date, type, deliveredBy, loan, note } = payload || {};

  if (!clientId) {
    return {
      status: 400,
      body: { error: "clientId is required." },
    };
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
    return {
      status: 404,
      body: { error: "Client not found." },
    };
  }

  return {
    status: 200,
    body: { client },
  };
}

export async function askAiPayload(payload) {
  const question = payload?.question?.trim();

  if (!question) {
    return {
      status: 400,
      body: { error: "question is required." },
    };
  }

  try {
    const clients = await listClients();
    const text = await askGemini(question, clients);
    return {
      status: 200,
      body: { text },
    };
  } catch (error) {
    return {
      status: 502,
      body: { error: error.message || "AI request failed." },
    };
  }
}
