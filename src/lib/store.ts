// TODO[production]: replace localStorage with proper database + object storage for photos.
// TODO[production]: enforce roles server-side. Current role gating is UI-only.
// TODO[production]: immutable audit trail (append-only, signed).
// TODO[production]: secure subcontractor invite tokens for scoped access.
import { useSyncExternalStore } from "react";
import type {
  AuditEvent,
  CloseoutEvidence,
  Comment,
  IssueEvent,
  InspectionEvent,
  Item,
  ItemStatus,
  ItemType,
  Priority,
  ProjectConfig,
  RectificationEvidence,
  SubProfile,
} from "./types";
import { CODE_PREFIX, makeId, nextCode } from "./types";

const KEY = "cleanrun-iq:items:v5";
const LEGACY_ITEM_KEYS = ["cleanrun-iq:items:v4", "cleanrun-iq:items:v3"];
const SETTINGS_KEY = "cleanrun-iq:settings:v5";
const LEGACY_SETTINGS_KEYS = ["cleanrun-iq:settings:v4", "cleanrun-iq:settings:v3"];

export interface Settings {
  projects: string[];
  projectConfigs: Record<string, ProjectConfig>;
  subcontractors: string[];
  subProfiles: Record<string, SubProfile>;
  activeProject: string;
  company?: string;
  preparedBy?: string;
}

const DEFAULT_PROJECT_CONFIG = (name: string): ProjectConfig => ({
  name,
  address: "",
  buildings: ["Block A", "Block B"],
  levels: ["L01", "L02", "L03"],
  units: [],
  rooms: ["Kitchen", "Living", "Bathroom", "Ensuite", "Bedroom 1", "Bedroom 2", "Laundry", "Balcony", "Hallway", "Garage"],
  defaultDueDays: 7,
});

const DEFAULT_SUBS = [
  "Coastline Painting",
  "Apex Plastering",
  "Sterling Tiling",
  "AquaSeal Waterproofing",
  "TrueLine Joinery",
  "Northline Electrical",
  "Pacific Plumbing",
  "Skyline Glazing",
  "Premier Flooring",
  "Endeavour Cleaning",
];

const DEFAULT_SUB_PROFILES: Record<string, SubProfile> = Object.fromEntries(
  DEFAULT_SUBS.map((n) => [
    n,
    {
      name: n,
      trade: tradeGuess(n),
      contact: "",
      email: `${n.toLowerCase().replace(/[^a-z]+/g, "")}@example.com`,
      phone: "",
    } satisfies SubProfile,
  ]),
);

function tradeGuess(name: string): string | undefined {
  const m = name.toLowerCase();
  if (m.includes("paint")) return "Painting";
  if (m.includes("plaster")) return "Plastering";
  if (m.includes("til")) return "Tiling";
  if (m.includes("water") || m.includes("seal")) return "Waterproofing";
  if (m.includes("joinery")) return "Joinery";
  if (m.includes("electric")) return "Electrical";
  if (m.includes("plumb") || m.includes("hydra")) return "Hydraulic";
  if (m.includes("glaz") || m.includes("window")) return "Windows / Aluminium";
  if (m.includes("floor")) return "Flooring";
  if (m.includes("clean")) return "Cleaning";
  return undefined;
}

const DEFAULT_SETTINGS: Settings = {
  projects: ["Jura Noosa", "Meta Street"],
  projectConfigs: {
    "Jura Noosa": { ...DEFAULT_PROJECT_CONFIG("Jura Noosa"), address: "12 Hastings St, Noosa Heads", buildings: ["Block A", "Block B"] },
    "Meta Street": { ...DEFAULT_PROJECT_CONFIG("Meta Street"), address: "88 Meta St, Mooloolaba", buildings: ["Tower 1"], levels: ["L01","L02","L05","L08","L10"] },
  },
  subcontractors: DEFAULT_SUBS,
  subProfiles: DEFAULT_SUB_PROFILES,
  activeProject: "Jura Noosa",
  company: "CleanRun Construction",
  preparedBy: "Site Manager",
};

const VALID_TYPES: ItemType[] = ["defect", "incomplete", "client"];
const VALID_STATUSES: ItemStatus[] = [
  "open", "issued", "in_progress", "ready_for_review",
  "under_inspection", "rejected", "closed", "complete",
];

const isBrowser = typeof window !== "undefined";

