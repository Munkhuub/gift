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

export default function Clients({ initialClients }) {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [giftDate, setGiftDate] = useState("");
  const [clients, setClients] = useState(initialClients);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    if (status === "ALL" && !deferredSearch && !giftDate) {
      setClients(initialClients);
    }
  }, [initialClients, status, deferredSearch, giftDate]);

  useEffect(() => {
    if (status === "ALL" && !deferredSearch && !giftDate) {
      return;
    }

    let active = true;

    async function loadFilteredClients() {
      try {
        setLoading(true);
        setError("");
        const filteredClients = await fetchClients({
          search: deferredSearch || undefined,
          status: status === "ALL" ? undefined : status,
          giftDate: giftDate || undefined,
        });

        if (!active) {
          return;
        }

        startTransition(() => {
          setClients(filteredClients);
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message || "Could not load filtered clients.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFilteredClients();

    return () => {
      active = false;
    };
  }, [deferredSearch, giftDate, status]);

  const hasFilters = status !== "ALL" || Boolean(deferredSearch) || Boolean(giftDate);

  return (
    <div>
      <div
        style={{
          marginBottom: 14,
          background: "#FFF8ED",
          border: "1px solid #FCD34D",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          color: "#92400E",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        👑 <span>This registry is focused on GOD-tier clients only. Use search, status, and delivery day filters to narrow the VIP portfolio quickly.</span>
      </div>

      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GOD clients..."
          style={{
            flex: 1,
            minWidth: 180,
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
        {["ALL", "pending", "delivered"].map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            style={{
              fontSize: 12,
              padding: "7px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 500,
              border:
                status === value
                  ? "1.5px solid #1E293B"
                  : "1px solid #E2E8F0",
              background: status === value ? "#1E293B" : "#fff",
              color: status === value ? "#fff" : "#64748B",
            }}
          >
            {value === "ALL"
              ? "All"
              : value === "pending"
                ? "Pending"
                : "Delivered"}
          </button>
        ))}
        <button
          onClick={() => {
            setSearch("");
            setStatus("ALL");
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
          Clear
        </button>
      </div>

      {loading && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#64748B" }}>
          Loading GOD-tier clients...
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
      {!loading && !error && clients.length === 0 && (
        <div
          style={{
            marginBottom: 16,
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 13,
            color: "#64748B",
          }}
        >
          No GOD-tier clients matched the current filters.
        </div>
      )}

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
          {clients.map((c, i) => {
            const tc = tierColors[c.tier] || tierColors.SILVER;
            return (
              <tr key={c.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
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
                    {c.tier}
                  </span>
                </td>
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
                  ) : (
                    <span
                      style={{
                        background: "#FEF2F2",
                        color: "#DC2626",
                        borderRadius: 99,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        border: "1px solid #FECACA",
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
      {clients.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 32,
            color: "#94A3B8",
            fontSize: 13,
          }}
        >
          No clients found.
        </div>
      )}
    </div>
  );
}
