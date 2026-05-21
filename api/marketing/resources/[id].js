import { updateMarketingResourcePayload } from "../../../server/api-core.js";
import {
  parseJsonBody,
  sendJson,
  withErrorHandling,
} from "../../../server/vercel.js";

export default withErrorHandling(async function handler(req, res) {
  const body = await parseJsonBody(req);
  const result = await updateMarketingResourcePayload(req.query.id, body);
  sendJson(res, result.status, result.body);
});
