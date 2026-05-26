export const MERCH_CATEGORIES = [
  "PEN",
  "NOTEBOOK",
  "STICKER",
  "STUFFED_TOY",
  "GIFT_SET",
  "OTHER",
];

export function normalizeMarketingMerchItem(item) {
  const totalStock = Number(item.totalStock || 0);
  const issuedStock = Number(item.issuedStock || 0);

  return {
    id: Number(item.id),
    name: item.name || "",
    category: item.category || "OTHER",
    unit: item.unit || "pcs",
    totalStock,
    issuedStock,
    remainingStock: Math.max(totalStock - issuedStock, 0),
    storageLocation: item.storageLocation || "",
    note: item.note || "",
  };
}

export function normalizeMarketingMerchIssue(issue) {
  return {
    id: Number(issue.id),
    itemId: Number(issue.itemId),
    itemName: issue.itemName || "",
    category: issue.category || "OTHER",
    quantity: Number(issue.quantity || 0),
    recipientName: issue.recipientName || "",
    purpose: issue.purpose || "",
    issuedBy: issue.issuedBy || "",
    issuedAt: issue.issuedAt || "",
    note: issue.note || "",
  };
}

export const initialMarketingMerchItems = [
  {
    id: 1,
    name: "VIP pen",
    category: "PEN",
    unit: "pcs",
    totalStock: 120,
    issuedStock: 12,
    storageLocation: "HQ cabinet A1",
    note: "Main pen stock for branch visits and executive meetings.",
  },
  {
    id: 2,
    name: "Premium notebook",
    category: "NOTEBOOK",
    unit: "pcs",
    totalStock: 80,
    issuedStock: 8,
    storageLocation: "HQ cabinet A2",
    note: "Used for VIP welcome kits and event giveaways.",
  },
  {
    id: 3,
    name: "Brand sticker pack",
    category: "STICKER",
    unit: "packs",
    totalStock: 150,
    issuedStock: 20,
    storageLocation: "Marketing shelf B1",
    note: "Mostly sent with event merch bundles.",
  },
  {
    id: 4,
    name: "Stuffed toy mascot",
    category: "STUFFED_TOY",
    unit: "pcs",
    totalStock: 45,
    issuedStock: 6,
    storageLocation: "Showroom display room",
    note: "Reserved for family events and social giveaways.",
  },
  {
    id: 5,
    name: "Executive gift set",
    category: "GIFT_SET",
    unit: "sets",
    totalStock: 30,
    issuedStock: 3,
    storageLocation: "Secure merch vault",
    note: "High-value set for GOD-tier relationship moments.",
  },
].map(normalizeMarketingMerchItem);

export const initialMarketingMerchIssues = [
  {
    id: 1,
    itemId: 1,
    itemName: "VIP pen",
    category: "PEN",
    quantity: 12,
    recipientName: "Branch relationship managers",
    purpose: "VIP branch visit kits",
    issuedBy: "Anu",
    issuedAt: "2026-05-22",
    note: "Prepared for 4 branch meetings.",
  },
  {
    id: 2,
    itemId: 2,
    itemName: "Premium notebook",
    category: "NOTEBOOK",
    quantity: 8,
    recipientName: "Corporate sales team",
    purpose: "Boardroom welcome packs",
    issuedBy: "Munkhjin",
    issuedAt: "2026-05-23",
    note: "",
  },
  {
    id: 3,
    itemId: 3,
    itemName: "Brand sticker pack",
    category: "STICKER",
    quantity: 20,
    recipientName: "Event operations",
    purpose: "Youth campaign roadshow",
    issuedBy: "Tselmeg",
    issuedAt: "2026-05-24",
    note: "Distributed with tote bags.",
  },
  {
    id: 4,
    itemId: 4,
    itemName: "Stuffed toy mascot",
    category: "STUFFED_TOY",
    quantity: 6,
    recipientName: "Family day booth",
    purpose: "Children activity prizes",
    issuedBy: "Saruul",
    issuedAt: "2026-05-24",
    note: "",
  },
  {
    id: 5,
    itemId: 5,
    itemName: "Executive gift set",
    category: "GIFT_SET",
    quantity: 3,
    recipientName: "CEO office",
    purpose: "Partner appreciation handoff",
    issuedBy: "Naraa",
    issuedAt: "2026-05-25",
    note: "Reserved for same-day hand delivery.",
  },
].map(normalizeMarketingMerchIssue);