function uniqueStrings(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return fallback;
  const cleaned = input
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
  return cleaned.length ? Array.from(new Set(cleaned)) : fallback;
}

function normaliseSettings(input: unknown): Settings {
  const obj = input && typeof input === "object" ? (input as Partial<Settings>) : {};
  const projects = uniqueStrings(obj.projects, DEFAULT_SETTINGS.projects);
  const subcontractors = uniqueStrings(obj.subcontractors, DEFAULT_SETTINGS.subcontractors).sort((a, b) => a.localeCompare(b));

  const projectConfigs: Record<string, ProjectConfig> = {};
  for (const p of projects) {
    const existing = (obj.projectConfigs as Record<string, ProjectConfig> | undefined)?.[p];
    const fallback = DEFAULT_SETTINGS.projectConfigs[p] ?? DEFAULT_PROJECT_CONFIG(p);
    projectConfigs[p] = {
      name: p,
      address: existing?.address ?? fallback.address ?? "",
      buildings: uniqueStrings(existing?.buildings, fallback.buildings),
      levels: uniqueStrings(existing?.levels, fallback.levels),
      units: uniqueStrings(existing?.units, fallback.units),
      rooms: uniqueStrings(existing?.rooms, fallback.rooms),
      defaultDueDays: typeof existing?.defaultDueDays === "number" ? existing.defaultDueDays : fallback.defaultDueDays,
    };
  }

  const subProfiles: Record<string, SubProfile> = {};
  for (const name of subcontractors) {
    const existing = (obj.subProfiles as Record<string, SubProfile> | undefined)?.[name];
    const fallback = DEFAULT_SUB_PROFILES[name];
    subProfiles[name] = {
      name,
      trade: existing?.trade ?? fallback?.trade,
      contact: existing?.contact ?? fallback?.contact ?? "",
      email: existing?.email ?? fallback?.email ?? "",
      phone: existing?.phone ?? fallback?.phone ?? "",
      projects: existing?.projects ?? fallback?.projects,
    };
  }

  const activeProject =
    typeof obj.activeProject === "string" && projects.includes(obj.activeProject)
      ? obj.activeProject
      : projects[0] ?? DEFAULT_SETTINGS.activeProject;
  const company = typeof obj.company === "string" && obj.company.trim() ? obj.company.trim() : DEFAULT_SETTINGS.company;
  const preparedBy = typeof obj.preparedBy === "string" && obj.preparedBy.trim() ? obj.preparedBy.trim() : DEFAULT_SETTINGS.preparedBy;

  return { projects, projectConfigs, subcontractors, subProfiles, activeProject, company, preparedBy };
}

function normalisePriority(p: unknown): Priority {
  return p === "urgent" ? "urgent" : "high";
}
function normaliseStatus(s: unknown): ItemStatus {
  return VALID_STATUSES.includes(s as ItemStatus) ? (s as ItemStatus) : "open";
}
function normaliseType(t: unknown): ItemType {
  return VALID_TYPES.includes(t as ItemType) ? (t as ItemType) : "defect";
}

