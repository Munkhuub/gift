import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { fetchClients, updateClient } from "../lib/api";

const tierColors = {
  GOD: { bg: "#FFF8ED", text: "#92400E", border: "#FCD34D" },
  KING: { bg: "#F0F4FF", text: "#1E3A8A", border: "#93C5FD" },
  BOSS: { bg: "#FFFBEB", text: "#78350F", border: "#FDE68A" },
  STAR: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
  FAN: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  SILVER: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
};

// Ухаалаг шүүлтүүрүүд — харилцагчийн мөрийг шалгах дүрмүүд
const SMART_FILTERS = [
  {
    key: "AT_RISK",
    label: "⚠️ Бэлэг эрсдэлтэй",
    color: {
      bg: "#FEF2F2",
      text: "#B91C1C",
      border: "#FECACA",
      active: "#B91C1C",
    },
    tooltip: "Өмнө нь GOD байсан, бэлэг хүргэгдээгүй, одоо буурсан",
    test: (c) => c.previousTier === "GOD" && c.tier !== "GOD" && !c.giftDone,
  },
  {
    key: "WAITLIST",
    label: "🆕 Waitlist-ээс GOD",
    color: {
      bg: "#F0FDF4",
      text: "#15803D",
      border: "#BBF7D0",
      active: "#15803D",
    },
    tooltip: "Waitlist-ээс шинээр GOD болсон, бэлэг хараахан олгоогүй",
    test: (c) => c.isWaitlist && c.tier === "GOD" && !c.giftDone,
  },
  {
    key: "PENDING",
    label: "⏳ Хүргэгдээгүй",
    color: {
      bg: "#F8FAFC",
      text: "#475569",
      border: "#CBD5E1",
      active: "#475569",
    },
    tooltip: "Бэлэг хараахан хүргэгдээгүй",
    test: (c) => !c.giftDone,
  },
  {
    key: "DELIVERED",
    label: "✓ Хүргэгдсэн",
    color: {
      bg: "#F0FDF4",
      text: "#15803D",
      border: "#BBF7D0",
      active: "#15803D",
    },
    tooltip: "Бэлэг хүргэгдсэн",
    test: (c) => c.giftDone,
  },
];

