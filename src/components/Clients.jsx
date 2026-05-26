import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { fetchClients } from "../lib/api";

const tierColors = {
  GOD: { bg: "#FFF8ED", text: "#92400E", border: "#FCD34D" },
  KING: { bg: "#F0F4FF", text: "#1E3A8A", border: "#93C5FD" },
  BOSS: { bg: "#FFFBEB", text: "#78350F", border: "#FDE68A" },
  STAR: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
  FAN: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  SILVER: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" },
};

// Smart filter definitions — each has a label and a function that tests a client row
const SMART_FILTERS = [
  {
    key: "AT_RISK",
    label: "⚠️ Gift at Risk",
    color: {
      bg: "#FEF2F2",
      text: "#B91C1C",
      border: "#FECACA",
      active: "#B91C1C",
    },
    tooltip: "Was GOD tier — gift not yet delivered — now downgraded",
    test: (c) => c.previousTier === "GOD" && c.tier !== "GOD" && !c.giftDone,
  },
  {
    key: "WAITLIST",
    label: "🆕 Waitlist GOD",
    color: {
      bg: "#F0FDF4",
      text: "#15803D",
      border: "#BBF7D0",
      active: "#15803D",
    },
    tooltip: "Newly promoted GOD from waitlist — gift not yet assigned",
    test: (c) => c.isWaitlist && c.tier === "GOD" && !c.giftDone,
  },
  {
    key: "OVERDUE",
    label: "🔴 Overdue 5d+",
    color: {
      bg: "#FFF7ED",
      text: "#C2410C",
      border: "#FED7AA",
      active: "#C2410C",
    },
    tooltip: "Loan overdue 5 or more days — tier change risk",
    test: (c) => (c.loanOverdueDays || 0) >= 5,
  },
  {
    key: "PENDING",
    label: "⏳ Pending Gift",
    color: {
      bg: "#F8FAFC",
      text: "#475569",
      border: "#CBD5E1",
      active: "#475569",
    },
    tooltip: "Gift not yet delivered",
    test: (c) => !c.giftDone,
  },
  {
    key: "DELIVERED",
    label: "✓ Delivered",
    color: {
      bg: "#F0FDF4",
      text: "#15803D",
      border: "#BBF7D0",
      active: "#15803D",
    },
    tooltip: "Gift delivered",
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

export default function Clients({ initialClients }) {
  const [clients, setClients] = useState(initialClients);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [giftDate, setGiftDate] = useState("");
  const [smartFilter, setSmartFilter] = useState(null); // key of SMART_FILTERS or null
  const [overdueDays, setOverdueDays] = useState(""); // free input for overdue threshold
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
        if (active) setError(e.message || "Could not load clients.");
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
    if (overdueDays && (c.loanOverdueDays || 0) < Number(overdueDays))
      return false;
    return true;
  });

  // ─── Stats (always from full clients list, not filtered) ──────────────────
  const atRiskCount = clients.filter(SMART_FILTERS[0].test).length;
  const waitlistCount = clients.filter(SMART_FILTERS[1].test).length;
  const overdueCount = clients.filter(SMART_FILTERS[2].test).length;
  const deliveredCount = clients.filter((c) => c.giftDone).length;
  const hasFilters = smartFilter || deferredSearch || giftDate || overdueDays;

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
            were GOD tier but got downgraded — gift not yet delivered. Act
            before they leave the portfolio.
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
            View them →
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
            promoted from waitlist — gifts not yet assigned.
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
            View them →
          </button>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        <StatCard
          label="Total clients"
          value={clients.length}
          color="#1E293B"
        />
        <StatCard
          label="Gifts delivered"
          value={deliveredCount}
          color="#15803D"
        />
        <StatCard label="Gift at risk" value={atRiskCount} color="#B91C1C" />
        <StatCard label="Waitlist GODs" value={waitlistCount} color="#0369A1" />
        <StatCard label="Overdue 5d+" value={overdueCount} color="#C2410C" />
      </div>

      {/* ── Smart Filter Chips ── */}
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

      {/* ── Search / Date / Overdue Inputs ── */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
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
        <input
          type="number"
          value={overdueDays}
          onChange={(e) => setOverdueDays(e.target.value)}
          placeholder="Overdue ≥ days"
          min={0}
          style={{
            width: 130,
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
            setOverdueDays("");
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
          Clear all
        </button>
      </div>

      {loading && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#64748B" }}>
          Loading clients...
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
              "Last name",
              "First name",
              "Phone",
              "Tier",
              "Previous tier",
              "Overdue days",
              "Gift status",
              "Gift date",
              "Loan",
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

                {/* Previous tier — key column for downgrade tracking */}
                <td style={{ padding: "11px 10px" }}>
                  {c.previousTier && c.previousTier !== c.tier ? (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <TierBadge tier={c.previousTier} />
                      <span style={{ fontSize: 10, color: "#94A3B8" }}>
                        → {c.tier}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "#CBD5E1", fontSize: 12 }}>—</span>
                  )}
                </td>

                {/* Overdue days */}
                <td style={{ padding: "11px 10px" }}>
                  {c.loanOverdueDays > 0 ? (
                    <span
                      style={{
                        background:
                          c.loanOverdueDays >= 5 ? "#FEF2F2" : "#FFF7ED",
                        color: c.loanOverdueDays >= 5 ? "#B91C1C" : "#C2410C",
                        border: `1px solid ${c.loanOverdueDays >= 5 ? "#FECACA" : "#FED7AA"}`,
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {c.loanOverdueDays}d
                    </span>
                  ) : (
                    <span style={{ color: "#94A3B8", fontSize: 12 }}>—</span>
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
                      ✓ Delivered
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
                      ⚠️ At risk
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
                      ⏳ Pending
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
                      ✓ Yes
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
          No clients matched the current filters.
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "#94A3B8" }}>
        Showing {filtered.length} of {clients.length} clients
      </div>
    </div>
  );
}
