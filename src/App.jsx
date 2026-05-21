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
  fetchMarketingResources,
  logGiftDelivery,
  markClientDelivered,
  updateMarketingResource,
} from "./lib/api";

const FOCUS_TIER = "GOD";
const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'clients', label: '👑 GOD Clients' },
  { id: 'log', label: '✏️ Log GOD Gift' },
  { id: 'marketing', label: '📦 Marketing Resources' },
  { id: 'ai', label: '🤖 AI Assistant' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [marketingResources, setMarketingResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGiftHistory = async () => {
    setHistory(await fetchGiftHistory({ limit: 8, tier: FOCUS_TIER }));
  };

  const loadMarketingResources = async () => {
    setMarketingResources(await fetchMarketingResources());
  };

  const loadData = async () => {
    try {
      setError("");
      setLoading(true);
      const [clientsResult, historyResult, marketingResourcesResult] =
        await Promise.allSettled([
        fetchClients({ tier: FOCUS_TIER }),
        fetchGiftHistory({ limit: 8, tier: FOCUS_TIER }),
        fetchMarketingResources(),
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

      const errors = [];

      if (clientsResult.status === "rejected") {
        errors.push(
          `Clients API: ${clientsResult.reason?.message || "Could not load clients."}`,
        );
      }

      if (historyResult.status === "rejected") {
        errors.push(
          `History API: ${historyResult.reason?.message || "Could not load history."}`,
        );
      }

      if (marketingResourcesResult.status === "rejected") {
        errors.push(
          `Marketing API: ${marketingResourcesResult.reason?.message || "Could not load marketing resources."}`,
        );
      }

      setError(errors.join(" "));
    } catch (err) {
      setError(err.message || "Could not load app data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const markDelivered = async (id) => {
    try {
      setError("");
      const updated = await markClientDelivered(id);
      setClients((current) =>
        current.map((client) => (client.id === updated.id ? updated : client)),
      );
      try {
        await loadGiftHistory();
      } catch (historyError) {
        setError(historyError.message || "Could not refresh gift history.");
      }
      return true;
    } catch (err) {
      setError(err.message || "Could not update delivery status.");
      return false;
    }
  };

  const logGift = async (payload) => {
    try {
      setError("");
      const updated = await logGiftDelivery(payload);
      setClients((current) =>
        current.map((client) => (client.id === updated.id ? updated : client)),
      );
      try {
        await loadGiftHistory();
      } catch (historyError) {
        setError(historyError.message || "Could not refresh gift history.");
      }
      return true;
    } catch (err) {
      setError(err.message || "Could not save the gift record.");
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
          marketingError.message || "Could not refresh marketing resources.",
        );
      }
      return created;
    } catch (err) {
      setError(err.message || "Could not save the marketing resource.");
      return null;
    }
  };

  const updateMarketingEntry = async (id, updates) => {
    try {
      setError("");
      const updated = await updateMarketingResource(id, updates);
      setMarketingResources((current) =>
        current.map((resource) => (resource.id === updated.id ? updated : resource)),
      );
      return updated;
    } catch (err) {
      setError(err.message || "Could not update the marketing resource.");
      return null;
    }
  };

  const pending = clients.filter(c => !c.giftDone).length;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎁</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1E293B' }}>Gift Intelligence Hub</span>
            <span style={{ fontSize: 11, background: '#F0F4FF', color: '#1E3A8A', border: '1px solid #BFDBFE', borderRadius: 99, padding: '2px 8px', fontWeight: 500 }}>Pocket AI Hackathon 2026</span>
            <span style={{ fontSize: 11, background: '#FFF8ED', color: '#92400E', border: '1px solid #FCD34D', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>GOD-tier operations</span>
          </div>
          {pending > 0 && (
            <div style={{ fontSize: 12, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 99, padding: '4px 12px', fontWeight: 500 }}>
              {pending} GOD gift{pending > 1 ? 's' : ''} pending
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontSize: 13, padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t.id ? '#1E293B' : '#64748B', fontWeight: tab === t.id ? 600 : 400,
              borderBottom: `2px solid ${tab === t.id ? '#1E293B' : 'transparent'}`,
              fontFamily: 'inherit', transition: 'all 0.15s'
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>
        {error && (
          <div style={{ marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#B91C1C' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 32, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            Loading client data...
          </div>
        ) : clients.length === 0 && !error ? (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 32, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            No GOD-tier client data is available yet.
          </div>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard clients={clients} history={history} onMarkDelivered={markDelivered} />}
            {tab === 'clients' && <Clients initialClients={clients} />}
            {tab === 'log' && <LogGift clients={clients} history={history} onLog={logGift} />}
            {tab === 'marketing' && (
              <MarketingResources
                initialResources={marketingResources}
                onCreate={createMarketingEntry}
                onUpdate={updateMarketingEntry}
              />
            )}
            {tab === 'ai' && <AIAssistant clients={clients} />}
          </>
        )}
      </div>
    </div>
  );
}