function migrateItem(raw: unknown, idx: number): Item {
  const i = raw && typeof raw === "object" ? (raw as Partial<Item> & { photos?: unknown; closeout?: unknown; history?: unknown }) : {};
  const type = normaliseType(i.type);
  const status = normaliseStatus(i.status);
  const now = new Date().toISOString();

  // originalPhotos: prefer new field, else fall back to legacy photos.
  const originalPhotos = Array.isArray(i.originalPhotos)
    ? i.originalPhotos.filter((p: unknown): p is string => typeof p === "string")
    : Array.isArray(i.photos)
      ? (i.photos as unknown[]).filter((p): p is string => typeof p === "string")
      : [];

  const rectificationEvidence: RectificationEvidence[] = Array.isArray(i.rectificationEvidence)
    ? (i.rectificationEvidence as RectificationEvidence[])
    : [];

  // closeoutEvidence: prefer new, else lift legacy single closeout.
  let closeoutEvidence: CloseoutEvidence[] = Array.isArray(i.closeoutEvidence)
    ? (i.closeoutEvidence as CloseoutEvidence[])
    : [];
  const legacyCloseout = i.closeout as Item["closeout"] | undefined;
  if (closeoutEvidence.length === 0 && legacyCloseout && legacyCloseout.photo) {
    closeoutEvidence = [{
      id: makeId(),
      photo: legacyCloseout.photo,
      by: legacyCloseout.signedBy,
      role: legacyCloseout.role,
      note: legacyCloseout.note,
      at: legacyCloseout.signedAt,
    }];
  }

  const auditEvents: AuditEvent[] = Array.isArray(i.auditEvents)
    ? (i.auditEvents as AuditEvent[])
    : Array.isArray(i.history)
      ? (i.history as AuditEvent[])
      : [{ at: now, action: "Created" }];

  const issueHistory: IssueEvent[] = Array.isArray(i.issueHistory) ? (i.issueHistory as IssueEvent[]) : [];
  const inspectionHistory: InspectionEvent[] = Array.isArray(i.inspectionHistory) ? (i.inspectionHistory as InspectionEvent[]) : [];
  const comments: Comment[] = Array.isArray(i.comments) ? (i.comments as Comment[]) : [];

  const item: Item = {
    id: typeof i.id === "string" && i.id ? i.id : `item-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    code: typeof i.code === "string" ? i.code : "",
    type,
    project: typeof i.project === "string" && i.project ? i.project : DEFAULT_SETTINGS.activeProject,
    building: typeof i.building === "string" ? i.building : "",
    level: typeof i.level === "string" ? i.level : "",
    unit: typeof i.unit === "string" ? i.unit : "",
    room: typeof i.room === "string" ? i.room : "",
    trade: typeof i.trade === "string" ? i.trade : "",
    subcontractor: typeof i.subcontractor === "string" ? i.subcontractor : "",
    priority: normalisePriority(i.priority),
    dueDate: typeof i.dueDate === "string" && i.dueDate ? i.dueDate : addDays(7),
    description: typeof i.description === "string" ? i.description : "",
    status,
    createdAt: typeof i.createdAt === "string" ? i.createdAt : now,
    updatedAt: typeof i.updatedAt === "string" ? i.updatedAt : now,
    createdBy: typeof i.createdBy === "string" ? i.createdBy : undefined,
    originalPhotos,
    rectificationEvidence,
    closeoutEvidence,
    comments,
    issueHistory,
    inspectionHistory,
    auditEvents,
    raisedBy: typeof i.raisedBy === "string" ? i.raisedBy : undefined,
    issuedAt: typeof i.issuedAt === "string" ? i.issuedAt : undefined,
    inProgressAt: typeof i.inProgressAt === "string" ? i.inProgressAt : undefined,
    readyForReviewAt: typeof i.readyForReviewAt === "string" ? i.readyForReviewAt : undefined,
    underInspectionAt: typeof i.underInspectionAt === "string" ? i.underInspectionAt : undefined,
    closedAt: typeof i.closedAt === "string" ? i.closedAt : undefined,
    rejectionReason: typeof i.rejectionReason === "string" ? i.rejectionReason : undefined,
    // legacy mirrors
    photos: originalPhotos,
    closeout: closeoutEvidence[0]
      ? {
          photo: closeoutEvidence[0].photo,
          signedBy: closeoutEvidence[0].by,
          role: closeoutEvidence[0].role,
          note: closeoutEvidence[0].note,
          signedAt: closeoutEvidence[0].at,
        }
      : undefined,
    history: auditEvents,
  };
  return item;
}

function migrate(items: unknown): Item[] {
  if (!Array.isArray(items)) return seedItems();
  const coerced = items.map(migrateItem);
  const counters: Record<ItemType, number> = { defect: 0, incomplete: 0, client: 0 };
  coerced.forEach((i) => {
    const prefix = CODE_PREFIX[i.type];
    if (i.code?.startsWith(`${prefix}-`)) {
      const n = parseInt(i.code.slice(prefix.length + 1), 10);
      if (Number.isFinite(n) && n > counters[i.type]) counters[i.type] = n;
    }
  });
  return coerced.map((i) => {
    if (i.code) return i;
    counters[i.type] += 1;
    return { ...i, code: `${CODE_PREFIX[i.type]}-${String(counters[i.type]).padStart(3, "0")}` };
  });
}

function readJsonFromStorage(key: string): unknown | undefined {
  if (!isBrowser) return undefined;
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  return JSON.parse(raw) as unknown;
}

function loadItems(): Item[] {
  if (!isBrowser) return [];
  try {
    const current = readJsonFromStorage(KEY);
    if (current !== undefined) return migrate(current);
    for (const legacyKey of LEGACY_ITEM_KEYS) {
      const legacy = readJsonFromStorage(legacyKey);
      if (legacy !== undefined) {
        const migrated = migrate(legacy);
        localStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
    return seedItems();
  } catch (error) {
    console.warn("CleanRun IQ recovered from invalid stored items", error);
    return seedItems();
  }
}

function loadSettings(): Settings {
  if (!isBrowser) return DEFAULT_SETTINGS;
  try {
    const current = readJsonFromStorage(SETTINGS_KEY);
    if (current !== undefined) {
      const settings = normaliseSettings(current);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    }
    for (const legacyKey of LEGACY_SETTINGS_KEYS) {
      const legacy = readJsonFromStorage(legacyKey);
      if (legacy !== undefined) {
        const settings = normaliseSettings(legacy);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      }
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.warn("CleanRun IQ recovered from invalid stored settings", error);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
}

function addDays(d: number) {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString().slice(0, 10);
}

function placeholderPhoto(label: string, hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
    <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
      <stop offset='0' stop-color='hsl(${hue},35%,82%)'/>
      <stop offset='1' stop-color='hsl(${hue},30%,62%)'/>
    </linearGradient></defs>
    <rect width='200' height='200' fill='url(#g)'/>
    <g fill='hsl(${hue},40%,30%)' opacity='0.85' font-family='Inter,system-ui,sans-serif' font-weight='600'>
      <text x='100' y='108' text-anchor='middle' font-size='22'>${label}</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface SeedSpec {
  type: ItemType;
  project: string; building: string; level: string; unit: string; room: string;
  trade: string; subcontractor: string; priority: Priority; due: number;
  description: string; status: ItemStatus; hue: number; label: string;
  daysAgoIssued?: number; daysAgoInProgress?: number;
  rectificationLabel?: string; rectificationHue?: number; rectificationComment?: string;
  closeoutLabel?: string; closeoutHue?: number; closeoutBy?: string; closeoutRole?: string; closeoutNote?: string;
  raisedBy?: string; rejectionReason?: string;
}

function seedItems(): Item[] {
  const now = new Date().toISOString();
  const specs: SeedSpec[] = [
    { type: "defect", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-304", room: "Ensuite",
      trade: "Tiling", subcontractor: "Sterling Tiling", priority: "urgent", due: -2,
      description: "Cracked floor tile under vanity. Replace and re-grout.",
      status: "issued", hue: 12, label: "Tile", daysAgoIssued: 2 },
    { type: "defect", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-304", room: "Living",
      trade: "Painting", subcontractor: "Coastline Painting", priority: "high", due: 1,
      description: "Paint chipping along south wall skirting. Sand, patch and re-coat.",
      status: "in_progress", hue: 200, label: "Paint", daysAgoIssued: 5, daysAgoInProgress: 3 },
    { type: "incomplete", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-305", room: "Kitchen",
      trade: "Joinery", subcontractor: "TrueLine Joinery", priority: "high", due: 4,
      description: "Pantry door not yet installed. Hardware on site.",
      status: "open", hue: 35, label: "Joinery" },
    { type: "defect", project: "Jura Noosa", building: "Block B", level: "L01", unit: "B-112", room: "Bathroom",
      trade: "Waterproofing", subcontractor: "AquaSeal Waterproofing", priority: "high", due: 0,
      description: "Visible moisture at shower hob junction. Inspect membrane.",
      status: "ready_for_review", hue: 220, label: "Waterproof", daysAgoIssued: 7, daysAgoInProgress: 5,
      rectificationLabel: "Re-sealed", rectificationHue: 160, rectificationComment: "Membrane re-applied, 24hr cure complete." },
    { type: "client", project: "Jura Noosa", building: "Block B", level: "L02", unit: "B-204", room: "Bedroom 2",
      trade: "Doors / Hardware", subcontractor: "TrueLine Joinery", priority: "high", due: 6,
      description: "Bedroom door rubs on jamb. Adjust and re-hang.",
      status: "issued", hue: 280, label: "Door", daysAgoIssued: 1, raisedBy: "Client PM" },
    { type: "defect", project: "Meta Street", building: "Tower 1", level: "L08", unit: "T1-803", room: "Kitchen",
      trade: "Electrical", subcontractor: "Northline Electrical", priority: "urgent", due: -1,
      description: "Powerpoint above benchtop not energised. Test circuit.",
      status: "in_progress", hue: 50, label: "Power", daysAgoIssued: 14, daysAgoInProgress: 12 },
    { type: "incomplete", project: "Meta Street", building: "Tower 1", level: "L08", unit: "T1-803", room: "Balcony",
      trade: "Caulking / Sealant", subcontractor: "AquaSeal Waterproofing", priority: "high", due: 8,
      description: "Perimeter sealant to balcony slider outstanding.",
      status: "open", hue: 160, label: "Seal" },
    { type: "defect", project: "Meta Street", building: "Tower 1", level: "L05", unit: "T1-502", room: "Hallway",
      trade: "Plastering", subcontractor: "Apex Plastering", priority: "high", due: -3,
      description: "Cornice gap at junction. Re-set and sand.",
      status: "under_inspection", hue: 110, label: "Plaster", daysAgoIssued: 6, daysAgoInProgress: 4,
      rectificationLabel: "Patched", rectificationHue: 35, rectificationComment: "Set, sanded, primer applied." },
    { type: "defect", project: "Meta Street", building: "Tower 1", level: "L02", unit: "T1-201", room: "Living",
      trade: "Flooring", subcontractor: "Premier Flooring", priority: "high", due: -5,
      description: "Lifted vinyl plank near entry. Re-adhere or replace.",
      status: "closed", hue: 25, label: "Floor", daysAgoIssued: 9, daysAgoInProgress: 7,
      rectificationLabel: "Replaced", rectificationHue: 60, rectificationComment: "Plank replaced, area cleaned.",
      closeoutLabel: "Signed off", closeoutHue: 140, closeoutBy: "Sam Whitlock", closeoutRole: "Site Manager",
      closeoutNote: "Plank replaced, area re-cleaned. Approved." },
    { type: "client", project: "Meta Street", building: "Tower 1", level: "L10", unit: "T1-1004", room: "Ensuite",
      trade: "Cleaning", subcontractor: "Endeavour Cleaning", priority: "high", due: 2,
      description: "Grout haze on shower wall tiles. Re-clean.",
      status: "open", hue: 190, label: "Clean", raisedBy: "Superintendent" },
    { type: "defect", project: "Meta Street", building: "Tower 1", level: "L05", unit: "T1-505", room: "Bathroom",
      trade: "Tiling", subcontractor: "Sterling Tiling", priority: "high", due: -1,
      description: "Tile lippage at niche. Reset two pieces.",
      status: "rejected", hue: 0, label: "Tile", daysAgoIssued: 8, daysAgoInProgress: 5,
      rectificationLabel: "Attempted", rectificationHue: 0,
      rejectionReason: "Lippage still visible — re-do affected pieces." },
  ];

  const counters: Record<ItemType, number> = { defect: 0, incomplete: 0, client: 0 };
  const seed: Item[] = specs.map((s, idx) => {
    counters[s.type] += 1;
    const code = `${CODE_PREFIX[s.type]}-${String(counters[s.type]).padStart(3, "0")}`;
    const originalPhotos = [placeholderPhoto(s.label, s.hue)];

    const auditEvents: AuditEvent[] = [{ at: now, action: `Created (${code})` }];
    const issueHistory: IssueEvent[] = [];
    const inspectionHistory: InspectionEvent[] = [];
    const rectificationEvidence: RectificationEvidence[] = [];
    const closeoutEvidence: CloseoutEvidence[] = [];

    const issuedAt = s.daysAgoIssued != null ? new Date(Date.now() - s.daysAgoIssued * 86400000).toISOString() : undefined;
    const inProgressAt = s.daysAgoInProgress != null ? new Date(Date.now() - s.daysAgoInProgress * 86400000).toISOString() : undefined;
    let readyForReviewAt: string | undefined;
    let underInspectionAt: string | undefined;
    let closedAt: string | undefined;

    if (issuedAt) {
      issueHistory.push({ at: issuedAt, to: s.subcontractor, by: "Site Manager" });
      auditEvents.push({ at: issuedAt, action: `Issued to ${s.subcontractor}`, by: "Site Manager" });
    }
    if (inProgressAt) auditEvents.push({ at: inProgressAt, action: "Subcontractor marked in progress", by: s.subcontractor });

    if (["ready_for_review", "under_inspection", "closed"].includes(s.status)) {
      readyForReviewAt = new Date(Date.now() - 86400000).toISOString();
      auditEvents.push({ at: readyForReviewAt, action: "Marked ready for review", by: s.subcontractor });
      if (s.rectificationLabel) {
        rectificationEvidence.push({
          id: makeId(),
          photo: placeholderPhoto(s.rectificationLabel, s.rectificationHue ?? 160),
          comment: s.rectificationComment,
          by: s.subcontractor,
          at: readyForReviewAt,
        });
      }
    }
    if (s.status === "under_inspection" || s.status === "closed") {
      underInspectionAt = new Date(Date.now() - 43200000).toISOString();
      inspectionHistory.push({ at: underInspectionAt, by: "Sam Whitlock", action: "started" });
      auditEvents.push({ at: underInspectionAt, action: "Inspection started", by: "Sam Whitlock" });
    }
    if (s.status === "rejected" && s.rectificationLabel) {
      const r = new Date(Date.now() - 2 * 86400000).toISOString();
      rectificationEvidence.push({
        id: makeId(),
        photo: placeholderPhoto(s.rectificationLabel, s.rectificationHue ?? 0),
        comment: "Initial rectification attempt.",
        by: s.subcontractor,
        at: r,
      });
      const rj = new Date(Date.now() - 86400000).toISOString();
      inspectionHistory.push({ at: rj, by: "Sam Whitlock", action: "rejected", reason: s.rejectionReason });
      auditEvents.push({ at: rj, action: "Rejected on inspection", by: "Sam Whitlock", note: s.rejectionReason });
    }
    if (s.status === "closed" && s.closeoutLabel) {
      closedAt = new Date().toISOString();
      closeoutEvidence.push({
        id: makeId(),
        photo: placeholderPhoto(s.closeoutLabel, s.closeoutHue ?? 140),
        by: s.closeoutBy ?? "Sam Whitlock",
        role: s.closeoutRole ?? "Site Manager",
        note: s.closeoutNote,
        confirmation: "I confirm this item has been inspected and is acceptable for closeout.",
        at: closedAt,
      });
      auditEvents.push({ at: closedAt, action: "Closed with evidence", by: s.closeoutBy });
    }

    return {
      id: `seed-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      code, type: s.type, project: s.project, building: s.building, level: s.level,
      unit: s.unit, room: s.room, trade: s.trade, subcontractor: s.subcontractor,
      priority: s.priority, dueDate: addDays(s.due), description: s.description,
      status: s.status, createdAt: now, updatedAt: now, createdBy: "Site Manager",
      originalPhotos, rectificationEvidence, closeoutEvidence,
      comments: [], issueHistory, inspectionHistory, auditEvents,
      raisedBy: s.raisedBy,
      issuedAt, inProgressAt, readyForReviewAt, underInspectionAt, closedAt,
      rejectionReason: s.rejectionReason,
      photos: originalPhotos,
      closeout: closeoutEvidence[0] && {
        photo: closeoutEvidence[0].photo,
        signedBy: closeoutEvidence[0].by,
        role: closeoutEvidence[0].role,
        note: closeoutEvidence[0].note,
        signedAt: closeoutEvidence[0].at,
      },
      history: auditEvents,
    } satisfies Item;
  });

  if (isBrowser) localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

