import { useSyncExternalStore } from "react";
import type { AuditEvent, Closeout, CloseoutEvidence, Comment, InspectionEvent, IssueEvent, Item, ItemStatus, ItemType, Priority, ProjectConfig, RectificationEvidence, SubProfile } from "./types";
import { CODE_PREFIX, makeId, nextCode } from "./types";

const KEY = "cleanrun-iq:items:v5";
const LEGACY_ITEM_KEYS = ["cleanrun-iq:items:v4", "cleanrun-iq:items:v3"];
const SETTINGS_KEY = "cleanrun-iq:settings:v5";
const LEGACY_SETTINGS_KEYS = ["cleanrun-iq:settings:v4", "cleanrun-iq:settings:v3"];
const isBrowser = typeof window !== "undefined";

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

const DEFAULT_SUB_PROFILES: Record<string, SubProfile> = Object.fromEntries(DEFAULT_SUBS.map((name) => [name, { name, trade: tradeGuess(name), contact: "", email: `${name.toLowerCase().replace(/[^a-z]+/g, "")}@example.com`, phone: "" } satisfies SubProfile]));

const DEFAULT_SETTINGS: Settings = {
  projects: ["Jura Noosa", "Meta Street"],
  projectConfigs: {
    "Jura Noosa": { ...DEFAULT_PROJECT_CONFIG("Jura Noosa"), address: "12 Hastings St, Noosa Heads", buildings: ["Block A", "Block B"] },
    "Meta Street": { ...DEFAULT_PROJECT_CONFIG("Meta Street"), address: "88 Meta St, Mooloolaba", buildings: ["Tower 1"], levels: ["L01", "L02", "L05", "L08", "L10"] },
  },
  subcontractors: DEFAULT_SUBS,
  subProfiles: DEFAULT_SUB_PROFILES,
  activeProject: "Jura Noosa",
  company: "CleanRun Construction",
  preparedBy: "Site Manager",
};

const VALID_TYPES: ItemType[] = ["defect", "incomplete", "client"];
const VALID_STATUSES: ItemStatus[] = ["open", "issued", "in_progress", "ready_for_review", "under_inspection", "rejected", "closed", "complete"];

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

function uniqueStrings(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return fallback;
  const cleaned = input.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
  return cleaned.length ? Array.from(new Set(cleaned)) : fallback;
}

