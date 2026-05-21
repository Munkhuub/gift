const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;
  const fallbackText =
    !isJson && response.status !== 204 ? (await response.text()).trim() : "";

  if (!response.ok) {
    const message =
      payload?.error ||
      fallbackText ||
      `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchClients(filters = {}) {
  const payload = await request(`/api/clients${toQueryString(filters)}`);
  return payload.clients;
}

export async function fetchGiftHistory(options = 8) {
  const params = typeof options === "number" ? { limit: options } : options;
  const payload = await request(`/api/gifts/history${toQueryString(params)}`);
  return payload.deliveries;
}

export async function fetchMarketingResources(filters = {}) {
  const payload = await request(
    `/api/marketing/resources${toQueryString(filters)}`,
  );
  return payload.resources;
}

export async function markClientDelivered(id) {
  const payload = await request(`/api/clients/${id}/deliver`, {
    method: "PATCH",
  });
  return payload.client;
}

export async function logGiftDelivery(delivery) {
  const payload = await request("/api/gifts", {
    method: "POST",
    body: JSON.stringify(delivery),
  });
  return payload.client;
}

export async function askAssistant(question) {
  const payload = await request("/api/ai/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  return payload.text;
}

export async function createMarketingResource(resource) {
  const payload = await request("/api/marketing/resources", {
    method: "POST",
    body: JSON.stringify(resource),
  });
  return payload.resource;
}

export async function updateMarketingResource(id, updates) {
  const payload = await request(`/api/marketing/resources/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return payload.resource;
}
