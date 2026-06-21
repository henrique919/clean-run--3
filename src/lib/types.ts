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

export type Priority = "low" | "medium" | "high" | "urgent";

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
  id: string;
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
  photos: string[]; // data URLs (TODO: object storage in production)
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
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

/** Recommended next-action label for each status. */
export function nextActionLabel(status: ItemStatus): string {
  switch (status) {
    case "open": return "Issue to subcontractor";
    case "issued": return "Mark in progress";
    case "in_progress": return "Mark ready for review";
    case "ready_for_review": return "Start inspection";
    case "under_inspection": return "Close with evidence";
    case "rejected": return "Re-issue";
    case "closed":
    case "complete": return "Closed";
  }
}