function normaliseSettings(input: unknown): Settings {
  const obj = input && typeof input === "object" ? (input as Partial<Settings>) : {};
  const projects = uniqueStrings(obj.projects, DEFAULT_SETTINGS.projects);
  const subcontractors = uniqueStrings(obj.subcontractors, DEFAULT_SETTINGS.subcontractors).sort((a, b) => a.localeCompare(b));
  const projectConfigs: Record<string, ProjectConfig> = {};

  for (const project of projects) {
    const existing = (obj.projectConfigs as Record<string, ProjectConfig> | undefined)?.[project];
    const fallback = DEFAULT_SETTINGS.projectConfigs[project] ?? DEFAULT_PROJECT_CONFIG(project);
    projectConfigs[project] = {
      name: project,
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

  const activeProject = typeof obj.activeProject === "string" && projects.includes(obj.activeProject) ? obj.activeProject : projects[0] ?? DEFAULT_SETTINGS.activeProject;
  const company = typeof obj.company === "string" && obj.company.trim() ? obj.company.trim() : DEFAULT_SETTINGS.company;
  const preparedBy = typeof obj.preparedBy === "string" && obj.preparedBy.trim() ? obj.preparedBy.trim() : DEFAULT_SETTINGS.preparedBy;
  return { projects, projectConfigs, subcontractors, subProfiles, activeProject, company, preparedBy };
}

function normalisePriority(p: unknown): Priority { return p === "urgent" ? "urgent" : "high"; }
function normaliseStatus(s: unknown): ItemStatus { return VALID_STATUSES.includes(s as ItemStatus) ? (s as ItemStatus) : "open"; }
function normaliseType(t: unknown): ItemType { return VALID_TYPES.includes(t as ItemType) ? (t as ItemType) : "defect"; }
function addDays(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }

function normaliseCloseoutEvidence(input: unknown): CloseoutEvidence[] {
  if (!Array.isArray(input)) return [];
  return input.filter((e): e is Partial<CloseoutEvidence> => !!e && typeof e === "object").map((e) => ({
    id: typeof e.id === "string" && e.id ? e.id : makeId(),
    photo: typeof e.photo === "string" && e.photo ? e.photo : undefined,
    by: typeof e.by === "string" && e.by ? e.by : "Site Manager",
    role: typeof e.role === "string" && e.role ? e.role : "Site Manager",
    note: typeof e.note === "string" && e.note ? e.note : undefined,
    confirmation: typeof e.confirmation === "string" && e.confirmation ? e.confirmation : undefined,
    at: typeof e.at === "string" && e.at ? e.at : new Date().toISOString(),
  }));
}

function closeoutMirror(evidence: CloseoutEvidence[]): Closeout | undefined {
  const withPhoto = evidence.find((e) => e.photo);
  if (!withPhoto?.photo) return undefined;
  return { photo: withPhoto.photo, signedBy: withPhoto.by, role: withPhoto.role, note: withPhoto.note, signedAt: withPhoto.at };
}

function migrateItem(raw: unknown, idx: number): Item {
  const i = raw && typeof raw === "object" ? (raw as Partial<Item> & { photos?: unknown; closeout?: unknown; history?: unknown }) : {};
  const type = normaliseType(i.type);
  const now = new Date().toISOString();
  const originalPhotos = Array.isArray(i.originalPhotos) ? i.originalPhotos.filter((p): p is string => typeof p === "string" && !!p) : Array.isArray(i.photos) ? (i.photos as unknown[]).filter((p): p is string => typeof p === "string" && !!p) : [];
  const rectificationEvidence: RectificationEvidence[] = Array.isArray(i.rectificationEvidence) ? (i.rectificationEvidence as RectificationEvidence[]) : [];
  let closeoutEvidence = normaliseCloseoutEvidence(i.closeoutEvidence);
  const legacyCloseout = i.closeout as Closeout | undefined;
  if (closeoutEvidence.length === 0 && legacyCloseout) {
    closeoutEvidence = [{ id: makeId(), photo: legacyCloseout.photo || undefined, by: legacyCloseout.signedBy || "Site Manager", role: legacyCloseout.role || "Site Manager", note: legacyCloseout.note, at: legacyCloseout.signedAt || now }];
  }
  const auditEvents: AuditEvent[] = Array.isArray(i.auditEvents) ? (i.auditEvents as AuditEvent[]) : Array.isArray(i.history) ? (i.history as AuditEvent[]) : [{ at: now, action: "Created" }];

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
    status: normaliseStatus(i.status),
    createdAt: typeof i.createdAt === "string" ? i.createdAt : now,
    updatedAt: typeof i.updatedAt === "string" ? i.updatedAt : now,
    createdBy: typeof i.createdBy === "string" ? i.createdBy : undefined,
    originalPhotos,
    rectificationEvidence,
    closeoutEvidence,
    comments: Array.isArray(i.comments) ? (i.comments as Comment[]) : [],
    issueHistory: Array.isArray(i.issueHistory) ? (i.issueHistory as IssueEvent[]) : [],
    inspectionHistory: Array.isArray(i.inspectionHistory) ? (i.inspectionHistory as InspectionEvent[]) : [],
    auditEvents,
    raisedBy: typeof i.raisedBy === "string" ? i.raisedBy : undefined,
    issuedAt: typeof i.issuedAt === "string" ? i.issuedAt : undefined,
    inProgressAt: typeof i.inProgressAt === "string" ? i.inProgressAt : undefined,
    readyForReviewAt: typeof i.readyForReviewAt === "string" ? i.readyForReviewAt : undefined,
    underInspectionAt: typeof i.underInspectionAt === "string" ? i.underInspectionAt : undefined,
    closedAt: typeof i.closedAt === "string" ? i.closedAt : undefined,
    rejectionReason: typeof i.rejectionReason === "string" ? i.rejectionReason : undefined,
    photos: originalPhotos,
    closeout: closeoutMirror(closeoutEvidence),
    history: auditEvents,
  };
  return item;
}

function migrate(items: unknown): Item[] {
  if (!Array.isArray(items)) return seedItems();
  const coerced = items.map(migrateItem);
  const counters: Record<ItemType, number> = { defect: 0, incomplete: 0, client: 0 };
  coerced.forEach((i) => { const prefix = CODE_PREFIX[i.type]; if (i.code?.startsWith(`${prefix}-`)) { const n = parseInt(i.code.slice(prefix.length + 1), 10); if (Number.isFinite(n) && n > counters[i.type]) counters[i.type] = n; } });
  return coerced.map((i) => { if (i.code) return i; counters[i.type] += 1; return { ...i, code: `${CODE_PREFIX[i.type]}-${String(counters[i.type]).padStart(3, "0")}` }; });
}

function readJsonFromStorage(key: string): unknown | undefined {
  if (!isBrowser) return undefined;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) as unknown : undefined;
}

