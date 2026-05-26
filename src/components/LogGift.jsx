import { useEffect, useMemo, useState } from "react";

const inputStyle = {
  fontSize: 13,
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  background: "#fff",
  color: "#1E293B",
  outline: "none",
  boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 12,
  color: "#64748B",
  display: "block",
  marginBottom: 5,
  fontWeight: 500,
};

export default function LogGift({
  clients,
  history,
  marketingResources = [],
  preselectedClientId = "",
  onLog,
}) {
  const [form, setForm] = useState({
    clientId: "",
    date: new Date().toISOString().split("T")[0],
    selectedItems: {},
    deliveredBy: "",
    loan: false,
    note: "",
  });
  const [clientScope, setClientScope] = useState("queue"); // queue | all
  const [clientSearch, setClientSearch] = useState("");
  const [giftSearch, setGiftSearch] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pendingGiftQueue = useMemo(
    () => clients.filter((c) => c.giftStillOwed && !c.giftDone),
    [clients],
  );

  const selectedClient = useMemo(() => {
    if (!form.clientId) return null;
    const id = Number(form.clientId);
    if (!Number.isFinite(id)) return null;
    return clients.find((c) => Number(c.id) === id) || null;
  }, [clients, form.clientId]);

  useEffect(() => {
    if (!preselectedClientId) return;
    setForm((prev) => {
      if (String(prev.clientId) === String(preselectedClientId)) {
        return prev;
      }
      return { ...prev, clientId: String(preselectedClientId) };
    });
    setClientScope("all");
  }, [preselectedClientId]);

  const { selectableClients, fallbackToAllClients } = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();

    const matches = (client) => {
      if (!query) return true;
      const haystack = [
        client.first,
        client.last,
        // include both orders so searching "First Last" still works well
        `${client.first || ""} ${client.last || ""}`,
        `${client.last || ""} ${client.first || ""}`,
        client.phone,
        client.tier,
        client.previousTier,
        client.note,
        client.statusReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    };

    const sortClients = (list) =>
      list.slice().sort((a, b) => {
        // Former GOD still owed gifts should float to the top when in queue mode.
        const aFormer = a.previousTier === "GOD" && a.tier !== "GOD";
        const bFormer = b.previousTier === "GOD" && b.tier !== "GOD";
        if (aFormer !== bFormer) return aFormer ? -1 : 1;
        return String(a.last || "").localeCompare(String(b.last || ""), "mn");
      });

    const base = clientScope === "all" ? clients : pendingGiftQueue;
    const filteredBase = sortClients(base.filter(matches));

    // UX: if user is searching in the queue and gets 0 results, automatically
    // show matches from the full client list so “search feels like it works”.
    if (clientScope !== "all" && query && filteredBase.length === 0) {
      return {
        selectableClients: sortClients(clients.filter(matches)),
        fallbackToAllClients: true,
      };
    }

    return { selectableClients: filteredBase, fallbackToAllClients: false };
  }, [clientScope, clientSearch, clients, pendingGiftQueue]);

  const selectedCount = useMemo(
    () =>
      Object.values(form.selectedItems || {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      ),
    [form.selectedItems],
  );

  const inventoryItems = useMemo(() => {
    const items = Array.isArray(marketingResources) ? marketingResources : [];
    return items
      .slice()
      .sort((a, b) => {
        const cat = String(a.category || "").localeCompare(String(b.category || ""));
        if (cat !== 0) return cat;
        return String(a.name || "").localeCompare(String(b.name || ""), "mn");
      });
  }, [marketingResources]);

  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [Number(item.id), item])),
    [inventoryItems],
  );

  const filteredInventoryItems = useMemo(() => {
    const query = giftSearch.trim().toLowerCase();
    if (!query) return inventoryItems;
    return inventoryItems.filter((item) => {
      const haystack = [
        item.name,
        item.category,
        item.note,
        item.storageLocation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [giftSearch, inventoryItems]);

  const changeItemQty = (itemId, delta) => {
    setForm((prev) => {
      const id = Number(itemId);
      const item = inventoryById.get(id);
      if (!item) return prev;

      const current = Number(prev.selectedItems?.[id] || 0);
      const next = Math.max(
        0,
        Math.min(current + delta, Number(item.remainingStock || 0)),
      );

      const selectedItems = { ...(prev.selectedItems || {}) };
      if (next === 0) {
        delete selectedItems[id];
      } else {
        selectedItems[id] = next;
      }

      return { ...prev, selectedItems };
    });
  };

  const selectedInventoryPayload = useMemo(() => {
    const entries = Object.entries(form.selectedItems || {})
      .map(([id, qty]) => ({
        itemId: Number(id),
        quantity: Number(qty || 0),
      }))
      .filter(
        (entry) =>
          Number.isFinite(entry.itemId) &&
          entry.itemId > 0 &&
          Number.isFinite(entry.quantity) &&
          entry.quantity > 0,
      );
    return entries;
  }, [form.selectedItems]);

  const selectedGiftLabel = useMemo(() => {
    const parts = [];
    for (const entry of selectedInventoryPayload) {
      const item = inventoryById.get(entry.itemId);
      const name = item?.name || `#${entry.itemId}`;
      parts.push(entry.quantity > 1 ? `${name} ×${entry.quantity}` : name);
    }
    return parts.join(" • ");
  }, [inventoryById, selectedInventoryPayload]);

  const handleSubmit = async () => {
    if (!form.clientId || !selectedClient) {
      setError("Үйлчлүүлэгч сонгоно уу.");
      return;
    }
    if (selectedClient.giftDone) {
      setError("Энэ харилцагчийн бэлэг аль хэдийн хүргэгдсэн байна.");
      return;
    }
    if (selectedCount === 0) {
      setError("Доод тал нь нэг бэлгийн зүйл сонгоно уу.");
      return;
    }

    setSaving(true);
    setError("");

    const saved = await onLog({
      clientId: parseInt(form.clientId, 10),
      date: form.date,
      type: selectedGiftLabel,
      items: selectedInventoryPayload,
      deliveredBy: form.deliveredBy,
      loan: form.loan,
      note: form.note,
    });

    setSaving(false);

    if (!saved) {
      setError("Хүргэлтийн бүртгэлийг хадгалж чадсангүй.");
      return;
    }

    setSuccess(true);
    setForm({
      clientId: "",
      date: new Date().toISOString().split("T")[0],
      selectedItems: {},
      deliveredBy: "",
      loan: false,
      note: "",
    });
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div>
      <div
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: 24,
          maxWidth: 640,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#1E293B",
            marginBottom: 20,
          }}
        >
          Бэлэг хүлээлгэн өгсөн бүртгэл
        </div>

        {/* Client + Date */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Үйлчлүүлэгч *</label>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                { id: "queue", label: "Бэлгийн дараалал" },
                { id: "all", label: "Бүх үйлчлүүлэгч" },
              ].map((option) => {
                const active = clientScope === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setClientScope(option.id)}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 99,
                      border: `1px solid ${active ? "#1E293B" : "#E2E8F0"}`,
                      background: active ? "#1E293B" : "#fff",
                      color: active ? "#fff" : "#475569",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Нэр, утас, тайлбар... хайх"
              style={{ ...inputStyle, marginBottom: 10 }}
            />

            {fallbackToAllClients && (
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 12,
                  background: "#FFF8ED",
                  border: "1px solid #FCD34D",
                  borderRadius: 10,
                  padding: "8px 10px",
                  color: "#92400E",
                }}
              >
                Дараалал дээр олдсонгүй. Бүх үйлчлүүлэгчээс хайлтын үр дүнг
                харуулж байна.
              </div>
            )}

            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                background: "#fff",
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              {selectableClients.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: "#94A3B8" }}>
                  Таарах үйлчлүүлэгч олдсонгүй.
                </div>
              ) : (
                selectableClients.slice(0, 60).map((c, idx) => {
                  const selected = String(form.clientId) === String(c.id);
                  const formerGod =
                    c.previousTier === "GOD" && c.tier !== "GOD";
                  return (
                    <div
                      key={c.id}
                      onClick={() => set("clientId", String(c.id))}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderTop: idx === 0 ? "none" : "1px solid #F1F5F9",
                        background: selected ? "#F1F5F9" : "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1E293B",
                          }}
                        >
                          {c.last} {c.first}
                          {c.phone ? (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 12,
                                color: "#64748B",
                                fontWeight: 500,
                              }}
                            >
                              {c.phone}
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          {formerGod
                            ? "⚠️ Өмнөх GOD (бэлэг дутуу)"
                            : c.giftDone
                              ? "Хүргэгдсэн"
                              : "Хүлээгдэж буй"}
                          {c.statusReason
                            ? ` • ${c.statusReason}`
                            : c.note
                              ? ` • ${c.note}`
                              : ""}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: 99,
                            border: "1px solid #E2E8F0",
                            background: "#F8FAFC",
                            color: "#475569",
                            fontWeight: 700,
                          }}
                        >
                          {c.tier}
                        </span>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 99,
                            border: selected ? "none" : "1.5px solid #CBD5E1",
                            background: selected ? "#1E293B" : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selected ? (
                            <span
                              style={{
                                color: "#fff",
                                fontSize: 10,
                                lineHeight: 1,
                              }}
                            >
                              ✓
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectableClients.length > 60 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#94A3B8" }}>
                Хайлтаа нарийсгаарай (анхны 60 үр дүнг харуулж байна).
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Хүргэлтийн огноо *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Gift Items */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Бэлгийн зүйлс (агуулахын үлдэгдлээс) *
              <span
                style={{ marginLeft: 8, fontWeight: 400, color: "#94A3B8" }}
              >
                {selectedCount} ширхэг
              </span>
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={giftSearch}
                onChange={(e) => setGiftSearch(e.target.value)}
                placeholder="Мерч нэрээр хайх..."
                style={{ ...inputStyle, maxWidth: 240, padding: "7px 10px" }}
              />
            </div>
          </div>

          {/* Inventory grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              padding: 12,
            }}
          >
            {filteredInventoryItems.length === 0 ? (
              <div style={{ padding: 10, fontSize: 12, color: "#94A3B8" }}>
                Мерч олдсонгүй.
              </div>
            ) : (
              filteredInventoryItems.map((item) => {
              const itemId = Number(item.id);
              const remaining = Number(item.remainingStock || 0);
              const selectedQty = Number(form.selectedItems?.[itemId] || 0);
              const isOut = remaining <= 0;
              return (
                <div
                  key={item.id}
                  style={{
                    border: selectedQty > 0
                      ? "1.5px solid #1E293B"
                      : isOut
                        ? "1px dashed #CBD5E1"
                        : "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: selectedQty > 0
                      ? "#F1F5F9"
                      : isOut
                        ? "#F8FAFC"
                        : "#fff",
                    opacity: isOut ? 0.6 : 1,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isOut ? "#94A3B8" : "#1E293B",
                          lineHeight: 1.35,
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                        {item.category} • Үлдэгдэл: {remaining}
                        {item.storageLocation ? ` • ${item.storageLocation}` : ""}
                      </div>
                      {isOut && (
                        <div style={{ fontSize: 10, color: "#DC2626", marginTop: 4, fontWeight: 700 }}>
                          Дууссан
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => changeItemQty(itemId, -1)}
                        disabled={selectedQty <= 0}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid #E2E8F0",
                          background: "#fff",
                          cursor: selectedQty <= 0 ? "not-allowed" : "pointer",
                          color: "#475569",
                          fontWeight: 900,
                        }}
                      >
                        −
                      </button>
                      <div
                        style={{
                          minWidth: 26,
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#1E293B",
                        }}
                      >
                        {selectedQty}
                      </div>
                      <button
                        type="button"
                        onClick={() => changeItemQty(itemId, +1)}
                        disabled={isOut || selectedQty >= remaining}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid #E2E8F0",
                          background: "#fff",
                          cursor: isOut || selectedQty >= remaining ? "not-allowed" : "pointer",
                          color: "#1E293B",
                          fontWeight: 900,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>

          {/* Selected summary */}
          {selectedCount > 0 && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#475569",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                padding: "8px 12px",
                lineHeight: 1.6,
              }}
            >
              <strong>Хүргэж буй:</strong>{" "}
              {selectedGiftLabel || "—"}
            </div>
          )}
        </div>

        {/* Delivered by + Note */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={labelStyle}>Хүргэсэн ажилтан</label>
            <input
              value={form.deliveredBy}
              onChange={(e) => set("deliveredBy", e.target.value)}
              placeholder="Нэр"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Тэмдэглэл</label>
            <input
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Нэмэлт тайлбар..."
              style={inputStyle}
            />
          </div>
        </div>

        {/* Loan checkbox */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              color: "#1E293B",
            }}
          >
            <input
              type="checkbox"
              checked={form.loan}
              onChange={(e) => set("loan", e.target.checked)}
              style={{ width: 15, height: 15 }}
            />
            Зээлийн гэрээтэй эсэх
          </label>
        </div>

        <button
          disabled={saving}
          onClick={handleSubmit}
          style={{
            fontSize: 13,
            padding: "10px 22px",
            borderRadius: 8,
            border: "none",
            background: "#1E293B",
            color: "#fff",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Хадгалж байна..." : "Хүргэлт хадгалах ✓"}
        </button>

        {success && (
          <div
            style={{
              marginTop: 14,
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#16A34A",
              fontWeight: 500,
            }}
          >
            ✅ Хүргэлт амжилттай бүртгэгдлээ!
          </div>
        )}
        {error && (
          <div
            style={{
              marginTop: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#B91C1C",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Info note */}
      <div
        style={{
          marginTop: 16,
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          color: "#1D4ED8",
          display: "flex",
          gap: 8,
          alignItems: "center",
          maxWidth: 640,
        }}
      >
        🔒{" "}
        <span>
          Бэлгийн бүртгэл backend дээр хадгалагдана. Одоогийн GOD болон өмнөх
          GOD боловч бэлэг дутуу байгаа үйлчлүүлэгчид нэг л дараалалд үргэлж
          хадгалагдана.
        </span>
      </div>

      {/* Recent log */}
      <div style={{ marginTop: 20, maxWidth: 640 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Сүүлд бүртгэсэн хүргэлтүүд
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {history.length === 0 ? (
            <div style={{ padding: 14, fontSize: 12, color: "#94A3B8" }}>
              Одоогоор бүртгэл алга.
            </div>
          ) : (
            history.slice(0, 5).map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  padding: "12px 14px",
                  borderTop: index === 0 ? "none" : "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1E293B",
                    marginBottom: 4,
                  }}
                >
                  {entry.clientName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    marginBottom: entry.giftType ? 4 : 0,
                  }}
                >
                  {entry.deliveredAt}
                  {entry.deliveredBy ? ` • ${entry.deliveredBy}` : ""}
                </div>
                {entry.giftType && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {String(entry.giftType)
                      .split("•")
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((g, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            color: "#475569",
                          }}
                        >
                          {g}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
