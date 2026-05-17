import { logGiftPayload } from "../server/api-core.js";
import { parseJsonBody, sendJson } from "../server/vercel.js";

export default async function handler(req, res) {
  const body = await parseJsonBody(req);
  const result = await logGiftPayload(body);
  sendJson(res, result.status, result.body);
}
