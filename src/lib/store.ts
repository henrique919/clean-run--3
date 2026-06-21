// TODO[production]: replace localStorage with proper database + object storage for photos.
// TODO[production]: enforce roles server-side. Current role gating is UI-only.
import { useSyncExternalStore } from "react";
import type { Item, ItemStatus, HistoryEntry, Closeout, ItemType, Priority } from "./types";
import { CODE_PREFIX, nextCode } from "./types";

const KEY = "cleanrun-iq:items:v4";
const SETTINGS_KEY = "cleanrun-iq:settings:v3";

export interface Settings {
  projects: string[];
  subcontractors: string[];
  activeProject: string;
  company?: string;
}

const DEFAULT_SETTINGS: Settings = {
  projects: ["Jura Noosa", "Meta Street"],
  subcontractors: [
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
  ],
  activeProject: "Jura Noosa",
  company: "CleanRun Construction",
};

const isBrowser = typeof window !== "undefined";

/** Coerce any legacy priority value to the new high/urgent system. */
function normalisePriority(p: unknown): Priority {
  if (p === "urgent") return "urgent";
  return "high";
}

/** Ensure every loaded item has a code + normalised priority. */
function migrate(items: Item[]): Item[] {
  // Group by type so we can assign sequential codes per prefix.
  const counters: Record<ItemType, number> = { defect: 0, incomplete: 0, client: 0 };
  // Seed counters from any pre-existing valid codes.
  items.forEach((i) => {
    const prefix = CODE_PREFIX[i.type];
    if (i.code?.startsWith(`${prefix}-`)) {
      const n = parseInt(i.code.slice(prefix.length + 1), 10);
      if (Number.isFinite(n) && n > counters[i.type]) counters[i.type] = n;
    }
  });
  return items.map((i) => {
    let code = i.code;
    if (!code) {
      counters[i.type] += 1;
      code = `${CODE_PREFIX[i.type]}-${String(counters[i.type]).padStart(3, "0")}`;
    }
    return { ...i, code, priority: normalisePriority(i.priority) };
  });
}

function loadItems(): Item[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedItems();
    return migrate(JSON.parse(raw) as Item[]);
  } catch {
    return [];
  }
}

function loadSettings(): Settings {
  if (!isBrowser) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(raw) as Settings;
  } catch {
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
  project: string;
  building: string;
  level: string;
  unit: string;
  room: string;
  trade: string;
  subcontractor: string;
  priority: Priority;
  due: number;
  description: string;
  status: ItemStatus;
  closeout?: Closeout;
  hue: number;
  label: string;
  daysAgoIssued?: number;
  daysAgoInProgress?: number;
}

