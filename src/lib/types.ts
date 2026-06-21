export type ItemType = "defect" | "incomplete" | "client";

export type ItemStatus =
  | "open"
  | "issued"
  | "in_progress"
  | "ready_for_review"
  | "under_inspection"
  | "rejected"
  | "closed"
  | "complete";

/**
 * Priority is intentionally simple: High = standard, Urgent = critical / escalated.
 * Items in progress longer than ESCALATION_DAYS are treated as escalated in
 * reports (see isEscalated()), without mutating the underlying priority.
 */
export type Priority = "high" | "urgent";

export const ESCALATION_DAYS = 10;

export interface Closeout {
  photo?: string;
  signedBy: string;
  role: string;
  note?: string;
  signedAt: string;
}

export interface HistoryEntry {
  at: string;
  action: string;
  by?: string;
  note?: string;
}

export interface Item {
  /** Stable internal id (uuid). */
  id: string;
  /** Human-facing reference, e.g. DEF-001, INC-004, CLD-002. */
  code: string;
  type: ItemType;
  project: string;
  building: string;
  level: string;
  unit: string;
  room: string;
  trade: string;
  subcontractor: string;
  priority: Priority;
  dueDate: string; // ISO yyyy-mm-dd
  description: string;
  photos: string[];
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  /** When item was issued to the subcontractor (drives escalation clock). */
  issuedAt?: string;
  /** When subcontractor acknowledged & moved to in-progress. */
  inProgressAt?: string;
  closeout?: Closeout;
  history: HistoryEntry[];
}

export const TRADES = [
  "Painting",
  "Plastering",
  "Tiling",
  "Waterproofing",
  "Joinery",
  "Doors / Hardware",
  "Windows / Aluminium",
  "Flooring",
  "Roofing",
  "Cladding",
  "Electrical",
  "Hydraulic",
  "Mechanical",
  "Fire Services",
  "Cleaning",
  "Landscaping",
  "Concrete",
  "Render",
  "Caulking / Sealant",
  "General Damage",
];

export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: "Open",
  issued: "Issued",
  in_progress: "In Progress",
  ready_for_review: "Ready for Review",
  under_inspection: "Under Inspection",
  rejected: "Rejected",
  closed: "Closed",
  complete: "Complete",
};

export const TYPE_LABEL: Record<ItemType, string> = {
  defect: "Defect",
  incomplete: "Incomplete Work",
  client: "Client Defect",
};

export const CODE_PREFIX: Record<ItemType, string> = {
  defect: "DEF",
  incomplete: "INC",
  client: "CLD",
};

/** Generate the next sequential code for a given type, e.g. DEF-001. */
export function nextCode(items: Item[], type: ItemType): string {
  const prefix = CODE_PREFIX[type];
  const max = items
    .filter((i) => i.code?.startsWith(`${prefix}-`))
    .map((i) => parseInt(i.code.slice(prefix.length + 1), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/** Days an item has been with the subcontractor (in_progress). 0 if not started. */
export function daysInProgress(item: Item): number {
  if (!item.inProgressAt) return 0;
  if (item.status === "closed" || item.status === "complete") return 0;
  const ms = Date.now() - new Date(item.inProgressAt).getTime();
  return Math.floor(ms / 86400000);
}

/**
 * An item is considered escalated when it has been in progress longer than
 * ESCALATION_DAYS. This is presentational only — it does not mutate priority.
 */
export function isEscalated(item: Item): boolean {
  return item.status === "in_progress" && daysInProgress(item) > ESCALATION_DAYS;
}

/** Recommended next-action label for each status. */
export function nextActionLabel(status: ItemStatus): string {
  switch (status) {
    case "open": return "Issue to subcontractor";
    case "issued": return "Awaiting acknowledgement";
    case "in_progress": return "Mark ready for review";
    case "ready_for_review": return "Start inspection";
    case "under_inspection": return "Close with evidence";
    case "rejected": return "Re-issue";
    case "closed":
    case "complete": return "Closed";
  }
}
