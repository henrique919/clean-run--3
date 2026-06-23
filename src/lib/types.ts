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

export type Priority = "high" | "urgent";

export const ESCALATION_DAYS = 10;

export const RAISED_BY_OPTIONS = [
  "Client PM",
  "Superintendent",
  "Consultant",
  "Architect",
  "Buyer",
  "Other",
] as const;

/** Subcontractor-supplied evidence of rectification. */
export interface RectificationEvidence {
  id: string;
  photo?: string;
  comment?: string;
  by: string;
  at: string;
}

/** Site-team closeout evidence. Multiple entries supported. */
export interface CloseoutEvidence {
  id: string;
  photo: string;
  by: string;
  role: string;
  note?: string;
  confirmation?: string;
  at: string;
}

export interface Comment {
  id: string;
  text: string;
  by: string;
  at: string;
}

export interface IssueEvent {
  at: string;
  by?: string;
  to: string;
  note?: string;
  reissue?: boolean;
}

export interface InspectionEvent {
  at: string;
  by: string;
  action: "started" | "accepted" | "rejected";
  reason?: string;
}

export interface AuditEvent {
  at: string;
  action: string;
  by?: string;
  note?: string;
}

/** Legacy single-closeout shape, kept for migration + report fallback. */
export interface Closeout {
  photo?: string;
  signedBy: string;
  role: string;
  note?: string;
  signedAt: string;
}

/** Legacy alias kept for any code still reading item.history. */
export type HistoryEntry = AuditEvent;

export interface Item {
  id: string;
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
  dueDate: string;
  description: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  /** Photos taken by the site team when first raising the item. */
  originalPhotos: string[];
  /** Photos/notes uploaded by the subcontractor as evidence of rectification. */
  rectificationEvidence: RectificationEvidence[];
  /** Photos & sign-off entered by site team when closing. */
  closeoutEvidence: CloseoutEvidence[];
  comments: Comment[];
  issueHistory: IssueEvent[];
  inspectionHistory: InspectionEvent[];
  auditEvents: AuditEvent[];

  /** Client Defects: who raised the issue. */
  raisedBy?: string;

  issuedAt?: string;
  inProgressAt?: string;
  readyForReviewAt?: string;
  underInspectionAt?: string;
  closedAt?: string;
  rejectionReason?: string;

  /** @deprecated kept in sync with originalPhotos for any older readers. */
  photos: string[];
  /** @deprecated kept in sync with closeoutEvidence[0] for legacy readers. */
  closeout?: Closeout;
  /** @deprecated kept in sync with auditEvents. */
  history: AuditEvent[];
}

/** Per-subcontractor profile stored under Settings. */
export interface SubProfile {
  name: string;
  trade?: string;
  contact?: string;
  email?: string;
  phone?: string;
  projects?: string[];
}

/** Per-project setup defaults. */
export interface ProjectConfig {
  name: string;
  address?: string;
  buildings: string[];
  levels: string[];
  units: string[];
  rooms: string[];
  defaultDueDays: number;
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

export function nextCode(items: Item[], type: ItemType): string {
  const prefix = CODE_PREFIX[type];
  const max = items
    .filter((i) => i.code?.startsWith(`${prefix}-`))
    .map((i) => parseInt(i.code.slice(prefix.length + 1), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function daysInProgress(item: Item): number {
  if (!item.inProgressAt) return 0;
  if (item.status === "closed" || item.status === "complete") return 0;
  const ms = Date.now() - new Date(item.inProgressAt).getTime();
  return Math.floor(ms / 86400000);
}

export function isEscalated(item: Item): boolean {
  return item.status === "in_progress" && daysInProgress(item) > ESCALATION_DAYS;
}

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

export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