function seedItems(): Item[] {
  const now = new Date().toISOString();
  const specs: SeedSpec[] = [
    {
      type: "defect", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-304", room: "Ensuite",
      trade: "Tiling", subcontractor: "Sterling Tiling", priority: "urgent", due: -2,
      description: "Cracked floor tile under vanity. Replace and re-grout.",
      status: "issued", hue: 12, label: "Tile", daysAgoIssued: 2,
    },
    {
      type: "defect", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-304", room: "Living",
      trade: "Painting", subcontractor: "Coastline Painting", priority: "high", due: 1,
      description: "Paint chipping along south wall skirting. Sand, patch and re-coat.",
      status: "in_progress", hue: 200, label: "Paint", daysAgoIssued: 5, daysAgoInProgress: 3,
    },
    {
      type: "incomplete", project: "Jura Noosa", building: "Block A", level: "L03", unit: "A-305", room: "Kitchen",
      trade: "Joinery", subcontractor: "TrueLine Joinery", priority: "high", due: 4,
      description: "Pantry door not yet installed. Hardware on site.",
      status: "open", hue: 35, label: "Joinery",
    },
    {
      type: "defect", project: "Jura Noosa", building: "Block B", level: "L01", unit: "B-112", room: "Bathroom",
      trade: "Waterproofing", subcontractor: "AquaSeal Waterproofing", priority: "high", due: 0,
      description: "Visible moisture at shower hob junction. Inspect membrane.",
      status: "ready_for_review", hue: 220, label: "Waterproof", daysAgoIssued: 7, daysAgoInProgress: 5,
    },
    {
      type: "client", project: "Jura Noosa", building: "Block B", level: "L02", unit: "B-204", room: "Bedroom 2",
      trade: "Doors / Hardware", subcontractor: "TrueLine Joinery", priority: "high", due: 6,
      description: "Client raised: bedroom door rubs on jamb. Adjust and re-hang.",
      status: "issued", hue: 280, label: "Door", daysAgoIssued: 1,
    },
    {
      type: "defect", project: "Meta Street", building: "Tower 1", level: "L08", unit: "T1-803", room: "Kitchen",
      trade: "Electrical", subcontractor: "Northline Electrical", priority: "urgent", due: -1,
      description: "Powerpoint above benchtop not energised. Test circuit.",
      // Long-running in_progress to demonstrate escalation in reports.
      status: "in_progress", hue: 50, label: "Power", daysAgoIssued: 14, daysAgoInProgress: 12,
    },
    {
      type: "incomplete", project: "Meta Street", building: "Tower 1", level: "L08", unit: "T1-803", room: "Balcony",
      trade: "Caulking / Sealant", subcontractor: "AquaSeal Waterproofing", priority: "high", due: 8,
      description: "Perimeter sealant to balcony slider outstanding.",
      status: "open", hue: 160, label: "Seal",
    },
    {
      type: "defect", project: "Meta Street", building: "Tower 1", level: "L05", unit: "T1-502", room: "Hallway",
      trade: "Plastering", subcontractor: "Apex Plastering", priority: "high", due: 3,
      description: "Cornice gap at junction. Re-set and sand.",
      status: "ready_for_review", hue: 110, label: "Plaster", daysAgoIssued: 4, daysAgoInProgress: 2,
    },
    {
      type: "defect", project: "Meta Street", building: "Tower 1", level: "L02", unit: "T1-201", room: "Living",
      trade: "Flooring", subcontractor: "Premier Flooring", priority: "high", due: -5,
      description: "Lifted vinyl plank near entry. Re-adhere or replace.",
      status: "closed", hue: 25, label: "Floor",
      closeout: {
        signedBy: "Sam Whitlock", role: "Site Manager",
        signedAt: new Date(Date.now() - 86400000).toISOString(),
        note: "Plank replaced, area re-cleaned. Approved.",
      },
    },
    {
      type: "client", project: "Meta Street", building: "Tower 1", level: "L10", unit: "T1-1004", room: "Ensuite",
      trade: "Cleaning", subcontractor: "Endeavour Cleaning", priority: "high", due: 2,
      description: "Client raised: grout haze on shower wall tiles. Re-clean.",
      status: "open", hue: 190, label: "Clean",
    },
  ];

  // Per-type counters so codes are stable (DEF-001, DEF-002, INC-001 …).
  const counters: Record<ItemType, number> = { defect: 0, incomplete: 0, client: 0 };

  const seed: Item[] = specs.map((s, idx) => {
    counters[s.type] += 1;
    const code = `${CODE_PREFIX[s.type]}-${String(counters[s.type]).padStart(3, "0")}`;
    const photos = [placeholderPhoto(s.label, s.hue)];
    const history: HistoryEntry[] = [{ at: now, action: "Created" }];
    const issuedAt = s.daysAgoIssued != null
      ? new Date(Date.now() - s.daysAgoIssued * 86400000).toISOString()
      : undefined;
    const inProgressAt = s.daysAgoInProgress != null
      ? new Date(Date.now() - s.daysAgoInProgress * 86400000).toISOString()
      : undefined;
    if (["issued", "in_progress", "ready_for_review", "under_inspection", "closed"].includes(s.status)) {
      history.push({ at: issuedAt ?? now, action: `Issued to ${s.subcontractor}` });
    }
    if (["in_progress", "ready_for_review", "under_inspection", "closed"].includes(s.status)) {
      history.push({ at: inProgressAt ?? now, action: "Subcontractor marked in progress" });
    }
    if (["ready_for_review", "under_inspection", "closed"].includes(s.status)) {
      history.push({ at: now, action: "Marked ready for review" });
    }
    if (s.status === "closed" && s.closeout) {
      history.push({ at: s.closeout.signedAt, action: "Closed with evidence", by: s.closeout.signedBy });
    }
    return {
      id: `seed-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      code,
      type: s.type, project: s.project, building: s.building, level: s.level,
      unit: s.unit, room: s.room, trade: s.trade, subcontractor: s.subcontractor,
      priority: s.priority, dueDate: addDays(s.due), description: s.description,
      photos, status: s.status, createdAt: now, updatedAt: now, history,
      closeout: s.closeout, issuedAt, inProgressAt,
    };
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

function emit() {
  itemsCache = null;
  settingsCache = null;
  listeners.forEach((l) => l());
}

function saveItems(items: Item[]) {
  if (isBrowser) localStorage.setItem(KEY, JSON.stringify(items));
  itemsCache = items;
  settingsCache = null;
  listeners.forEach((l) => l());
}

function saveSettings(s: Settings) {
  if (isBrowser) localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  settingsCache = s;
  listeners.forEach((l) => l());
}

void emit;

export const itemsStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getItems(): Item[] {
    return loadItems();
  },
  getSettings(): Settings {
    return loadSettings();
  },
  create(
    item: Omit<Item, "id" | "code" | "createdAt" | "updatedAt" | "status" | "history"> & { status?: ItemStatus },
  ): Item {
    const now = new Date().toISOString();
    const existing = loadItems();
    const code = nextCode(existing, item.type);
    const newItem: Item = {
      ...item,
      id: crypto.randomUUID(),
      code,
      status: item.status ?? "open",
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: `Created (${code})` }],
    };
    saveItems([newItem, ...existing]);
    return newItem;
  },
  update(id: string, patch: Partial<Item>, historyEntry?: HistoryEntry) {
    const items = loadItems().map((it) => {
      if (it.id !== id) return it;
      const updated: Item = {
        ...it,
        ...patch,
        updatedAt: new Date().toISOString(),
        history: historyEntry ? [...it.history, historyEntry] : it.history,
      };
      return updated;
    });
    saveItems(items);
  },
  setStatus(id: string, status: ItemStatus, note?: string) {
    const at = new Date().toISOString();
    // Stamp issuedAt / inProgressAt so escalation maths can run later.
    const extra: Partial<Item> = {};
    if (status === "issued") extra.issuedAt = at;
    if (status === "in_progress") extra.inProgressAt = at;
    this.update(id, { status, ...extra }, { at, action: `Status → ${status}`, note });
  },
  close(id: string, closeout: Closeout) {
    const at = new Date().toISOString();
    this.update(
      id,
      { status: "closed", closeout },
      { at, action: "Closed", by: closeout.signedBy, note: closeout.note },
    );
  },
  remove(id: string) {
    saveItems(loadItems().filter((it) => it.id !== id));
  },
  setSettings(s: Settings) {
    saveSettings(s);
  },
  setActiveProject(name: string) {
    const s = loadSettings();
    saveSettings({ ...s, activeProject: name });
  },
  addSubcontractor(name: string) {
    const s = loadSettings();
    if (!s.subcontractors.includes(name)) {
      saveSettings({ ...s, subcontractors: [...s.subcontractors, name] });
    }
  },
  addProject(name: string) {
    const s = loadSettings();
    if (!s.projects.includes(name)) {
      saveSettings({ ...s, projects: [...s.projects, name] });
    }
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
