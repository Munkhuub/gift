import { getClientsPayload } from "../../server/api-core.js";
import { parseQuery, sendJson, withErrorHandling } from "../../server/vercel.js";

export default withErrorHandling(async function handler(req, res) {
  sendJson(res, 200, await getClientsPayload(parseQuery(req)));
});
