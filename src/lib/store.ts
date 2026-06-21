// TODO[production]: replace localStorage with proper database + object storage for photos.
// TODO[production]: enforce roles server-side. Current role gating is UI-only.
import { useSyncExternalStore } from "react";
import type { Item, ItemStatus, HistoryEntry, Closeout } from "./types";

const KEY = "cleanrun-iq:items:v1";
const SETTINGS_KEY = "cleanrun-iq:settings:v1";

export interface Settings {
  projects: string[];
  subcontractors: string[];
  activeProject: string;
}

const DEFAULT_SETTINGS: Settings = {
  projects: ["Riverside Towers — Stage 2"],
  subcontractors: ["Apex Painting", "Northline Electrical", "TrueLine Carpentry", "Sterling Tiling"],
  activeProject: "Riverside Towers — Stage 2",
};

const isBrowser = typeof window !== "undefined";

function loadItems(): Item[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedItems();
    return JSON.parse(raw) as Item[];
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

function seedItems(): Item[] {
  const now = new Date().toISOString();
  const seed: Item[] = [
    {
      id: crypto.randomUUID(),
      type: "defect",
      project: "Riverside Towers — Stage 2",
      building: "Tower A",
      level: "L08",
      unit: "08-04",
      room: "Living",
      trade: "Painting",
      subcontractor: "Apex Painting",
      priority: "high",
      dueDate: addDays(2),
      description: "Wall paint chipped near skirting along south wall.",
      photos: [],
      status: "issued",
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: "Created" }, { at: now, action: "Issued to Apex Painting" }],
    },
    {
      id: crypto.randomUUID(),
      type: "incomplete",
      project: "Riverside Towers — Stage 2",
      building: "Tower A",
      level: "L08",
      unit: "08-04",
      room: "Kitchen",
      trade: "Joinery",
      subcontractor: "TrueLine Carpentry",
      priority: "medium",
      dueDate: addDays(5),
      description: "Pantry door not installed.",
      photos: [],
      status: "open",
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: "Created" }],
    },
    {
      id: crypto.randomUUID(),
      type: "defect",
      project: "Riverside Towers — Stage 2",
      building: "Tower B",
      level: "L02",
      unit: "02-11",
      room: "Bathroom",
      trade: "Tiling",
      subcontractor: "Sterling Tiling",
      priority: "urgent",
      dueDate: addDays(-1),
      description: "Cracked tile under vanity.",
      photos: [],
      status: "ready_for_review",
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: "Created" }, { at: now, action: "Marked Ready for Review" }],
    },
  ];
  if (isBrowser) localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function addDays(d: number) {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString().slice(0, 10);
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function saveItems(items: Item[]) {
  if (isBrowser) localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

function saveSettings(s: Settings) {
  if (isBrowser) localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  emit();
}

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
  create(item: Omit<Item, "id" | "createdAt" | "updatedAt" | "status" | "history"> & { status?: ItemStatus }): Item {
    const now = new Date().toISOString();
    const newItem: Item = {
      ...item,
      id: crypto.randomUUID(),
      status: item.status ?? "open",
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: "Created" }],
    };
    const items = [newItem, ...loadItems()];
    saveItems(items);
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
    this.update(id, { status }, { at, action: `Status → ${status}`, note });
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
  return useSyncExternalStore(
    itemsStore.subscribe,
    () => itemsStore.getItems(),
    () => [],
  );
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    itemsStore.subscribe,
    () => itemsStore.getSettings(),
    () => DEFAULT_SETTINGS,
  );
}

export function isOverdue(item: Item): boolean {
  if (item.status === "closed" || item.status === "complete") return false;
  return item.dueDate < new Date().toISOString().slice(0, 10);
}
