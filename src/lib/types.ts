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
  "Carpentry",
  "Painting",
  "Plumbing",
  "Electrical",
  "Tiling",
  "Plastering",
  "HVAC",
  "Glazing",
  "Flooring",
  "Cleaning",
  "Joinery",
  "Other",
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
