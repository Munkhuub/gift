import "dotenv/config";
import { getStoreProvider, listClients, resetClientStore } from "./store.js";

const inserted = await resetClientStore();
const clients = await listClients();

console.log(
  JSON.stringify(
    {
      provider: getStoreProvider(),
      inserted,
      count: clients.length,
      ids: clients.map((client) => client.id),
    },
    null,
    2,
  ),
);