function loadItems(): Item[] {
  if (!isBrowser) return [];
  try {
    const current = readJsonFromStorage(KEY);
    if (current !== undefined) return migrate(current);
    for (const legacyKey of LEGACY_ITEM_KEYS) {
      const legacy = readJsonFromStorage(legacyKey);
      if (legacy !== undefined) { const migrated = migrate(legacy); localStorage.setItem(KEY, JSON.stringify(migrated)); return migrated; }
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
    if (current !== undefined) { const settings = normaliseSettings(current); localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return settings; }
    for (const legacyKey of LEGACY_SETTINGS_KEYS) {
      const legacy = readJsonFromStorage(legacyKey);
      if (legacy !== undefined) { const settings = normaliseSettings(legacy); localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return settings; }
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.warn("CleanRun IQ recovered from invalid stored settings", error);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
}

function placeholderPhoto(label: string, hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='hsl(${hue},35%,82%)'/><text x='100' y='108' text-anchor='middle' font-family='Inter,system-ui,sans-serif' font-weight='600' font-size='22' fill='hsl(${hue},40%,30%)'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function seedItems(): Item[] {
  const now = new Date().toISOString();
  const seed: Item[] = [
    makeSeed({ type: "defect", code: "DEF-001", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-304", room: "Ensuite", trade: "Tiling", subcontractor: "Sterling Tiling", priority: "urgent", dueDate: addDays(-2), description: "Cracked floor tile under vanity. Replace and re-grout.", status: "issued", photo: placeholderPhoto("Tile", 12), issuedAt: now }),
    makeSeed({ type: "incomplete", code: "INC-001", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-305", room: "Kitchen", trade: "Joinery", subcontractor: "TrueLine Joinery", priority: "high", dueDate: addDays(4), description: "Pantry door not yet installed. Hardware on site.", status: "open", photo: placeholderPhoto("Joinery", 35) }),
    makeSeed({ type: "client", code: "CLD-001", project: "Meta Street", building: "Tower 1", level: "L10", unit: "T1-1004", room: "Ensuite", trade: "Cleaning", subcontractor: "Endeavour Cleaning", priority: "high", dueDate: addDays(2), description: "Grout haze on shower wall tiles. Re-clean.", status: "open", photo: placeholderPhoto("Clean", 190), raisedBy: "Superintendent" }),
  ];
  if (isBrowser) localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function makeSeed(input: Omit<Item, "id" | "createdAt" | "updatedAt" | "createdBy" | "originalPhotos" | "rectificationEvidence" | "closeoutEvidence" | "comments" | "issueHistory" | "inspectionHistory" | "auditEvents" | "photos" | "history"> & { photo: string }): Item {
  const now = new Date().toISOString();
  const issueHistory: IssueEvent[] = input.issuedAt ? [{ at: input.issuedAt, to: input.subcontractor, by: "Site Manager" }] : [];
  const auditEvents: AuditEvent[] = [{ at: now, action: `Created (${input.code})`, by: "Site Manager" }, ...issueHistory.map((e) => ({ at: e.at, action: `Issued to ${e.to}`, by: e.by }))];
  return { ...input, id: makeId(), createdAt: now, updatedAt: now, createdBy: "Site Manager", originalPhotos: [input.photo], rectificationEvidence: [], closeoutEvidence: [], comments: [], issueHistory, inspectionHistory: [], auditEvents, photos: [input.photo], history: auditEvents };
}

const listeners = new Set<() => void>();
let itemsCache: Item[] | null = null;
let settingsCache: Settings | null = null;

function getItemsSnapshot(): Item[] { if (itemsCache === null) itemsCache = loadItems(); return itemsCache; }
function getSettingsSnapshot(): Settings { if (settingsCache === null) settingsCache = loadSettings(); return settingsCache; }

function syncLegacyMirrors(item: Item): Item {
  return { ...item, photos: item.originalPhotos, closeout: closeoutMirror(item.closeoutEvidence), history: item.auditEvents };
}
function saveItems(items: Item[]) { const synced = items.map(syncLegacyMirrors); if (isBrowser) localStorage.setItem(KEY, JSON.stringify(synced)); itemsCache = synced; listeners.forEach((l) => l()); }
function saveSettings(s: Settings) { const settings = normaliseSettings(s); if (isBrowser) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); settingsCache = settings; listeners.forEach((l) => l()); }
function patchItem(id: string, mutator: (it: Item) => Item) { saveItems(loadItems().map((it) => (it.id === id ? mutator({ ...it }) : it))); }
function audit(it: Item, ev: AuditEvent): Item { return { ...it, auditEvents: [...it.auditEvents, ev], updatedAt: ev.at }; }

export const itemsStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
  getItems(): Item[] { return loadItems(); },
  getSettings(): Settings { return loadSettings(); },

  create(input: Omit<Item, "id" | "code" | "createdAt" | "updatedAt" | "status" | "originalPhotos" | "rectificationEvidence" | "closeoutEvidence" | "comments" | "issueHistory" | "inspectionHistory" | "auditEvents" | "photos" | "history"> & { status?: ItemStatus; originalPhotos: string[] }): Item {
    const now = new Date().toISOString();
    const existing = loadItems();
    const code = nextCode(existing, input.type);
    const newItem: Item = { ...input, id: makeId(), code, status: input.status ?? "open", createdAt: now, updatedAt: now, originalPhotos: input.originalPhotos, rectificationEvidence: [], closeoutEvidence: [], comments: [], issueHistory: [], inspectionHistory: [], auditEvents: [{ at: now, action: `Created (${code})`, by: input.createdBy }], photos: input.originalPhotos, history: [] };
    newItem.history = newItem.auditEvents;
    saveItems([newItem, ...existing]);
    return newItem;
  },

  issue(id: string, opts: { to: string; by?: string; note?: string; reissue?: boolean }) {
    const at = new Date().toISOString();
    patchItem(id, (it) => audit({ ...it, subcontractor: opts.to || it.subcontractor, status: "issued", issuedAt: it.issuedAt ?? at, issueHistory: [...it.issueHistory, { at, to: opts.to, by: opts.by, note: opts.note, reissue: opts.reissue }], rejectionReason: opts.reissue ? undefined : it.rejectionReason }, { at, action: opts.reissue ? `Re-issued to ${opts.to}` : `Issued to ${opts.to}`, by: opts.by, note: opts.note }));
  },
  markInProgress(id: string, by?: string) { const at = new Date().toISOString(); patchItem(id, (it) => audit({ ...it, status: "in_progress", inProgressAt: at }, { at, action: "Marked in progress", by })); },
  markReady(id: string, by?: string, note?: string) { const at = new Date().toISOString(); patchItem(id, (it) => audit({ ...it, status: "ready_for_review", readyForReviewAt: at }, { at, action: "Marked ready for review", by, note })); },
  startInspection(id: string, by: string) { const at = new Date().toISOString(); patchItem(id, (it) => audit({ ...it, status: "under_inspection", underInspectionAt: at, inspectionHistory: [...it.inspectionHistory, { at, by, action: "started" }] }, { at, action: "Inspection started", by })); },
  reject(id: string, by: string, reason: string) { const at = new Date().toISOString(); patchItem(id, (it) => audit({ ...it, status: "rejected", rejectionReason: reason, inspectionHistory: [...it.inspectionHistory, { at, by, action: "rejected", reason }] }, { at, action: "Rejected on inspection", by, note: reason })); },
  closeWithEvidence(id: string, evidence: Omit<CloseoutEvidence, "id" | "at">[]) { const at = new Date().toISOString(); patchItem(id, (it) => { const entries = evidence.map((e) => ({ ...e, id: makeId(), at })); return audit({ ...it, status: it.type === "incomplete" ? "complete" : "closed", closedAt: at, closeoutEvidence: [...it.closeoutEvidence, ...entries] }, { at, action: "Closed with evidence", by: entries[0]?.by }); }); },
  reopen(id: string, by: string, reason: string) { const at = new Date().toISOString(); patchItem(id, (it) => audit({ ...it, status: "in_progress", closedAt: undefined, inProgressAt: at }, { at, action: "Reopened", by, note: reason })); },
  addRectification(id: string, ev: Omit<RectificationEvidence, "id" | "at"> & { advanceToReady?: boolean }) { const at = new Date().toISOString(); patchItem(id, (it) => { const entry: RectificationEvidence = { id: makeId(), at, photo: ev.photo, comment: ev.comment, by: ev.by }; let next = audit({ ...it, rectificationEvidence: [...it.rectificationEvidence, entry], status: it.status === "issued" ? "in_progress" : it.status, inProgressAt: it.inProgressAt ?? (it.status === "issued" ? at : it.inProgressAt) }, { at, action: "Rectification evidence added", by: ev.by, note: ev.comment }); if (ev.advanceToReady) next = audit({ ...next, status: "ready_for_review", readyForReviewAt: at }, { at, action: "Marked ready for review", by: ev.by }); return next; }); },
  addComment(id: string, c: Omit<Comment, "id" | "at">) { const at = new Date().toISOString(); patchItem(id, (it) => audit({ ...it, comments: [...it.comments, { id: makeId(), at, text: c.text, by: c.by }] }, { at, action: "Comment added", by: c.by, note: c.text })); },
  update(id: string, patch: Partial<Item>) { patchItem(id, (it) => ({ ...it, ...patch, updatedAt: new Date().toISOString() })); },
  remove(id: string) { saveItems(loadItems().filter((it) => it.id !== id)); },

  setSettings(s: Settings) { saveSettings(s); },
  setActiveProject(name: string) { const s = loadSettings(); const activeProject = s.projects.includes(name) ? name : s.projects[0] ?? DEFAULT_SETTINGS.activeProject; saveSettings({ ...s, activeProject }); },
  addSubcontractor(profile: SubProfile) { const s = loadSettings(); const name = profile.name.trim(); if (!name) return; const subcontractors = s.subcontractors.includes(name) ? s.subcontractors : [...s.subcontractors, name]; saveSettings({ ...s, subcontractors, subProfiles: { ...s.subProfiles, [name]: { ...profile, name } } }); },
  updateSubProfile(name: string, patch: Partial<SubProfile>) { const s = loadSettings(); if (!s.subProfiles[name]) return; saveSettings({ ...s, subProfiles: { ...s.subProfiles, [name]: { ...s.subProfiles[name], ...patch, name } } }); },
  removeSubcontractor(name: string) { const s = loadSettings(); const subProfiles = { ...s.subProfiles }; delete subProfiles[name]; saveSettings({ ...s, subcontractors: s.subcontractors.filter((n) => n !== name), subProfiles }); },
  addProject(name: string) { const s = loadSettings(); const cleanName = name.trim(); if (!cleanName || s.projects.includes(cleanName)) return; saveSettings({ ...s, projects: [...s.projects, cleanName], projectConfigs: { ...s.projectConfigs, [cleanName]: DEFAULT_PROJECT_CONFIG(cleanName) }, activeProject: s.activeProject || cleanName }); },
  updateProjectConfig(name: string, patch: Partial<ProjectConfig>) { const s = loadSettings(); const current = s.projectConfigs[name] ?? DEFAULT_PROJECT_CONFIG(name); saveSettings({ ...s, projectConfigs: { ...s.projectConfigs, [name]: { ...current, ...patch, name } } }); },
};

export function useItems(): Item[] { return useSyncExternalStore(itemsStore.subscribe, getItemsSnapshot, () => []); }
export function useSettings(): Settings { return useSyncExternalStore(itemsStore.subscribe, getSettingsSnapshot, () => DEFAULT_SETTINGS); }
export function isOverdue(item: Item): boolean { if (item.status === "closed" || item.status === "complete") return false; return item.dueDate < new Date().toISOString().slice(0, 10); }
export function activeProjectConfig(s: Settings): ProjectConfig { return s.projectConfigs[s.activeProject] ?? DEFAULT_PROJECT_CONFIG(s.activeProject); }
