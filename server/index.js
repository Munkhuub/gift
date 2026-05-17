import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { getAISafeSummary } from "../src/data/clients.js";
import {
  ensureClientStore,
  getStoreProvider,
  listClients,
  logGiftDelivery,
  markClientDelivered,
} from "./store.js";

const SYSTEM_PROMPT_BASE = `You are an AI assistant for an internal client gift tracking system at a Mongolian financial company. You help Sales, Marketing, and Finance teams monitor gift delivery status. No personal client data is shared — you only receive aggregated totals. Answer questions helpfully based only on the summary provided. For Finance summaries, use a professional format. If asked for individual client details, explain that personal data is kept private. Respond in the same language the user uses (Mongolian or English). Be concise and direct.`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 3001);

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

function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/api/health", async (_req, res) => {
    await ensureClientStore();
    res.json({ ok: true, provider: getStoreProvider() });
  });

  app.get("/api/clients", async (_req, res) => {
    const clients = await listClients();
    res.json({ clients });
  });

  app.patch("/api/clients/:id/deliver", async (req, res) => {
    const client = await markClientDelivered(req.params.id);

    if (!client) {
      res.status(404).json({ error: "Client not found." });
      return;
    }

    res.json({ client });
  });

  app.post("/api/gifts", async (req, res) => {
    const { clientId, date, type, deliveredBy, loan, note } = req.body || {};

    if (!clientId) {
      res.status(400).json({ error: "clientId is required." });
      return;
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
      res.status(404).json({ error: "Client not found." });
      return;
    }

    res.json({ client });
  });

  app.post("/api/ai/query", async (req, res) => {
    const question = req.body?.question?.trim();

    if (!question) {
      res.status(400).json({ error: "question is required." });
      return;
    }

    try {
      const clients = await listClients();
      const text = await askGemini(question, clients);
      res.json({ text });
    } catch (error) {
      res.status(502).json({ error: error.message || "AI request failed." });
    }
  });

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));

    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  return app;
}

export const app = createApp();

export async function startServer(listenPort = port) {
  await ensureClientStore();
  return new Promise((resolve) => {
    const server = app.listen(listenPort, () => resolve(server));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const server = await startServer();
  console.log(`Backend listening on http://localhost:${server.address().port}`);
}
