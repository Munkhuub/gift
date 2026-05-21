import { useEffect, useMemo, useState } from "react";
import {
  MARKETING_RESOURCE_STATUSES,
  MARKETING_RESOURCE_TYPES,
} from "../data/marketingResources.js";
import { fetchMarketingResources } from "../lib/api";

const typeLabels = {
  MERCH: "Merch",
  CREATIVE: "Creative",
  BUDGET: "Budget",
  STAFF: "Staff",
  CHANNEL: "Channel",
};

const statusLabels = {
  REQUESTED: "Requested",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  DEPLOYED: "Deployed",
};

const statusColors = {
  REQUESTED: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  IN_PROGRESS: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  READY: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  DEPLOYED: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
};

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${Number(value).toLocaleString("en-US")} MNT`;
}

export default function MarketingResources({
  initialResources,
  onCreate,
  onUpdate,
}) {
  const [resources, setResources] = useState(initialResources);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [neededBy, setNeededBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    campaign: "",
    resourceType: "MERCH",
    owner: "",
    status: "REQUESTED",
    quantity: "",
    budget: "",
    neededBy: "",
    vendor: "",
    note: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  useEffect(() => {
    const noFilters =
      !search.trim() &&
      statusFilter === "ALL" &&
      typeFilter === "ALL" &&
      !neededBy;

    if (noFilters) {
      setResources(initialResources);
      setError("");
      return;
    }

    let active = true;

    async function loadFilteredResources() {
      try {
        setLoading(true);
        setError("");
        const filteredResources = await fetchMarketingResources({
          search: search.trim() || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          resourceType: typeFilter === "ALL" ? undefined : typeFilter,
          neededBy: neededBy || undefined,
        });

        if (active) {
          setResources(filteredResources);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError.message || "Could not load filtered marketing resources.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFilteredResources();

    return () => {
      active = false;
    };
  }, [initialResources, neededBy, search, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const byStatus = MARKETING_RESOURCE_STATUSES.reduce((acc, status) => {
      acc[status] = resources.filter((resource) => resource.status === status).length;
      return acc;
    }, {});

    const totalBudget = resources.reduce(
      (sum, resource) => sum + (resource.budget || 0),
      0,
    );

    return {
      total: resources.length,
      totalBudget,
      byStatus,
    };
  }, [resources]);

  const setFormField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      campaign: "",
      resourceType: "MERCH",
      owner: "",
      status: "REQUESTED",
      quantity: "",
      budget: "",
      neededBy: "",
      vendor: "",
      note: "",
    });
  };

  const handleCreate = async () => {
    setFormError("");
    setFormSuccess("");

    const created = await onCreate({
      ...form,
      quantity: form.quantity === "" ? null : Number(form.quantity),
      budget: form.budget === "" ? null : Number(form.budget),
    });

    if (!created) {
      setFormError("Could not save this marketing resource.");
      return;
    }

    setResources((current) =>
      [...current, created].sort((a, b) =>
        (a.neededBy || "9999-12-31").localeCompare(b.neededBy || "9999-12-31"),
      ),
    );
    resetForm();
    setFormSuccess("Marketing resource saved.");
  };

  const handleStatusUpdate = async (resourceId, status) => {
    setSavingId(resourceId);
    const updated = await onUpdate(resourceId, { status });
    setSavingId(null);

    if (!updated) {
      return;
    }

    setResources((current) =>
      current.map((resource) =>
        resource.id === updated.id ? updated : resource,
      ),
    );
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "14px 16px",
          color: "#334155",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        Separate workspace for marketing team resource input, vendor readiness,
        and campaign support tracking. This stays independent from GOD-tier gift
        delivery records.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total resources", value: summary.total, color: "#1E293B" },
          {
            label: "Requested",
            value: summary.byStatus.REQUESTED,
            color: "#D97706",
          },
          {
            label: "In progress",
            value: summary.byStatus.IN_PROGRESS,
            color: "#2563EB",
          },
          {
            label: "Tracked budget",
            value: formatMoney(summary.totalBudget),
            color: "#047857",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: "14px 16px",
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
              {card.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 0.95fr) minmax(0, 1.25fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#1E293B",
              marginBottom: 18,
            }}
          >
            Add marketing resource
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <input
              value={form.name}
              onChange={(event) => setFormField("name", event.target.value)}
              placeholder="Resource name"
              style={inputStyle}
            />
            <input
              value={form.campaign}
              onChange={(event) => setFormField("campaign", event.target.value)}
              placeholder="Campaign"
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <select
              value={form.resourceType}
              onChange={(event) =>
                setFormField("resourceType", event.target.value)
              }
              style={inputStyle}
            >
              {MARKETING_RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(event) => setFormField("status", event.target.value)}
              style={inputStyle}
            >
              {MARKETING_RESOURCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <input
              value={form.owner}
              onChange={(event) => setFormField("owner", event.target.value)}
              placeholder="Owner"
              style={inputStyle}
            />
            <input
              value={form.vendor}
              onChange={(event) => setFormField("vendor", event.target.value)}
              placeholder="Vendor or channel"
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(event) => setFormField("quantity", event.target.value)}
              placeholder="Quantity"
              style={inputStyle}
            />
            <input
              type="number"
              min="0"
              value={form.budget}
              onChange={(event) => setFormField("budget", event.target.value)}
              placeholder="Budget"
              style={inputStyle}
            />
            <input
              type="date"
              value={form.neededBy}
              onChange={(event) => setFormField("neededBy", event.target.value)}
              style={inputStyle}
            />
          </div>

          <textarea
            value={form.note}
            onChange={(event) => setFormField("note", event.target.value)}
            placeholder="Operational note"
            style={{
              ...inputStyle,
              minHeight: 88,
              resize: "vertical",
              marginBottom: 12,
            }}
          />

          <button
            onClick={handleCreate}
            style={{
              fontSize: 13,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#1E293B",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Save marketing resource
          </button>

          {formError && <div style={errorStyle}>{formError}</div>}
          {formSuccess && <div style={successStyle}>{formSuccess}</div>}
        </div>

        <div>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, campaign, owner..."
              style={{ ...inputStyle, flex: 1, minWidth: 220 }}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ ...inputStyle, width: 160 }}
            >
              <option value="ALL">All statuses</option>
              {MARKETING_RESOURCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              style={{ ...inputStyle, width: 160 }}
            >
              <option value="ALL">All types</option>
              {MARKETING_RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={neededBy}
              onChange={(event) => setNeededBy(event.target.value)}
              style={{ ...inputStyle, width: 160 }}
            />
          </div>

          {loading && (
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>
              Loading marketing resources...
            </div>
          )}
          {error && <div style={errorStyle}>{error}</div>}

          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {resources.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: "#94A3B8" }}>
                No marketing resources matched the current filters.
              </div>
            ) : (
              resources.map((resource, index) => {
                const palette =
                  statusColors[resource.status] || statusColors.REQUESTED;

                return (
                  <div
                    key={resource.id}
                    style={{
                      padding: "16px 18px",
                      borderTop: index === 0 ? "none" : "1px solid #F1F5F9",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1E293B",
                            marginBottom: 4,
                          }}
                        >
                          {resource.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          {resource.campaign || "No campaign"} •{" "}
                          {typeLabels[resource.resourceType]} •{" "}
                          {resource.owner || "Unassigned"}
                        </div>
                      </div>
                      <span
                        style={{
                          background: palette.bg,
                          color: palette.text,
                          border: `1px solid ${palette.border}`,
                          borderRadius: 99,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {statusLabels[resource.status]}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 10,
                        marginBottom: 10,
                        fontSize: 12,
                        color: "#475569",
                      }}
                    >
                      <div>Needed by: {resource.neededBy || "—"}</div>
                      <div>Quantity: {resource.quantity ?? "—"}</div>
                      <div>Budget: {formatMoney(resource.budget)}</div>
                      <div>Vendor: {resource.vendor || "—"}</div>
                    </div>

                    {resource.note && (
                      <div
                        style={{
                          marginBottom: 10,
                          fontSize: 12,
                          color: "#475569",
                          lineHeight: 1.6,
                        }}
                      >
                        {resource.note}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <select
                        value={resource.status}
                        onChange={(event) =>
                          handleStatusUpdate(resource.id, event.target.value)
                        }
                        disabled={savingId === resource.id}
                        style={{ ...inputStyle, width: 160 }}
                      >
                        {MARKETING_RESOURCE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: 12, color: "#64748B" }}>
                        {savingId === resource.id
                          ? "Saving..."
                          : "Update status directly from the tracker."}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  fontSize: 13,
  padding: "9px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  background: "#fff",
  color: "#1E293B",
  outline: "none",
  fontFamily: "inherit",
};

const errorStyle = {
  marginTop: 12,
  background: "#FEF2F2",
  border: "1px solid #FECACA",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 12,
  color: "#B91C1C",
};

const successStyle = {
  marginTop: 12,
  background: "#F0FDF4",
  border: "1px solid #BBF7D0",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 12,
  color: "#15803D",
};
