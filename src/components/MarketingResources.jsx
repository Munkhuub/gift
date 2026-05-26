import { useEffect, useMemo, useState } from "react";
import { MERCH_CATEGORIES } from "../data/marketingResources.js";

const categoryLabels = {
  PEN: "Үзэг",
  NOTEBOOK: "Дэвтэр",
  STICKER: "Наалт",
  STUFFED_TOY: "Чихмэл тоглоом",
  GIFT_SET: "Бэлгийн багц",
  OTHER: "Бусад",
};

export default function MarketingResources({
  initialResources,
  initialIssues,
  onCreate,
  onFilterIssues,
  onIssue,
  onUpdate,
}) {
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [issueDateFilter, setIssueDateFilter] = useState("");
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "PEN",
    totalStock: "",
    unit: "pcs",
    storageLocation: "",
    note: "",
  });
  const [issueForm, setIssueForm] = useState({
    itemId: "",
    quantity: "",
    recipientName: "",
    purpose: "",
    issuedBy: "",
    issuedAt: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [itemError, setItemError] = useState("");
  const [itemSuccess, setItemSuccess] = useState("");
  const [issueError, setIssueError] = useState("");
  const [issueSuccess, setIssueSuccess] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);

  useEffect(() => {
    if (!onFilterIssues) {
      return undefined;
    }

    let active = true;

    const loadIssues = async () => {
      try {
        await onFilterIssues(issueDateFilter ? { date: issueDateFilter } : {});
      } catch {
        if (!active) {
          return;
        }
      }
    };

    loadIssues();

    return () => {
      active = false;
    };
  }, [issueDateFilter, onFilterIssues]);

  const filteredInventory = useMemo(() => {
    const search = inventoryFilter.trim().toLowerCase();

    return initialResources.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.storageLocation.toLowerCase().includes(search) ||
        item.note.toLowerCase().includes(search);
      const matchesCategory =
        categoryFilter === "ALL" || item.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, initialResources, inventoryFilter]);

  const filteredIssues = useMemo(() => initialIssues, [initialIssues]);

  const summary = useMemo(() => {
    return initialResources.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.totalStock += item.totalStock;
        acc.totalIssued += item.issuedStock;
        acc.totalRemaining += item.remainingStock;
        if (item.remainingStock <= 10) {
          acc.lowStock += 1;
        }
        return acc;
      },
      {
        totalItems: 0,
        totalStock: 0,
        totalIssued: 0,
        totalRemaining: 0,
        lowStock: 0,
      },
    );
  }, [initialResources]);

  const pendingIssueItem = initialResources.find(
    (item) => item.id === Number(issueForm.itemId),
  );

  const setItemField = (key, value) => {
    setItemForm((current) => ({ ...current, [key]: value }));
  };

  const setIssueField = (key, value) => {
    setIssueForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateItem = async () => {
    setSavingItem(true);
    setItemError("");
    setItemSuccess("");

    const created = await onCreate({
      ...itemForm,
      totalStock: Number(itemForm.totalStock || 0),
    });

    setSavingItem(false);

    if (!created) {
      setItemError("Мерчийн мэдээллийг хадгалж чадсангүй.");
      return;
    }

    setItemForm({
      name: "",
      category: "PEN",
      totalStock: "",
      unit: "pcs",
      storageLocation: "",
      note: "",
    });
    setItemSuccess("Мерч агуулахад нэмэгдлээ.");
  };

  const handleIssueItem = async () => {
    setSavingIssue(true);
    setIssueError("");
    setIssueSuccess("");

    const result = await onIssue({
      ...issueForm,
      itemId: Number(issueForm.itemId),
      quantity: Number(issueForm.quantity || 0),
    });

    setSavingIssue(false);

    if (!result) {
      setIssueError("Мерч гаргалтыг бүртгэж чадсангүй.");
      return;
    }

    setIssueForm({
      itemId: "",
      quantity: "",
      recipientName: "",
      purpose: "",
      issuedBy: "",
      issuedAt: new Date().toISOString().split("T")[0],
      note: "",
    });
    setIssueSuccess("Мерч гаргалт бүртгэгдлээ.");
  };

  const handleRestock = async (item) => {
    const amountText = window.prompt(
      `${item.name} дээр нэмэлт орлого бүртгэх. Хэдэн ${item.unit} нэмэгдэх вэ?`,
      "10",
    );

    if (!amountText) {
      return;
    }

    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    await onUpdate(item.id, {
      totalStock: item.totalStock + amount,
    });
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
        Маркетингийн мерч хяналт: үзэг, дэвтэр, наалт, чихмэл тоглоом, бэлгийн
        багц зэрэг бэлэглэлийн зүйлсийн үлдэгдэл, гаргалт, хэнд/юунд зориулж
        гаргасныг хянах зориулалттай.
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
          { label: "Мерч төрөл", value: summary.totalItems, color: "#1E293B" },
          { label: "Нийт үлдэгдэл", value: summary.totalStock, color: "#1D4ED8" },
          { label: "Гарсан", value: summary.totalIssued, color: "#D97706" },
          {
            label: "Одоогийн үлдэгдэл",
            value: summary.totalRemaining,
            color: "#15803D",
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
          gridTemplateColumns: "minmax(320px, 0.9fr) minmax(320px, 1fr)",
          gap: 18,
          marginBottom: 20,
          alignItems: "start",
        }}
      >
        <div style={panelStyle}>
          <div style={panelTitleStyle}>Мерч нэмэх</div>

          <div style={twoColumnStyle}>
            <input
              value={itemForm.name}
              onChange={(event) => setItemField("name", event.target.value)}
              placeholder="Item name"
              style={inputStyle}
            />
            <select
              value={itemForm.category}
              onChange={(event) => setItemField("category", event.target.value)}
              style={inputStyle}
            >
              {MERCH_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </div>

          <div style={threeColumnStyle}>
            <input
              type="number"
              min="0"
              value={itemForm.totalStock}
              onChange={(event) => setItemField("totalStock", event.target.value)}
              placeholder="Эхний үлдэгдэл"
              style={inputStyle}
            />
            <input
              value={itemForm.unit}
              onChange={(event) => setItemField("unit", event.target.value)}
              placeholder="Хэмжих нэгж"
              style={inputStyle}
            />
            <input
              value={itemForm.storageLocation}
              onChange={(event) =>
                setItemField("storageLocation", event.target.value)
              }
              placeholder="Байршил (агуулах/шүүгээ)"
              style={inputStyle}
            />
          </div>

          <textarea
            value={itemForm.note}
            onChange={(event) => setItemField("note", event.target.value)}
            placeholder="Тэмдэглэл (заавал биш)"
            style={{ ...inputStyle, minHeight: 84, resize: "vertical" }}
          />

          <button
            disabled={savingItem}
            onClick={handleCreateItem}
            style={primaryButtonStyle}
          >
            {savingItem ? "Хадгалж байна..." : "Хадгалах"}
          </button>

          {itemError && <div style={errorStyle}>{itemError}</div>}
          {itemSuccess && <div style={successStyle}>{itemSuccess}</div>}
        </div>

        <div style={panelStyle}>
          <div style={panelTitleStyle}>Мерч гаргалт бүртгэх</div>

          <div style={twoColumnStyle}>
            <select
              value={issueForm.itemId}
              onChange={(event) => setIssueField("itemId", event.target.value)}
              style={inputStyle}
            >
              <option value="">Select merch item...</option>
              {initialResources
                .filter((item) => item.remainingStock > 0)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.remainingStock} {item.unit} left)
                  </option>
                ))}
            </select>
            <input
              type="number"
              min="1"
              value={issueForm.quantity}
              onChange={(event) => setIssueField("quantity", event.target.value)}
              placeholder="Гаргах тоо"
              style={inputStyle}
            />
          </div>

          <div style={twoColumnStyle}>
            <input
              value={issueForm.recipientName}
              onChange={(event) =>
                setIssueField("recipientName", event.target.value)
              }
              placeholder="Хэнд өгсөн"
              style={inputStyle}
            />
            <input
              value={issueForm.purpose}
              onChange={(event) => setIssueField("purpose", event.target.value)}
              placeholder="Зориулалт"
              style={inputStyle}
            />
          </div>

          <div style={twoColumnStyle}>
            <input
              value={issueForm.issuedBy}
              onChange={(event) => setIssueField("issuedBy", event.target.value)}
              placeholder="Гаргасан хүн"
              style={inputStyle}
            />
            <input
              type="date"
              value={issueForm.issuedAt}
              onChange={(event) => setIssueField("issuedAt", event.target.value)}
              style={inputStyle}
            />
          </div>

          <textarea
            value={issueForm.note}
            onChange={(event) => setIssueField("note", event.target.value)}
            placeholder="Тэмдэглэл (заавал биш)"
            style={{ ...inputStyle, minHeight: 84, resize: "vertical" }}
          />

          {pendingIssueItem && (
            <div
              style={{
                marginTop: 12,
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12,
                color: "#1D4ED8",
              }}
            >
              Гаргалтаас өмнөх үлдэгдэл:{" "}
              <strong>
                {pendingIssueItem.remainingStock} {pendingIssueItem.unit}
              </strong>
            </div>
          )}

          <button
            disabled={savingIssue}
            onClick={handleIssueItem}
            style={primaryButtonStyle}
          >
            {savingIssue ? "Хадгалж байна..." : "Гаргалт бүртгэх"}
          </button>

          {issueError && <div style={errorStyle}>{issueError}</div>}
          {issueSuccess && <div style={successStyle}>{issueSuccess}</div>}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          gap: 18,
        }}
      >
        <div style={panelStyle}>
          <div style={panelHeaderRowStyle}>
            <div style={panelTitleStyle}>Мерч үлдэгдэл</div>
            <span style={{ fontSize: 12, color: "#64748B" }}>
              {summary.lowStock} дуусах дөхсөн төрөл
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <input
              value={inventoryFilter}
              onChange={(event) => setInventoryFilter(event.target.value)}
              placeholder="Search merch or location..."
              style={{ ...inputStyle, flex: 1, minWidth: 220 }}
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={{ ...inputStyle, width: 180 }}
            >
              <option value="ALL">Бүх төрөл</option>
              {MERCH_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRowStyle}>
                  {["Нэр", "Төрөл", "Нийт", "Гарсан", "Үлдсэн", "Үйлдэл"].map(
                    (header) => (
                      <th key={header} style={tableHeadCellStyle}>
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} style={tableBodyRowStyle}>
                    <td style={tableCellStyle}>
                      <div style={{ fontWeight: 600, color: "#1E293B" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>
                        {item.storageLocation || "No location"}
                        {item.storageLocation || "Байршилгүй"}
                      </div>
                    </td>
                    <td style={tableCellStyle}>{categoryLabels[item.category]}</td>
                    <td style={tableCellStyle}>
                      {item.totalStock} {item.unit}
                    </td>
                    <td style={tableCellStyle}>
                      {item.issuedStock} {item.unit}
                    </td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          color: item.remainingStock <= 10 ? "#DC2626" : "#15803D",
                          fontWeight: 600,
                        }}
                      >
                        {item.remainingStock} {item.unit}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => handleRestock(item)}
                        style={secondaryButtonStyle}
                      >
                        Нэмэлт орлого
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderRowStyle}>
            <div style={panelTitleStyle}>Recent merch out history</div>
            <input
              type="date"
              value={issueDateFilter}
              onChange={(event) => setIssueDateFilter(event.target.value)}
              style={{ ...inputStyle, width: 150 }}
            />
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {filteredIssues.length === 0 ? (
              <div style={{ padding: 18, fontSize: 13, color: "#94A3B8" }}>
                No merch issue history matched that day.
                Сонгосон өдрөөр мерч гаргалтын түүх олдсонгүй.
              </div>
            ) : (
              filteredIssues.map((issue, index) => (
                <div
                  key={issue.id}
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
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#1E293B" }}>
                      {issue.itemName}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      {issue.issuedAt}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
                    {issue.quantity} {issue.quantity === 1 ? "item" : "items"} went to{" "}
                    <strong>{issue.recipientName}</strong>
                    <br />
                    Зориулалт: {issue.purpose}
                    {issue.issuedBy ? (
                      <>
                        <br />
                        Гаргасан хүн: {issue.issuedBy}
                      </>
                    ) : null}
                    {issue.note ? (
                      <>
                        <br />
                        Тэмдэглэл: {issue.note}
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 20,
};

const panelTitleStyle = {
  fontSize: 15,
  fontWeight: 600,
  color: "#1E293B",
  marginBottom: 16,
};

const panelHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  marginBottom: 14,
};

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

const twoColumnStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 12,
};

const threeColumnStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 12,
  marginBottom: 12,
};

const primaryButtonStyle = {
  marginTop: 12,
  fontSize: 13,
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: "#1E293B",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButtonStyle = {
  fontSize: 12,
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  background: "#fff",
  color: "#475569",
  cursor: "pointer",
  fontWeight: 500,
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

const tableWrapStyle = {
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  overflow: "hidden",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const tableHeadRowStyle = {
  borderBottom: "2px solid #E2E8F0",
};

const tableHeadCellStyle = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 11,
  color: "#64748B",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 600,
};

const tableBodyRowStyle = {
  borderBottom: "1px solid #F1F5F9",
};

const tableCellStyle = {
  padding: "12px 10px",
  verticalAlign: "top",
};
