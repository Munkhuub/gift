export const MARKETING_RESOURCE_TYPES = [
  "MERCH",
  "CREATIVE",
  "BUDGET",
  "STAFF",
  "CHANNEL",
];

export const MARKETING_RESOURCE_STATUSES = [
  "REQUESTED",
  "IN_PROGRESS",
  "READY",
  "DEPLOYED",
];

export function normalizeMarketingResource(resource) {
  return {
    id: Number(resource.id),
    name: resource.name || "",
    campaign: resource.campaign || "",
    resourceType: resource.resourceType || "MERCH",
    owner: resource.owner || "",
    status: resource.status || "REQUESTED",
    quantity:
      resource.quantity === null || resource.quantity === undefined
        ? null
        : Number(resource.quantity),
    budget:
      resource.budget === null || resource.budget === undefined
        ? null
        : Number(resource.budget),
    neededBy: resource.neededBy || "",
    vendor: resource.vendor || "",
    note: resource.note || "",
  };
}

export const initialMarketingResources = [
  {
    id: 1,
    name: "VIP executive gift wraps",
    campaign: "GOD Loyalty Week",
    resourceType: "MERCH",
    owner: "Marketing Ops",
    status: "IN_PROGRESS",
    quantity: 40,
    budget: 2800000,
    neededBy: "2026-05-24",
    vendor: "Premier Packaging LLC",
    note: "Final count aligned to GOD-tier client list.",
  },
  {
    id: 2,
    name: "Board-level thank-you cards",
    campaign: "Chairman Outreach",
    resourceType: "CREATIVE",
    owner: "Brand Team",
    status: "READY",
    quantity: 30,
    budget: 450000,
    neededBy: "2026-05-22",
    vendor: "Internal Design Desk",
    note: "Print-ready files approved by leadership.",
  },
  {
    id: 3,
    name: "Courier budget reserve",
    campaign: "VIP Delivery Sprint",
    resourceType: "BUDGET",
    owner: "Finance Partner",
    status: "REQUESTED",
    quantity: null,
    budget: 1600000,
    neededBy: "2026-05-25",
    vendor: "Budget pool",
    note: "Needed for same-day reroutes and after-hours drops.",
  },
  {
    id: 4,
    name: "Relationship manager coverage",
    campaign: "GOD Follow-up",
    resourceType: "STAFF",
    owner: "Sales Director",
    status: "DEPLOYED",
    quantity: 5,
    budget: null,
    neededBy: "2026-05-20",
    vendor: "Internal staffing",
    note: "5 managers assigned to direct follow-up calls.",
  },
  {
    id: 5,
    name: "Premium SMS reminder slot",
    campaign: "VIP Reminder Push",
    resourceType: "CHANNEL",
    owner: "CRM Lead",
    status: "IN_PROGRESS",
    quantity: 1,
    budget: 320000,
    neededBy: "2026-05-23",
    vendor: "SMS Gateway",
    note: "Hold until final delivery-day confirmations are locked.",
  },
].map(normalizeMarketingResource);
