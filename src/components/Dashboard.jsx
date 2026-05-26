import { useEffect, useMemo, useState } from "react";
import { fetchGiftHistory } from "../lib/api";

const tierColors = {
  GOD: { bg: "#FFF8ED", text: "#92400E", border: "#FCD34D" },
  STAR: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
  FAN: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  SILVER: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
};

function StatusBadge({ client }) {
  if (client.previousTier === "GOD" && client.tier !== "GOD" && client.giftStillOwed) {
    return badge("Former GOD • still owed", "#FEF2F2", "#B91C1C", "#FECACA");
  }

  if (client.isWaitlist && client.tier === "GOD") {
    return badge("Waitlist → GOD", "#F0FDF4", "#15803D", "#BBF7D0");
  }

  if (client.giftDone) {
    return badge("Delivered", "#F0FDF4", "#15803D", "#BBF7D0");
  }

  return badge("Active GOD queue", "#EFF6FF", "#1D4ED8", "#BFDBFE");
}

function badge(label, bg, color, border) {
  return (
    <span
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        borderRadius: 99,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

export default function Dashboard({ clients, history, onMarkDelivered }) {
  const [historyDate, setHistoryDate] = useState("");
  const [historyItems, setHistoryItems] = useState(history);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const metrics = useMemo(() => {
    const activeGod = clients.filter((client) => client.tier === "GOD");
    const owedQueue = clients.filter(
      (client) => client.giftStillOwed && !client.giftDone,
    );
    const formerGodOwed = clients.filter(
      (client) =>
        client.previousTier === "GOD" &&
        client.tier !== "GOD" &&
        client.giftStillOwed &&
        !client.giftDone,
    );
    const waitlistGod = clients.filter(
      (client) => client.isWaitlist && client.tier === "GOD" && !client.giftDone,
    );
    const overdue = clients.filter((client) => (client.loanOverdueDays || 0) >= 5);
    const recentChanges = clients
      .filter((client) => client.tierChangedAt)
      .sort((a, b) => b.tierChangedAt.localeCompare(a.tierChangedAt))
      .slice(0, 6);

    return {
      activeGod,
      owedQueue,
      formerGodOwed,
      waitlistGod,
      overdue,
      recentChanges,
      delivered: clients.filter((client) => client.giftDone),
    };
  }, [clients]);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!historyDate) {
        setHistoryItems(history);
        setHistoryError("");
        setHistoryLoading(false);
        return;
      }

      try {
        setHistoryLoading(true);
        setHistoryError("");
        const filteredHistory = await fetchGiftHistory({
          limit: 20,
          date: historyDate,
        });

        if (active) {
          setHistoryItems(filteredHistory);
        }
      } catch (error) {
        if (active) {
          setHistoryError(error.message || "Could not load filtered delivery history.");
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [history, historyDate]);

  return (
    <div>
      {metrics.formerGodOwed.length > 0 && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
            color: "#B91C1C",
          }}
        >
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>
            <strong>{metrics.formerGodOwed.length}</strong> former GOD client
            {metrics.formerGodOwed.length > 1 ? "s" : ""} dropped out of the live
            GOD list but still owe a gift. This is the Excel gap the app closes.
          </span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Current GOD now",
            value: metrics.activeGod.length,
            color: "#1E293B",
          },
          {
            label: "Gift queue open",
            value: metrics.owedQueue.length,
            color: metrics.owedQueue.length > 0 ? "#DC2626" : "#16A34A",
          },
          {
            label: "Former GOD still owed",
            value: metrics.formerGodOwed.length,
            color: metrics.formerGodOwed.length > 0 ? "#B91C1C" : "#16A34A",
          },
          {
            label: "Waitlist → GOD",
            value: metrics.waitlistGod.length,
            color: metrics.waitlistGod.length > 0 ? "#15803D" : "#64748B",
          },
          {
            label: "Loan overdue 5d+",
            value: metrics.overdue.length,
            color: metrics.overdue.length > 0 ? "#C2410C" : "#16A34A",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              background: "#F8FAFC",
              borderRadius: 10,
              padding: "14px 16px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              {metric.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: metric.color }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Gift obligation queue
          </div>
          {metrics.owedQueue.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "#16A34A",
                fontSize: 14,
                background: "#F0FDF4",
                borderRadius: 10,
                border: "1px solid #BBF7D0",
              }}
            >
              All tracked gift obligations are closed.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                  {[
                    "Name",
                    "Current tier",
                    "Queue status",
                    "Overdue",
                    "Action",
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        fontSize: 11,
                        color: "#64748B",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 600,
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.owedQueue.map((client) => {
                  const tierColor = tierColors[client.tier] || tierColors.SILVER;
                  return (
                    <tr key={client.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ fontWeight: 600 }}>{client.last} {client.first}</div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          {client.statusReason || client.note || "No note"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span
                          style={{
                            background: tierColor.bg,
                            color: tierColor.text,
                            border: `1px solid ${tierColor.border}`,
                            borderRadius: 99,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {client.tier}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <StatusBadge client={client} />
                      </td>
                      <td style={{ padding: "12px 10px", color: "#475569" }}>
                        {client.loanOverdueDays > 0 ? `${client.loanOverdueDays} day(s)` : "—"}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <button
                          onClick={() => onMarkDelivered(client.id)}
                          style={{
                            fontSize: 12,
                            padding: "6px 14px",
                            borderRadius: 7,
                            border: "1px solid #E2E8F0",
                            background: "#fff",
                            cursor: "pointer",
                            color: "#1E293B",
                            fontWeight: 500,
                          }}
                        >
                          Mark delivered ✓
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Recent portfolio changes
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {metrics.recentChanges.length === 0 ? (
              <div style={{ padding: 18, fontSize: 13, color: "#94A3B8" }}>
                No recent tier changes recorded.
              </div>
            ) : (
              metrics.recentChanges.map((client, index) => (
                <div
                  key={client.id}
                  style={{
                    padding: "14px 16px",
                    borderTop: index === 0 ? "none" : "1px solid #F1F5F9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#1E293B" }}>
                      {client.last} {client.first}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      {client.tierChangedAt}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                    {client.previousTier || "—"} → {client.tier}
                    <br />
                    {client.statusReason || "No reason provided"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 0.9fr",
          gap: 18,
          marginTop: 28,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Recent delivery history
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value)}
              style={dateInputStyle}
            />
            <button onClick={() => setHistoryDate(new Date().toISOString().split("T")[0])} style={historyFilterButtonStyle}>
              Today
            </button>
            <button onClick={() => setHistoryDate("")} style={historyFilterButtonStyle}>
              Clear
            </button>
            <span style={{ fontSize: 12, color: "#64748B" }}>
              Filter the full delivery history by exact day.
            </span>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {historyLoading ? (
              <div style={{ padding: 20, fontSize: 13, color: "#64748B" }}>
                Loading filtered delivery history...
              </div>
            ) : historyError ? (
              <div style={{ padding: 20, fontSize: 13, color: "#B91C1C" }}>
                {historyError}
              </div>
            ) : historyItems.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: "#94A3B8" }}>
                No delivery history matched that day.
              </div>
            ) : (
              historyItems.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "14px 16px",
                    borderTop: index === 0 ? "none" : "1px solid #F1F5F9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#1E293B" }}>
                      {entry.clientName}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      {entry.deliveredAt}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {entry.giftType}
                    {entry.deliveredBy ? ` • ${entry.deliveredBy}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Queue pace
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>
              COMPLETION RATE
            </div>
            <div style={{ fontSize: 38, fontWeight: 700, color: "#1E293B", lineHeight: 1 }}>
              {clients.length === 0
                ? "0%"
                : `${Math.round((metrics.delivered.length / clients.length) * 100)}%`}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748B", lineHeight: 1.7 }}>
              {metrics.delivered.length} delivered out of {clients.length} tracked clients.
              <br />
              {metrics.owedQueue.length} still sit in the open gift queue.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const dateInputStyle = {
  fontSize: 12,
  padding: "8px 10px",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  background: "#fff",
  color: "#1E293B",
};

const historyFilterButtonStyle = {
  fontSize: 12,
  padding: "8px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  background: "#fff",
  color: "#475569",
  cursor: "pointer",
};
