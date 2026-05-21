import {
  createMarketingResourcePayload,
  getMarketingResourcesPayload,
} from "../../../server/api-core.js";
import {
  parseJsonBody,
  parseQuery,
  sendJson,
  withErrorHandling,
} from "../../../server/vercel.js";

export default withErrorHandling(async function handler(req, res) {
  if (req.method === "POST") {
    const body = await parseJsonBody(req);
    const result = await createMarketingResourcePayload(body);
    sendJson(res, result.status, result.body);
    return;
  }

  sendJson(res, 200, await getMarketingResourcesPayload(parseQuery(req)));
});

