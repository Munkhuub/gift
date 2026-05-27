import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Clients from "./components/Clients";
import LogGift from "./components/LogGift";
import AIAssistant from "./components/AIAssistant";
import MarketingResources from "./components/MarketingResources";
import {
  createMarketingResource,
  fetchClients,
  fetchGiftHistory,
  fetchMarketingIssues,
  fetchMarketingResources,
  issueMarketingResource,
  logGiftDelivery,
  updateMarketingResource,
} from "./lib/api";

const TABS = [
  { id: "dashboard", label: "Хяналтын самбар" },
  { id: "clients", label: "God Бэлэг" },
  { id: "log", label: "Хүргэлт бүртгэх" },
  { id: "marketing", label: "Мерч хяналт" },
  { id: "ai", label: "AI туслах" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [logClientId, setLogClientId] = useState("");
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [marketingResources, setMarketingResources] = useState([]);
  const [marketingIssues, setMarketingIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGiftHistory = async () => {
    setHistory(await fetchGiftHistory({ limit: 8 }));
  };

  const loadMarketingResources = async (filters = {}) => {
    const resources = await fetchMarketingResources(filters);
    setMarketingResources(resources);
    return resources;
  };

  const loadMarketingIssues = async (filters = {}) => {
    const issues = await fetchMarketingIssues({ limit: 20, ...filters });
    setMarketingIssues(issues);
    return issues;
  };

  const loadData = async () => {
    try {
      setError("");
      setLoading(true);
      const [
        clientsResult,
        historyResult,
        marketingResourcesResult,
        marketingIssuesResult,
      ] = await Promise.allSettled([
        fetchClients(),
        fetchGiftHistory({ limit: 8 }),
        fetchMarketingResources(),
        fetchMarketingIssues({ limit: 20 }),
      ]);

      if (clientsResult.status === "fulfilled") {
        setClients(clientsResult.value);
      } else {
        setClients([]);
      }

      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value);
      } else {
        setHistory([]);
      }

      if (marketingResourcesResult.status === "fulfilled") {
        setMarketingResources(marketingResourcesResult.value);
      } else {
        setMarketingResources([]);
      }

      if (marketingIssuesResult.status === "fulfilled") {
        setMarketingIssues(marketingIssuesResult.value);
      } else {
        setMarketingIssues([]);
      }

      const errors = [];

      if (clientsResult.status === "rejected") {
        errors.push(
          `Үйлчлүүлэгчийн API: ${clientsResult.reason?.message || "Үйлчлүүлэгчдийг ачаалж чадсангүй."}`,
        );
      }

      if (historyResult.status === "rejected") {
        errors.push(
          `Түүхийн API: ${historyResult.reason?.message || "Түүхийг ачаалж чадсангүй."}`,
        );
      }

      if (marketingResourcesResult.status === "rejected") {
        errors.push(
          `Маркетингийн API: ${marketingResourcesResult.reason?.message || "Мерч мэдээллийг ачаалж чадсангүй."}`,
        );
      }

      if (marketingIssuesResult.status === "rejected") {
        errors.push(
          `Мерч гаралт API: ${marketingIssuesResult.reason?.message || "Мерч гаралтын түүхийг ачаалж чадсангүй."}`,
        );
      }

      setError(errors.join(" "));
    } catch (err) {
      setError(err.message || "Аппын мэдээллийг ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLogGiftForClient = (id) => {
    setLogClientId(String(id));
    setTab("log");
  };

  const logGift = async (payload) => {
    try {
      setError("");
      const updated = await logGiftDelivery(payload);
      setClients((current) =>
        current.map((client) => (client.id === updated.id ? updated : client)),
      );
      try {
        await Promise.all([
          loadGiftHistory(),
          loadMarketingResources(),
          loadMarketingIssues(),
        ]);
      } catch (historyError) {
        setError(
          historyError.message || "Бэлэг, түүх, мерчийн мэдээллийг шинэчилж чадсангүй.",
        );
      }
      return true;
    } catch (err) {
      setError(err.message || "Бэлгийн бүртгэлийг хадгалж чадсангүй.");
      return false;
    }
  };

  const createMarketingEntry = async (payload) => {
    try {
      setError("");
      const created = await createMarketingResource(payload);
      try {
        await loadMarketingResources();
      } catch (marketingError) {
        setError(
          marketingError.message || "Мерч мэдээллийг шинэчилж чадсангүй.",
        );
      }
      return created;
    } catch (err) {
      setError(err.message || "Мерчийг хадгалж чадсангүй.");
      return null;
    }
  };

  const issueMarketingEntry = async (payload) => {
    try {
      setError("");
      const result = await issueMarketingResource(payload);
      try {
        await Promise.all([loadMarketingResources(), loadMarketingIssues()]);
      } catch (marketingError) {
        setError(
          marketingError.message ||
            "Мерч хяналтын мэдээллийг шинэчилж чадсангүй.",
        );
      }
      return result;
    } catch (err) {
      setError(err.message || "Мерч гаргалтыг бүртгэж чадсангүй.");
      return null;
    }
  };

  const updateMarketingEntry = async (id, updates) => {
    try {
      setError("");
      const updated = await updateMarketingResource(id, updates);
      setMarketingResources((current) =>
        current.map((resource) =>
          resource.id === updated.id ? updated : resource,
        ),
      );
      return updated;
    } catch (err) {
      setError(err.message || "Мерчийн мэдээллийг шинэчилж чадсангүй.");
      return null;
    }
  };

  const pending = clients.filter(
    (client) => client.giftStillOwed && !client.giftDone,
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E2E8F0",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎁</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>
              Gift Intelligence Hub
            </span>
            <span
              style={{
                fontSize: 11,
                background: "#F0F4FF",
                color: "#1E3A8A",
                border: "1px solid #BFDBFE",
                borderRadius: 99,
                padding: "2px 8px",
                fontWeight: 500,
              }}
            >
              Pocket AI Hackathon 2026
            </span>
            <span
              style={{
                fontSize: 11,
                background: "#FFF8ED",
                color: "#92400E",
                border: "1px solid #FCD34D",
                borderRadius: 99,
                padding: "2px 8px",
                fontWeight: 600,
              }}
            >
              Өдөр тутмын GOD + бэлгийн үүрэг
            </span>
          </div>
          {pending > 0 && (
            <div
              style={{
                fontSize: 12,
                background: "#FEF2F2",
                color: "#DC2626",
                border: "1px solid #FECACA",
                borderRadius: 99,
                padding: "4px 12px",
                fontWeight: 500,
              }}
            >
              {pending} нээлттэй бэлгийн үүрэг
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E2E8F0",
          padding: "0 32px",
        }}
      >
        <div style={{ margin: "0 auto", display: "flex", gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontSize: 13,
                padding: "12px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: tab === t.id ? "#1E293B" : "#64748B",
                fontWeight: tab === t.id ? 600 : 400,
                borderBottom: `2px solid ${tab === t.id ? "#1E293B" : "transparent"}`,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ margin: "0 auto", padding: "28px 32px" }}>
        {error && (
          <div
            style={{
              marginBottom: 16,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: "#B91C1C",
            }}
          >
            {error}
          </div>
        )}
        {loading ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              color: "#64748B",
              fontSize: 14,
            }}
          >
            Мэдээлэл ачаалж байна...
          </div>
        ) : clients.length === 0 && !error ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              color: "#64748B",
              fontSize: 14,
            }}
          >
            Одоогоор өгөгдөл алга байна.
          </div>
        ) : (
          <>
            {tab === "dashboard" && (
              <Dashboard
                clients={clients}
                history={history}
                onOpenLogGift={openLogGiftForClient}
              />
            )}
            {tab === "clients" && (
              <Clients
                initialClients={clients}
                onClientUpdate={(updated) =>
                  setClients((current) =>
                    current.map((client) =>
                      client.id === updated.id ? updated : client,
                    ),
                  )
                }
              />
            )}
            {tab === "log" && (
              <LogGift
                clients={clients}
                history={history}
                marketingResources={marketingResources}
                preselectedClientId={logClientId}
                onLog={logGift}
              />
            )}
            {tab === "marketing" && (
              <MarketingResources
                initialResources={marketingResources}
                initialIssues={marketingIssues}
                onCreate={createMarketingEntry}
                onFilterIssues={loadMarketingIssues}
                onIssue={issueMarketingEntry}
                onUpdate={updateMarketingEntry}
              />
            )}
            {tab === "ai" && <AIAssistant clients={clients} />}
          </>
        )}
      </div>
    </div>
  );
}
