import { deliverClientPayload } from "../../../server/api-core.js";
import { sendJson, withErrorHandling } from "../../../server/vercel.js";

export default withErrorHandling(async function handler(req, res) {
  const result = await deliverClientPayload(req.query.id);
  sendJson(res, result.status, result.body);
});
