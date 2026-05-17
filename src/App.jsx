import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Clients from "./components/Clients";
import LogGift from "./components/LogGift";
import AIAssistant from "./components/AIAssistant";
import {
  fetchClients,
  fetchGiftHistory,
  logGiftDelivery,
  markClientDelivered,
} from "./lib/api";

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'clients', label: '👥 Clients' },
  { id: 'log', label: '✏️ Log Gift' },
  { id: 'ai', label: '🤖 AI Assistant' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGiftHistory = async () => {
    setHistory(await fetchGiftHistory(8));
  };

  const loadData = async () => {
    try {
      setError("");
      setLoading(true);
      const [nextClients, nextHistory] = await Promise.all([
        fetchClients(),
        fetchGiftHistory(8),
      ]);
      setClients(nextClients);
      setHistory(nextHistory);
    } catch (err) {
      setError(err.message || "Could not load clients.");
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
          </div>
          {pending > 0 && (
            <div style={{ fontSize: 12, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 99, padding: '4px 12px', fontWeight: 500 }}>
              {pending} gift{pending > 1 ? 's' : ''} pending
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
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard clients={clients} history={history} onMarkDelivered={markDelivered} />}
            {tab === 'clients' && <Clients initialClients={clients} />}
            {tab === 'log' && <LogGift clients={clients} history={history} onLog={logGift} />}
            {tab === 'ai' && <AIAssistant clients={clients} />}
          </>
        )}
      </div>
    </div>
  );
}
