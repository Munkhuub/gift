import { askAiPayload } from "../../server/api-core.js";
import { parseJsonBody, sendJson, withErrorHandling } from "../../server/vercel.js";

export default withErrorHandling(async function handler(req, res) {
  const body = await parseJsonBody(req);
  const result = await askAiPayload(body);
  sendJson(res, result.status, result.body);
});
