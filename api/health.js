import { getHealthPayload } from "../server/api-core.js";
import { sendJson, withErrorHandling } from "../server/vercel.js";

export default withErrorHandling(async function handler(_req, res) {
  sendJson(res, 200, await getHealthPayload());
});
