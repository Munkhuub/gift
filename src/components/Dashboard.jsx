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
    return badge("Өмнөх GOD • бэлэг дутуу", "#FEF2F2", "#B91C1C", "#FECACA");
  }

  if (client.giftDone) {
    return badge("Хүргэгдсэн", "#F0FDF4", "#15803D", "#BBF7D0");
  }

  return badge("Идэвхтэй дараалал", "#EFF6FF", "#1D4ED8", "#BFDBFE");
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

export default function Dashboard({ clients, history, onOpenLogGift }) {
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
    const recentChanges = clients
      .filter((client) => client.tierChangedAt)
      .sort((a, b) => b.tierChangedAt.localeCompare(a.tierChangedAt))
      .slice(0, 6);

    return {
      activeGod,
      owedQueue,
      formerGodOwed,
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
            <strong>{metrics.formerGodOwed.length}</strong> харилцагч одоогийн
            GOD жагсаалтаас буусан ч бэлгийн үүрэг нь нээлттэй хэвээр байна.
          </span>
        </div>
      )}

      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(255,248,237,0.95), rgba(239,246,255,0.95))",
          border: "1px solid #E2E8F0",
          borderRadius: 18,
          padding: 20,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, 0.8fr)",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#92400E",
              marginBottom: 8,
            }}
          >
            Өнөөдрийн хураангуй
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#1E293B",
              lineHeight: 1.2,
              marginBottom: 10,
            }}
          >
            GOD бэлгийн дарааллыг нэг дэлгэцээс хурдан шийдвэрлэх самбар
          </div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
            Нээлттэй бэлгийн үүрэг, бэлгээ аваагүй харилцагч, эрсдэлтэй
            кейсүүд, сүүлийн хүргэлтийн урсгалыг эндээс шууд харна.
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(226,232,240,0.9)",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>
            Яг одоо анхаарах зүйл
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#DC2626", lineHeight: 1 }}>
            {metrics.owedQueue.length}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            нээлттэй бэлгийн үүрэг байна.
            <br />
            {metrics.formerGodOwed.length > 0
              ? `${metrics.formerGodOwed.length} нь эрсдэлтэй бүлэгт байна.`
              : "Эрсдэлтэй бүлэг одоогоор алга."}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Одоогийн GOD",
            value: metrics.activeGod.length,
            color: "#1E293B",
          },
          {
            label: "Бэлгээ аваагүй",
            value: metrics.owedQueue.length,
            color: metrics.owedQueue.length > 0 ? "#D97706" : "#16A34A",
          },
          {
            label: "Буусан ч бэлэг дутуу",
            value: metrics.formerGodOwed.length,
            color: metrics.formerGodOwed.length > 0 ? "#B91C1C" : "#16A34A",
          },
          {
            label: "Хүргэгдсэн",
            value: metrics.delivered.length,
            color: metrics.delivered.length > 0 ? "#15803D" : "#64748B",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "14px 16px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
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
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
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
            Бэлгийн үүргийн дараалал
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
              Бүх бэлгийн үүрэг хаагдсан байна.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {metrics.owedQueue.map((client) => {
                const tierColor = tierColors[client.tier] || tierColors.SILVER;
                return (
                  <div
                    key={client.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: 14,
                      padding: 14,
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#1E293B" }}>
                          {client.last} {client.first}
                        </div>
                        <span
                          style={{
                            background: tierColor.bg,
                            color: tierColor.text,
                            border: `1px solid ${tierColor.border}`,
                            borderRadius: 99,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {client.tier}
                        </span>
                        <StatusBadge client={client} />
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
                        {client.statusReason || client.note || "Тэмдэглэл алга"}
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenLogGift(client.id)}
                      style={{
                        fontSize: 12,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #1E293B",
                        background: "#1E293B",
                        cursor: "pointer",
                        color: "#fff",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Бэлэг бүртгэх
                    </button>
                  </div>
                );
              })}
            </div>
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
            Сүүлийн өөрчлөлтүүд
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
                Сүүлийн түвшний өөрчлөлт алга.
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
                    {client.statusReason || "Шалтгаан оруулаагүй"}
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
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(260px, 0.9fr)",
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
            Сүүлийн хүргэлтийн түүх
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
              Өнөөдөр
            </button>
            <button onClick={() => setHistoryDate("")} style={historyFilterButtonStyle}>
              Цэвэрлэх
            </button>
            <span style={{ fontSize: 12, color: "#64748B" }}>
              Хүргэлтийн түүхийг яг өдрөөр нь шүүнэ.
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
                Хүргэлтийн түүх ачаалж байна...
              </div>
            ) : historyError ? (
              <div style={{ padding: 20, fontSize: 13, color: "#B91C1C" }}>
                {historyError}
              </div>
            ) : historyItems.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: "#94A3B8" }}>
                Энэ өдөрт тохирох хүргэлт алга.
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
            Гүйцэтгэлийн явц
          </div>
          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,1))",
              border: "1px solid #E2E8F0",
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>
              ГҮЙЦЭТГЭЛИЙН ХУВЬ
            </div>
            <div style={{ fontSize: 38, fontWeight: 700, color: "#1E293B", lineHeight: 1 }}>
              {clients.length === 0
                ? "0%"
                : `${Math.round((metrics.delivered.length / clients.length) * 100)}%`}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748B", lineHeight: 1.7 }}>
              {metrics.delivered.length} хүргэлт / нийт {clients.length} хянагдаж буй
              харилцагч.
              <br />
              {metrics.owedQueue.length} нь одоо ч нээлттэй дараалалд байна.
            </div>
            <div
              style={{
                marginTop: 14,
                height: 10,
                background: "#E2E8F0",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width:
                    clients.length === 0
                      ? "0%"
                      : `${Math.round((metrics.delivered.length / clients.length) * 100)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #16A34A, #22C55E)",
                }}
              />
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