const listeners = new Set<() => void>();
let itemsCache: Item[] | null = null;
let settingsCache: Settings | null = null;

function getItemsSnapshot(): Item[] {
  if (itemsCache === null) itemsCache = loadItems();
  return itemsCache;
}
function getSettingsSnapshot(): Settings {
  if (settingsCache === null) settingsCache = loadSettings();
  return settingsCache;
}

function saveItems(items: Item[]) {
  // keep legacy mirrors in sync
  const synced = items.map((i) => ({
    ...i,
    photos: i.originalPhotos,
    closeout: i.closeoutEvidence[0]
      ? {
          photo: i.closeoutEvidence[0].photo,
          signedBy: i.closeoutEvidence[0].by,
          role: i.closeoutEvidence[0].role,
          note: i.closeoutEvidence[0].note,
          signedAt: i.closeoutEvidence[0].at,
        }
      : undefined,
    history: i.auditEvents,
  }));
  if (isBrowser) localStorage.setItem(KEY, JSON.stringify(synced));
  itemsCache = synced;
  listeners.forEach((l) => l());
}

function saveSettings(s: Settings) {
  const settings = normaliseSettings(s);
  if (isBrowser) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  settingsCache = settings;
  listeners.forEach((l) => l());
}

function patchItem(id: string, mutator: (it: Item) => Item) {
  const items = loadItems().map((it) => (it.id === id ? mutator({ ...it }) : it));
  saveItems(items);
}

