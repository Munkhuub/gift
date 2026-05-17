import { getClientsPayload } from "../../server/api-core.js";
import { parseQuery, sendJson } from "../../server/vercel.js";

export default async function handler(req, res) {
  sendJson(res, 200, await getClientsPayload(parseQuery(req)));
}
