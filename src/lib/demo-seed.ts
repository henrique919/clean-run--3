import type { AuditEvent, CloseoutEvidence, Comment, InspectionEvent, IssueEvent, Item, ItemStatus, ItemType, Priority, RectificationEvidence } from "./types";

type PhotoSpec = [label: string, hue: number];
type RectificationSpec = { label?: string; hue?: number; comment: string; by: string; daysAgo: number };
type CloseoutSpec = { label?: string; hue?: number; by: string; role: string; note: string; confirmation?: string; daysAgo: number };

type SeedInput = {
  id: string;
  code: string;
  type: ItemType;
  status: ItemStatus;
  project: string;
  building: string;
  level: string;
  unit: string;
  room: string;
  trade: string;
  subcontractor: string;
  priority: Priority;
  dueDays: number;
  description: string;
  createdDaysAgo: number;
  photos?: PhotoSpec[];
  raisedBy?: string;
  issuedDaysAgo?: number;
  inProgressDaysAgo?: number;
  readyDaysAgo?: number;
  inspectionStartedDaysAgo?: number;
  rejectedDaysAgo?: number;
  acceptedDaysAgo?: number;
  closedDaysAgo?: number;
  rejectionReason?: string;
  rectification?: RectificationSpec[];
  closeout?: CloseoutSpec[];
  comments?: Array<{ text: string; by: string; daysAgo: number }>;
};