function audit(it: Item, ev: AuditEvent): Item {
  return { ...it, auditEvents: [...it.auditEvents, ev], updatedAt: ev.at };
}

export const itemsStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getItems(): Item[] { return loadItems(); },
  getSettings(): Settings { return loadSettings(); },

  create(
    input: Omit<Item, "id" | "code" | "createdAt" | "updatedAt" | "status" |
      "originalPhotos" | "rectificationEvidence" | "closeoutEvidence" |
      "comments" | "issueHistory" | "inspectionHistory" | "auditEvents" | "photos" | "history"
    > & {
      status?: ItemStatus;
      originalPhotos: string[];
    },
  ): Item {
    const now = new Date().toISOString();
    const existing = loadItems();
    const code = nextCode(existing, input.type);
    const newItem: Item = {
      ...input,
      id: makeId(),
      code,
      status: input.status ?? "open",
      createdAt: now,
      updatedAt: now,
      originalPhotos: input.originalPhotos,
      rectificationEvidence: [],
      closeoutEvidence: [],
      comments: [],
      issueHistory: [],
      inspectionHistory: [],
      auditEvents: [{ at: now, action: `Created (${code})`, by: input.createdBy }],
      photos: input.originalPhotos,
      history: [],
    };
    newItem.history = newItem.auditEvents;
    saveItems([newItem, ...existing]);
    return newItem;
  },

  issue(id: string, opts: { to: string; by?: string; note?: string; reissue?: boolean }) {
    const at = new Date().toISOString();
    patchItem(id, (it) => {
      const ev: IssueEvent = { at, to: opts.to, by: opts.by, note: opts.note, reissue: opts.reissue };
      const next = audit(
        {
          ...it,
          subcontractor: opts.to || it.subcontractor,
          status: "issued",
          issuedAt: it.issuedAt ?? at,
          issueHistory: [...it.issueHistory, ev],
          rejectionReason: opts.reissue ? undefined : it.rejectionReason,
        },
        { at, action: opts.reissue ? `Re-issued to ${opts.to}` : `Issued to ${opts.to}`, by: opts.by, note: opts.note },
      );
      return next;
    });
  },

  markInProgress(id: string, by?: string) {
    const at = new Date().toISOString();
    patchItem(id, (it) => audit({ ...it, status: "in_progress", inProgressAt: at }, { at, action: "Marked in progress", by }));
  },

  markReady(id: string, by?: string, note?: string) {
    const at = new Date().toISOString();
    patchItem(id, (it) => audit({ ...it, status: "ready_for_review", readyForReviewAt: at }, { at, action: "Marked ready for review", by, note }));
  },

  startInspection(id: string, by: string) {
    const at = new Date().toISOString();
    patchItem(id, (it) => audit(
      { ...it, status: "under_inspection", underInspectionAt: at, inspectionHistory: [...it.inspectionHistory, { at, by, action: "started" }] },
      { at, action: "Inspection started", by },
    ));
  },

  reject(id: string, by: string, reason: string) {
    const at = new Date().toISOString();
    patchItem(id, (it) => audit(
      { ...it, status: "rejected", rejectionReason: reason, inspectionHistory: [...it.inspectionHistory, { at, by, action: "rejected", reason }] },
      { at, action: "Rejected on inspection", by, note: reason },
    ));
  },

  closeWithEvidence(id: string, evidence: Omit<CloseoutEvidence, "id" | "at">[]) {
    const at = new Date().toISOString();
    patchItem(id, (it) => {
      const entries: CloseoutEvidence[] = evidence.map((e) => ({ ...e, id: makeId(), at }));
      const merged = [...it.closeoutEvidence, ...entries];
      return audit(
        { ...it, status: it.type === "incomplete" ? "complete" : "closed", closedAt: at, closeoutEvidence: merged },
        { at, action: "Closed with evidence", by: entries[0]?.by },
      );
    });
  },

  reopen(id: string, by?: string) {
    const at = new Date().toISOString();
    patchItem(id, (it) => audit({ ...it, status: "in_progress", closedAt: undefined }, { at, action: "Reopened", by }));
  },

  addRectification(id: string, ev: Omit<RectificationEvidence, "id" | "at"> & { advanceToReady?: boolean }) {
    const at = new Date().toISOString();
    patchItem(id, (it) => {
      const entry: RectificationEvidence = { id: makeId(), at, photo: ev.photo, comment: ev.comment, by: ev.by };
      const base: Item = {
        ...it,
        rectificationEvidence: [...it.rectificationEvidence, entry],
        // If sub is uploading evidence and item was issued, auto-move to in_progress.
        status: it.status === "issued" ? "in_progress" : it.status,
        inProgressAt: it.inProgressAt ?? (it.status === "issued" ? at : it.inProgressAt),
      };
      let next = audit(base, { at, action: "Rectification evidence added", by: ev.by, note: ev.comment });
      if (ev.advanceToReady) {
        next = audit({ ...next, status: "ready_for_review", readyForReviewAt: at }, { at, action: "Marked ready for review", by: ev.by });
      }
      return next;
    });
  },

  addComment(id: string, c: Omit<Comment, "id" | "at">) {
    const at = new Date().toISOString();
    patchItem(id, (it) => {
      const comment: Comment = { id: makeId(), at, text: c.text, by: c.by };
      return audit({ ...it, comments: [...it.comments, comment] }, { at, action: "Comment added", by: c.by, note: c.text });
    });
  },

  update(id: string, patch: Partial<Item>) {
    patchItem(id, (it) => ({ ...it, ...patch, updatedAt: new Date().toISOString() }));
  },

  remove(id: string) {
    saveItems(loadItems().filter((it) => it.id !== id));
  },

  setSettings(s: Settings) { saveSettings(s); },
  setActiveProject(name: string) {
    const s = loadSettings();
    const activeProject = s.projects.includes(name) ? name : s.projects[0] ?? DEFAULT_SETTINGS.activeProject;
    saveSettings({ ...s, activeProject });
  },
  addSubcontractor(profile: SubProfile) {
    const s = loadSettings();
    const name = profile.name.trim();
    if (!name) return;
    const subcontractors = s.subcontractors.includes(name) ? s.subcontractors : [...s.subcontractors, name];
    const subProfiles = { ...s.subProfiles, [name]: { ...profile, name } };
    saveSettings({ ...s, subcontractors, subProfiles });
  },
  updateSubProfile(name: string, patch: Partial<SubProfile>) {
    const s = loadSettings();
    if (!s.subProfiles[name]) return;
    const subProfiles = { ...s.subProfiles, [name]: { ...s.subProfiles[name], ...patch, name } };
    saveSettings({ ...s, subProfiles });
  },
  removeSubcontractor(name: string) {
    const s = loadSettings();
    const subcontractors = s.subcontractors.filter((n) => n !== name);
    const subProfiles = { ...s.subProfiles };
    delete subProfiles[name];
    saveSettings({ ...s, subcontractors, subProfiles });
  },
  addProject(name: string) {
    const s = loadSettings();
    const cleanName = name.trim();
    if (!cleanName || s.projects.includes(cleanName)) return;
    saveSettings({
      ...s,
      projects: [...s.projects, cleanName],
      projectConfigs: { ...s.projectConfigs, [cleanName]: DEFAULT_PROJECT_CONFIG(cleanName) },
      activeProject: s.activeProject || cleanName,
    });
  },
  updateProjectConfig(name: string, patch: Partial<ProjectConfig>) {
    const s = loadSettings();
    const current = s.projectConfigs[name] ?? DEFAULT_PROJECT_CONFIG(name);
    saveSettings({ ...s, projectConfigs: { ...s.projectConfigs, [name]: { ...current, ...patch, name } } });
  },
};

export function useItems(): Item[] {
  return useSyncExternalStore(itemsStore.subscribe, getItemsSnapshot, () => []);
}

export function useSettings(): Settings {
  return useSyncExternalStore(itemsStore.subscribe, getSettingsSnapshot, () => DEFAULT_SETTINGS);
}

export function isOverdue(item: Item): boolean {
  if (item.status === "closed" || item.status === "complete") return false;
  return item.dueDate < new Date().toISOString().slice(0, 10);
}

export function activeProjectConfig(s: Settings): ProjectConfig {
  return s.projectConfigs[s.activeProject] ?? DEFAULT_PROJECT_CONFIG(s.activeProject);
}
