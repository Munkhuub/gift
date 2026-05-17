const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
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

export async function fetchGiftHistory(limit = 8) {
  const payload = await request(`/api/gifts/history${toQueryString({ limit })}`);
  return payload.deliveries;
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
