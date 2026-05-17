import { getHealthPayload } from "../server/api-core.js";
import { sendJson } from "../server/vercel.js";

export default async function handler(_req, res) {
  sendJson(res, 200, await getHealthPayload());
}