function TierBadge({ tier }) {
  const tc = tierColors[tier] || tierColors.SILVER;
  return (
    <span
      style={{
        background: tc.bg,
        color: tc.text,
        border: `1px solid ${tc.border}`,
        borderRadius: 99,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {tier}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: "12px 16px",
        minWidth: 100,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

export default function Clients({ initialClients, onClientUpdate }) {
  const [clients, setClients] = useState(initialClients);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [editingPickupId, setEditingPickupId] = useState(null);
  const [pickupDraft, setPickupDraft] = useState({
    pickupNotified: false,
    pickupCenter: "Мөнгөн Завьяа зээлийн төв",
    pickupNotifiedAt: "",
  });
  const [search, setSearch] = useState("");
  const [giftDate, setGiftDate] = useState("");
  const [smartFilter, setSmartFilter] = useState(null); // SMART_FILTERS-ийн түлхүүр эсвэл null
  const deferredSearch = useDeferredValue(search.trim());

  // ─── Sync when initialClients changes (API refresh) ───────────────────────
  useEffect(() => {
    if (!smartFilter && !deferredSearch && !giftDate) {
      setClients(initialClients);
    }
  }, [initialClients]);

  // ─── Fetch from API when server-side filters apply ────────────────────────
  useEffect(() => {
    if (!deferredSearch && !giftDate) return;
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const result = await fetchClients({
          search: deferredSearch || undefined,
          giftDate: giftDate || undefined,
        });
        if (!active) return;
        startTransition(() => setClients(result));
      } catch (e) {
        if (active) setError(e.message || "Үйлчлүүлэгчдийг ачаалж чадсангүй.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [deferredSearch, giftDate]);

  // ─── Client-side smart filtering ──────────────────────────────────────────
  const activeSmartDef = SMART_FILTERS.find((f) => f.key === smartFilter);

  const filtered = clients.filter((c) => {
    if (activeSmartDef && !activeSmartDef.test(c)) return false;
    return true;
  });

  // ─── Stats (always from full clients list, not filtered) ──────────────────
  const atRiskDef = SMART_FILTERS.find((f) => f.key === "AT_RISK");
  const waitlistDef = SMART_FILTERS.find((f) => f.key === "WAITLIST");
  const atRiskCount = atRiskDef ? clients.filter(atRiskDef.test).length : 0;
  const waitlistCount = waitlistDef ? clients.filter(waitlistDef.test).length : 0;
  const deliveredCount = clients.filter((c) => c.giftDone).length;
  const hasFilters = smartFilter || deferredSearch || giftDate;

  const editingClient = useMemo(
    () =>
      editingPickupId
        ? clients.find((c) => String(c.id) === String(editingPickupId)) || null
        : null,
    [clients, editingPickupId],
  );

  const openPickupEditor = (client) => {
    setEditingPickupId(client.id);
    setPickupDraft({
      pickupNotified: Boolean(client.pickupNotified),
      pickupCenter: client.pickupCenter || "Мөнгөн Завьяа зээлийн төв",
      pickupNotifiedAt: client.pickupNotifiedAt || "",
    });
  };

  const closePickupEditor = () => {
    setEditingPickupId(null);
  };

  const savePickupEditor = async () => {
    if (!editingClient) return;
    try {
      setUpdatingId(editingClient.id);
      setError("");
      const updated = await updateClient(editingClient.id, {
        pickupNotified: Boolean(pickupDraft.pickupNotified),
        pickupCenter: pickupDraft.pickupCenter,
        pickupNotifiedAt: pickupDraft.pickupNotifiedAt || "",
      });
      setClients((current) =>
        current.map((c) => (c.id === updated.id ? updated : c)),
      );
      onClientUpdate?.(updated);
      closePickupEditor();
    } catch (e) {
      setError(e.message || "Төлөв шинэчилж чадсангүй.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      {/* ── At-Risk Alert Banner ── */}
      {atRiskCount > 0 && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: "#B91C1C",
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 14,
            justifyContent: "space-between",
          }}
        >
          <span>
            ⚠️{" "}
            <strong>
              {atRiskCount} client{atRiskCount > 1 ? "s" : ""}
            </strong>{" "}
            өмнө нь GOD байсан ч буурсан байна — бэлэг хүргэгдээгүй. Портфелиос
            гарахаас нь өмнө шийдвэрлээрэй.
          </span>
          <button
            onClick={() => setSmartFilter("AT_RISK")}
            style={{
              fontSize: 11,
              padding: "4px 12px",
              borderRadius: 99,
              border: "1px solid #FECACA",
              background: "#fff",
              color: "#B91C1C",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Харах →
          </button>
        </div>
      )}

      {/* ── Waitlist Alert Banner ── */}
      {waitlistCount > 0 && (
        <div
          style={{
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: "#15803D",
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 14,
            justifyContent: "space-between",
          }}
        >
          <span>
            🆕{" "}
            <strong>
              {waitlistCount} new GOD client{waitlistCount > 1 ? "s" : ""}
            </strong>{" "}
            waitlist-ээс GOD болсон — бэлэг хараахан олгоогүй.
          </span>
          <button
            onClick={() => setSmartFilter("WAITLIST")}
            style={{
              fontSize: 11,
              padding: "4px 12px",
              borderRadius: 99,
              border: "1px solid #BBF7D0",
              background: "#fff",
              color: "#15803D",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Харах →
          </button>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        <StatCard
          label="Нийт"
          value={clients.length}
          color="#1E293B"
        />
        <StatCard
          label="Хүргэгдсэн"
          value={deliveredCount}
          color="#15803D"
        />
        <StatCard label="Эрсдэлтэй" value={atRiskCount} color="#B91C1C" />
        <StatCard label="Waitlist GOD" value={waitlistCount} color="#0369A1" />
      </div>

      {/* ── Ухаалаг шүүлтүүр ── */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}
      >
        {SMART_FILTERS.map((f) => {
          const isActive = smartFilter === f.key;
          const count = clients.filter(f.test).length;
          return (
            <button
              key={f.key}
              onClick={() => setSmartFilter(isActive ? null : f.key)}
              title={f.tooltip}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 99,
                cursor: "pointer",
                fontWeight: isActive ? 700 : 500,
                border: isActive
                  ? `1.5px solid ${f.color.active}`
                  : `1px solid ${f.color.border}`,
                background: isActive ? f.color.bg : "#fff",
                color: isActive ? f.color.text : "#64748B",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {f.label}
              <span
                style={{
                  background: isActive ? f.color.active : "#E2E8F0",
                  color: isActive ? "#fff" : "#64748B",
                  borderRadius: 99,
                  padding: "0px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Хайлт / Огноо ── */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Нэрээр хайх..."
          style={{
            flex: 2,
            minWidth: 160,
            fontSize: 13,
            padding: "8px 12px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            background: "#fff",
            color: "#1E293B",
          }}
        />
        <input
          type="date"
          value={giftDate}
          onChange={(e) => setGiftDate(e.target.value)}
          style={{
            fontSize: 13,
            padding: "8px 12px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            background: "#fff",
            color: "#1E293B",
          }}
        />
        <button
          onClick={() => {
            setSearch("");
            setSmartFilter(null);
            setGiftDate("");
          }}
          disabled={!hasFilters}
          style={{
            fontSize: 12,
            padding: "7px 14px",
            borderRadius: 8,
            cursor: hasFilters ? "pointer" : "not-allowed",
            fontWeight: 500,
            border: "1px solid #E2E8F0",
            background: "#fff",
            color: "#64748B",
            opacity: hasFilters ? 1 : 0.5,
          }}
        >
          Бүгдийг цэвэрлэх
        </button>
      </div>

      {loading && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#64748B" }}>
          Ачаалж байна...
        </div>
      )}
      {error && (
        <div
          style={{
            marginBottom: 12,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#B91C1C",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
            {[
              "#",
              "Овог",
              "Нэр",
              "Утас",
              "Түвшин",
              "Бэлгийн төлөв",
              "Огноо",
              "📞 Мэдэгдсэн",
              "Зээлийн гэрээ",
            ].map((h) => (
              <th
                key={h}
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
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((c, i) => {
            const wasGodDowngraded =
              c.previousTier === "GOD" && c.tier !== "GOD";
            const isWaitlistNew = c.isWaitlist && c.tier === "GOD";
            const rowBg =
              wasGodDowngraded && !c.giftDone
                ? "#FFFBEB"
                : isWaitlistNew
                  ? "#F0FDF4"
                  : "transparent";

            return (
              <tr
                key={c.id}
                style={{ borderBottom: "1px solid #F1F5F9", background: rowBg }}
              >
                <td style={{ padding: "11px 10px", color: "#94A3B8" }}>
                  {i + 1}
                </td>
                <td style={{ padding: "11px 10px", fontWeight: 500 }}>
                  {c.last}
                </td>
                <td style={{ padding: "11px 10px" }}>{c.first}</td>
                <td
                  style={{
                    padding: "11px 10px",
                    color: "#64748B",
                    fontFamily: "monospace",
                  }}
                >
                  {c.phone}
                </td>
                <td style={{ padding: "11px 10px" }}>
                  <TierBadge tier={c.tier} />
                  {isWaitlistNew && (
                    <span
                      style={{
                        fontSize: 10,
                        marginLeft: 4,
                        color: "#15803D",
                        fontWeight: 600,
                      }}
                    >
                      NEW
                    </span>
                  )}
                </td>

                {/* Gift status */}
                <td style={{ padding: "11px 10px" }}>
                  {c.giftDone ? (
                    <span
                      style={{
                        background: "#F0FDF4",
                        color: "#16A34A",
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      ✓ Хүргэгдсэн
                    </span>
                  ) : wasGodDowngraded ? (
                    <span
                      style={{
                        background: "#FEF2F2",
                        color: "#B91C1C",
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        border: "1px solid #FECACA",
                      }}
                    >
                      ⚠️ Эрсдэлтэй
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "#FEF9F2",
                        color: "#D97706",
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        border: "1px solid #FDE68A",
                      }}
                    >
                      ⏳ Хүлээгдэж буй
                    </span>
                  )}
                </td>

                <td
                  style={{
                    padding: "11px 10px",
                    color: "#64748B",
                    fontSize: 12,
                  }}
                >
                  {c.giftDate || "—"}
                </td>

                {/* Pickup notified */}
                <td style={{ padding: "11px 10px" }}>
                  <button
                    onClick={() => openPickupEditor(c)}
                    disabled={updatingId === c.id}
                    title="Утсаар мэдэгдсэн эсэх (Мөнгөн Завьяа зээлийн төвөөс авах)"
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 99,
                      border: `1px solid ${
                        c.pickupNotified ? "#BBF7D0" : "#E2E8F0"
                      }`,
                      background: c.pickupNotified ? "#F0FDF4" : "#fff",
                      color: c.pickupNotified ? "#15803D" : "#64748B",
                      cursor: updatingId === c.id ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      opacity: updatingId === c.id ? 0.6 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.pickupNotified ? "📞 Тийм" : "Засах…"}
                  </button>
                  {c.pickupNotifiedAt ? (
                    <div style={{ marginTop: 4, fontSize: 10, color: "#94A3B8" }}>
                      {c.pickupNotifiedAt}
                    </div>
                  ) : null}
                  {c.pickupNotified && c.pickupCenter ? (
                    <div style={{ marginTop: 4, fontSize: 10, color: "#64748B" }}>
                      {c.pickupCenter}
                    </div>
                  ) : null}
                </td>

                <td style={{ padding: "11px 10px" }}>
                  {c.loan ? (
                    <span
                      style={{
                        background: "#EFF6FF",
                        color: "#1D4ED8",
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        border: "1px solid #BFDBFE",
                      }}
                    >
                      ✓ Тийм
                    </span>
                  ) : (
                    <span style={{ color: "#94A3B8", fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!loading && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 32,
            color: "#94A3B8",
            fontSize: 13,
          }}
        >
          Одоогийн шүүлтүүрт тохирох харилцагч олдсонгүй.
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "#94A3B8" }}>
        {clients.length}-с {filtered.length} харуулж байна
      </div>

      {/* Inline editor modal */}
      {editingClient && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePickupEditor();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              boxShadow: "0 18px 50px rgba(15, 23, 42, 0.25)",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>
              📞 “Мэдэгдсэн” засах
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748B" }}>
              {editingClient.last} {editingClient.first} ({editingClient.phone})
            </div>

            <div style={{ marginTop: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "#1E293B",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={pickupDraft.pickupNotified}
                  onChange={(e) =>
                    setPickupDraft((d) => ({
                      ...d,
                      pickupNotified: e.target.checked,
                      pickupNotifiedAt: e.target.checked
                        ? d.pickupNotifiedAt || new Date().toISOString().slice(0, 10)
                        : "",
                    }))
                  }
                />
                Утсаар мэдэгдсэн
              </label>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "1fr 160px",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>
                  Очих төв
                </div>
                <input
                  value={pickupDraft.pickupCenter}
                  onChange={(e) =>
                    setPickupDraft((d) => ({ ...d, pickupCenter: e.target.value }))
                  }
                  placeholder="Мөнгөн Завьяа зээлийн төв"
                  style={{
                    width: "100%",
                    fontSize: 13,
                    padding: "8px 12px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#1E293B",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>
                  Огноо
                </div>
                <input
                  type="date"
                  value={pickupDraft.pickupNotifiedAt || ""}
                  onChange={(e) =>
                    setPickupDraft((d) => ({ ...d, pickupNotifiedAt: e.target.value }))
                  }
                  disabled={!pickupDraft.pickupNotified}
                  style={{
                    width: "100%",
                    fontSize: 13,
                    padding: "8px 12px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    background: pickupDraft.pickupNotified ? "#fff" : "#F8FAFC",
                    color: "#1E293B",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={closePickupEditor}
                style={{
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  background: "#fff",
                  color: "#64748B",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Болих
              </button>
              <button
                onClick={savePickupEditor}
                disabled={updatingId === editingClient.id}
                style={{
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: "#1E293B",
                  color: "#fff",
                  cursor: updatingId === editingClient.id ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: updatingId === editingClient.id ? 0.7 : 1,
                }}
              >
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