export function buildDemoSeedItems(): Item[] {
  return [
    makeSeed({ id: "demo-def-open-jura", code: "DEF-001", type: "defect", status: "open", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-304", room: "Ensuite", trade: "Tiling", subcontractor: "Sterling Tiling", priority: "high", dueDays: 5, createdDaysAgo: 3, description: "Hairline crack to ensuite floor tile at vanity kickboard. Replace before final clean.", photos: [["Cracked Tile", 12]] }),
    makeSeed({ id: "demo-def-issued-jura", code: "DEF-002", type: "defect", status: "issued", project: "Jura Noosa", building: "Block B", level: "L01", unit: "B-112", room: "Bathroom", trade: "Waterproofing", subcontractor: "AquaSeal Waterproofing", priority: "urgent", dueDays: 2, createdDaysAgo: 5, issuedDaysAgo: 4, description: "Shower hob corner sealant incomplete. Rectify and provide photo evidence.", photos: [["Sealant Gap", 205]], comments: [{ text: "Raised during wet area pre-handover walk.", by: "Site Manager", daysAgo: 5 }] }),
    makeSeed({ id: "demo-def-progress-meta", code: "DEF-003", type: "defect", status: "in_progress", project: "Meta Street", building: "Tower 1", level: "L08", unit: "T1-803", room: "Kitchen", trade: "Tiling", subcontractor: "Sterling Tiling", priority: "high", dueDays: -1, createdDaysAgo: 9, issuedDaysAgo: 8, inProgressDaysAgo: 6, description: "Kitchen splashback tile lippage visible under rangehood light.", photos: [["Tile Lippage", 28]] }),
    makeSeed({ id: "demo-def-ready-jura", code: "DEF-004", type: "defect", status: "ready_for_review", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-305", room: "Kitchen", trade: "Tiling", subcontractor: "Sterling Tiling", priority: "high", dueDays: 1, createdDaysAgo: 11, issuedDaysAgo: 10, inProgressDaysAgo: 9, readyDaysAgo: 1, description: "Kitchen splashback grout pinholes above cooktop.", photos: [["Grout Pinholes", 48]], rectification: [{ label: "Grout Repaired", hue: 118, comment: "Pinholes filled, grout washed down and area ready for inspection.", by: "Sterling Tiling", daysAgo: 1 }] }),
    makeSeed({ id: "demo-def-under-meta", code: "DEF-005", type: "defect", status: "under_inspection", project: "Meta Street", building: "Tower 1", level: "L08", unit: "T1-803", room: "Balcony", trade: "Windows / Aluminium", subcontractor: "Skyline Glazing", priority: "high", dueDays: 0, createdDaysAgo: 12, issuedDaysAgo: 11, inProgressDaysAgo: 10, readyDaysAgo: 2, inspectionStartedDaysAgo: 0, description: "Balcony sliding door track scratched. Replace visible trim section.", photos: [["Track Scratch", 222]], rectification: [{ label: "Trim Replaced", hue: 160, comment: "Damaged track trim replaced and door tested.", by: "Skyline Glazing", daysAgo: 2 }] }),
    makeSeed({ id: "demo-def-rejected-jura", code: "DEF-006", type: "defect", status: "rejected", project: "Jura Noosa", building: "Block B", level: "L02", unit: "B-204", room: "Bedroom 2", trade: "Tiling", subcontractor: "Sterling Tiling", priority: "urgent", dueDays: -2, createdDaysAgo: 15, issuedDaysAgo: 14, inProgressDaysAgo: 13, readyDaysAgo: 4, inspectionStartedDaysAgo: 3, rejectedDaysAgo: 2, rejectionReason: "Tile replacement still sounds hollow at front edge. Re-lift and re-bed before re-issue.", description: "Hollow floor tile near robe entry. Replace tile and confirm bedding is sound.", photos: [["Hollow Tile", 6]], rectification: [{ label: "Tile Replaced", hue: 92, comment: "Tile lifted and replaced. Ready for inspection.", by: "Sterling Tiling", daysAgo: 4 }] }),
    makeSeed({ id: "demo-def-closed-jura", code: "DEF-007", type: "defect", status: "closed", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-304", room: "Ensuite", trade: "Tiling", subcontractor: "Sterling Tiling", priority: "high", dueDays: -5, createdDaysAgo: 18, issuedDaysAgo: 17, inProgressDaysAgo: 15, readyDaysAgo: 6, inspectionStartedDaysAgo: 5, acceptedDaysAgo: 5, closedDaysAgo: 4, description: "Ensuite niche tile chip to bottom arris. Replace tile and re-grout niche return.", photos: [["Tile Chip", 18]], rectification: [{ label: "Tile Rectified", hue: 126, comment: "Chipped tile replaced, grout blended and area cleaned.", by: "Sterling Tiling", daysAgo: 6 }], closeout: [{ label: "Closeout OK", hue: 142, by: "Site Manager", role: "Site Manager", note: "Replacement tile inspected and ready for handover.", confirmation: "I confirm this item has been inspected and is acceptable for closeout.", daysAgo: 4 }] }),
    makeSeed({ id: "demo-inc-open-jura", code: "INC-001", type: "incomplete", status: "open", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-305", room: "Kitchen", trade: "Joinery", subcontractor: "TrueLine Joinery", priority: "high", dueDays: 4, createdDaysAgo: 2, description: "Pantry door and handle set not yet installed. Hardware is on site.", photos: [["Pantry Door", 35]] }),
    makeSeed({ id: "demo-inc-complete-meta", code: "INC-002", type: "incomplete", status: "complete", project: "Meta Street", building: "Tower 1", level: "L05", unit: "T1-502", room: "Hallway", trade: "Flooring", subcontractor: "Premier Flooring", priority: "high", dueDays: -3, createdDaysAgo: 10, issuedDaysAgo: 9, inProgressDaysAgo: 8, readyDaysAgo: 3, inspectionStartedDaysAgo: 2, acceptedDaysAgo: 2, closedDaysAgo: 1, description: "Hallway transition trim missing at bedroom threshold. Install trim and clean adhesive residue.", closeout: [{ by: "Site Manager", role: "Site Manager", note: "Completed without photo evidence.", confirmation: "I confirm this item has been inspected and is acceptable for closeout.", daysAgo: 1 }] }),
    makeSeed({ id: "demo-client-ready-meta", code: "CLD-001", type: "client", status: "ready_for_review", project: "Meta Street", building: "Tower 1", level: "L10", unit: "T1-1004", room: "Ensuite", trade: "Cleaning", subcontractor: "Endeavour Cleaning", priority: "high", dueDays: 1, createdDaysAgo: 7, issuedDaysAgo: 6, inProgressDaysAgo: 5, readyDaysAgo: 1, raisedBy: "Superintendent", description: "Client walk noted grout haze to shower wall tiles. Re-clean tile faces and polish fittings.", photos: [["Grout Haze", 190]], rectification: [{ label: "Cleaned Ensuite", hue: 180, comment: "Tiles cleaned, fittings polished and screen wiped down.", by: "Endeavour Cleaning", daysAgo: 1 }] }),
    makeSeed({ id: "demo-def-issued-sterling-meta", code: "DEF-008", type: "defect", status: "issued", project: "Meta Street", building: "Tower 1", level: "L08", unit: "T1-803", room: "Kitchen", trade: "Tiling", subcontractor: "Sterling Tiling", priority: "high", dueDays: 3, createdDaysAgo: 4, issuedDaysAgo: 3, description: "Skirting tile grout line incomplete behind fridge recess.", photos: [["Grout Line", 44]] }),
    makeSeed({ id: "demo-def-closed-meta", code: "DEF-009", type: "defect", status: "closed", project: "Meta Street", building: "Tower 1", level: "L10", unit: "T1-1004", room: "Ensuite", trade: "Hydraulic", subcontractor: "Pacific Plumbing", priority: "high", dueDays: -4, createdDaysAgo: 16, issuedDaysAgo: 15, inProgressDaysAgo: 13, readyDaysAgo: 7, inspectionStartedDaysAgo: 6, acceptedDaysAgo: 6, closedDaysAgo: 5, description: "Vanity basin waste loose under trap. Tighten fittings and water test.", photos: [["Loose Waste", 210]], rectification: [{ label: "Waste Tested", hue: 150, comment: "Trap tightened and basin drained twice with no leak observed.", by: "Pacific Plumbing", daysAgo: 7 }], closeout: [{ label: "Water Test OK", hue: 170, by: "Site Manager", role: "Site Manager", note: "Water test witnessed. Cabinet base dry.", confirmation: "I confirm this item has been inspected and is acceptable for closeout.", daysAgo: 5 }] }),
  ];
}

function makeSeed(input: SeedInput): Item {
  const createdAt = atDaysAgo(input.createdDaysAgo, 8);
  const issuedAt = input.issuedDaysAgo !== undefined ? atDaysAgo(input.issuedDaysAgo, 9) : undefined;
  const inProgressAt = input.inProgressDaysAgo !== undefined ? atDaysAgo(input.inProgressDaysAgo, 10) : undefined;
  const readyForReviewAt = input.readyDaysAgo !== undefined ? atDaysAgo(input.readyDaysAgo, 15) : undefined;
  const underInspectionAt = input.inspectionStartedDaysAgo !== undefined ? atDaysAgo(input.inspectionStartedDaysAgo, 10) : undefined;
  const closedAt = input.closedDaysAgo !== undefined ? atDaysAgo(input.closedDaysAgo, 16) : undefined;
  const originalPhotos = (input.photos ?? []).map(([label, hue]) => photo(label, hue));
  const issueHistory: IssueEvent[] = issuedAt ? [{ at: issuedAt, to: input.subcontractor, by: "Site Manager", note: "Issued from demo seed data.", reissue: false }] : [];
  const rectificationEvidence: RectificationEvidence[] = (input.rectification ?? []).map((ev, index) => ({ id: `${input.id}-rect-${index + 1}`, photo: ev.label ? photo(ev.label, ev.hue ?? 110) : undefined, comment: ev.comment, by: ev.by, at: atDaysAgo(ev.daysAgo, 14) }));
  const closeoutEvidence: CloseoutEvidence[] = (input.closeout ?? []).map((ev, index) => ({ id: `${input.id}-close-${index + 1}`, photo: ev.label ? photo(ev.label, ev.hue ?? 140) : undefined, by: ev.by, role: ev.role, note: ev.note, confirmation: ev.confirmation, at: atDaysAgo(ev.daysAgo, 16) }));
  const inspectionHistory: InspectionEvent[] = [];
  if (underInspectionAt) inspectionHistory.push({ at: underInspectionAt, by: "Site Manager", action: "started" });
  if (input.rejectedDaysAgo !== undefined) inspectionHistory.push({ at: atDaysAgo(input.rejectedDaysAgo, 11), by: "Site Manager", action: "rejected", reason: input.rejectionReason });
  if (input.acceptedDaysAgo !== undefined) inspectionHistory.push({ at: atDaysAgo(input.acceptedDaysAgo, 13), by: "Site Manager", action: "accepted" });
  const comments: Comment[] = (input.comments ?? []).map((c, index) => ({ id: `${input.id}-comment-${index + 1}`, text: c.text, by: c.by, at: atDaysAgo(c.daysAgo, 12) }));
  const auditEvents = auditFor(input, { createdAt, issuedAt, inProgressAt, readyForReviewAt, underInspectionAt, closedAt, rectificationEvidence });
  const item: Item = {
    id: input.id,
    code: input.code,
    type: input.type,
    project: input.project,
    building: input.building,
    level: input.level,
    unit: input.unit,
    room: input.room,
    trade: input.trade,
    subcontractor: input.subcontractor,
    priority: input.priority,
    dueDate: addDays(input.dueDays),
    description: input.description,
    status: input.status,
    createdAt,
    updatedAt: auditEvents[auditEvents.length - 1]?.at ?? createdAt,
    createdBy: "Site Manager",
    originalPhotos,
    rectificationEvidence,
    closeoutEvidence,
    comments,
    issueHistory,
    inspectionHistory,
    auditEvents,
    raisedBy: input.raisedBy,
    issuedAt,
    inProgressAt,
    readyForReviewAt,
    underInspectionAt,
    closedAt,
    rejectionReason: input.rejectionReason,
    photos: originalPhotos,
    closeout: closeoutEvidence[0] ? { photo: closeoutEvidence[0].photo, signedBy: closeoutEvidence[0].by, role: closeoutEvidence[0].role, note: closeoutEvidence[0].note, signedAt: closeoutEvidence[0].at } : undefined,
    history: auditEvents,
  };
  return item;
}

function auditFor(input: SeedInput, dates: { createdAt: string; issuedAt?: string; inProgressAt?: string; readyForReviewAt?: string; underInspectionAt?: string; closedAt?: string; rectificationEvidence: RectificationEvidence[] }): AuditEvent[] {
  const events: AuditEvent[] = [{ at: dates.createdAt, action: `Created (${input.code})`, by: "Site Manager" }];
  if (dates.issuedAt) events.push({ at: dates.issuedAt, action: `Issued to ${input.subcontractor}`, by: "Site Manager", note: "Issued from demo seed data." });
  if (dates.inProgressAt) events.push({ at: dates.inProgressAt, action: "Marked in progress", by: input.subcontractor });
  dates.rectificationEvidence.forEach((ev) => events.push({ at: ev.at, action: "Rectification evidence added", by: ev.by, note: ev.comment }));
  if (dates.readyForReviewAt) events.push({ at: dates.readyForReviewAt, action: "Marked ready for review", by: input.subcontractor });
  if (dates.underInspectionAt) events.push({ at: dates.underInspectionAt, action: "Inspection started", by: "Site Manager" });
  if (input.rejectedDaysAgo !== undefined) events.push({ at: atDaysAgo(input.rejectedDaysAgo, 11), action: "Rejected on inspection", by: "Site Manager", note: input.rejectionReason });
  if (input.acceptedDaysAgo !== undefined) events.push({ at: atDaysAgo(input.acceptedDaysAgo, 13), action: "Inspection accepted", by: "Site Manager" });
  if (dates.closedAt) events.push({ at: dates.closedAt, action: "Closed with evidence", by: input.closeout?.[0]?.by ?? "Site Manager", note: input.closeout?.[0]?.note });
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

function addDays(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function atDaysAgo(days: number, hour = 9) { const date = new Date(); date.setDate(date.getDate() - days); date.setHours(hour, 0, 0, 0); return date.toISOString(); }
function photo(label: string, hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180'><rect width='240' height='180' fill='hsl(${hue},35%,84%)'/><rect x='14' y='14' width='212' height='152' rx='12' fill='rgba(255,255,255,.46)' stroke='rgba(15,23,42,.18)'/><text x='120' y='94' text-anchor='middle' font-family='Inter,system-ui,sans-serif' font-weight='700' font-size='20' fill='hsl(${hue},40%,28%)'>${label}</text><text x='120' y='118' text-anchor='middle' font-family='Inter,system-ui,sans-serif' font-size='11' fill='hsl(${hue},35%,38%)'>Demo evidence photo</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
