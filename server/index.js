import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  askAiPayload,
  createMarketingResourcePayload,
  createMarketingResourceIssuePayload,
  deliverClientPayload,
  getClientsPayload,
  getGiftHistoryPayload,
  getHealthPayload,
  getMarketingResourceIssuesPayload,
  getMarketingResourcesPayload,
  logGiftPayload,
  updateMarketingResourcePayload,
} from "./api-core.js";
import { ensureClientStore } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 3001);

function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/api/health", async (_req, res) => {
    res.json(await getHealthPayload());
  });

  app.get("/api/clients", async (req, res) => {
    res.json(await getClientsPayload(req.query));
  });

  app.get("/api/gifts/history", async (req, res) => {
    res.json(await getGiftHistoryPayload(req.query));
  });

  app.get("/api/marketing/resources", async (req, res) => {
    res.json(await getMarketingResourcesPayload(req.query));
  });

  app.get("/api/marketing/issues", async (req, res) => {
    res.json(await getMarketingResourceIssuesPayload(req.query));
  });

  app.patch("/api/clients/:id/deliver", async (req, res) => {
    const result = await deliverClientPayload(req.params.id);
    res.status(result.status).json(result.body);
  });

  app.patch("/api/marketing/resources/:id", async (req, res) => {
    const result = await updateMarketingResourcePayload(
      req.params.id,
      req.body,
    );
    res.status(result.status).json(result.body);
  });

  app.post("/api/gifts", async (req, res) => {
    const result = await logGiftPayload(req.body);
    res.status(result.status).json(result.body);
  });

  app.post("/api/marketing/resources", async (req, res) => {
    const result = await createMarketingResourcePayload(req.body);
    res.status(result.status).json(result.body);
  });

  app.post("/api/marketing/issues", async (req, res) => {
    const result = await createMarketingResourceIssuePayload(req.body);
    res.status(result.status).json(result.body);
  });

  app.post("/api/ai/query", async (req, res) => {
    const result = await askAiPayload(req.body);
    res.status(result.status).json(result.body);
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
  const address = server.address();
  const activePort =
    typeof address === "object" && address ? address.port : port;
  console.log(`Backend listening on http://localhost:${activePort}`);
}
