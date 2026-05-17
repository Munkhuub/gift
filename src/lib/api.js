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

export async function fetchClients() {
  const payload = await request("/api/clients");
  return payload.clients;
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
