// Lightweight plans store: upload a level plan image and drop pins linked to items.
// TODO[production]: object storage for plan images; persisted server-side; ACLs.
import { useSyncExternalStore } from "react";
import { makeId } from "./types";

const KEY = "cleanrun-iq:plans:v1";
const isBrowser = typeof window !== "undefined";

export interface PlanPin {
  id: string;
  /** Normalised 0..1 coordinates relative to the image. */
  x: number;
  y: number;
  itemId?: string;
  label?: string;
}

export interface Plan {
  id: string;
  project: string;
  building: string;
  level: string;
  name: string;
  image: string; // data URL
  pins: PlanPin[];
  createdAt: string;
}

function load(): Plan[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is Plan =>
      !!p && typeof p === "object" && typeof (p as Plan).id === "string" && typeof (p as Plan).image === "string",
    );
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
let cache: Plan[] | null = null;
function snapshot(): Plan[] {
  if (cache === null) cache = load();
  return cache;
}
function save(next: Plan[]) {
  if (isBrowser) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch (e) { console.warn("Plan save failed (storage full?)", e); }
  }
  cache = next;
  listeners.forEach((l) => l());
}

export const plansStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
  list(): Plan[] { return load(); },
  add(p: Omit<Plan, "id" | "pins" | "createdAt">): Plan {
    const plan: Plan = { ...p, id: makeId(), pins: [], createdAt: new Date().toISOString() };
    save([plan, ...load()]);
    return plan;
  },
  remove(id: string) { save(load().filter((p) => p.id !== id)); },
  rename(id: string, name: string) {
    save(load().map((p) => (p.id === id ? { ...p, name } : p)));
  },
  addPin(planId: string, pin: Omit<PlanPin, "id">): PlanPin {
    const created: PlanPin = { id: makeId(), ...pin };
    save(load().map((p) => (p.id === planId ? { ...p, pins: [...p.pins, created] } : p)));
    return created;
  },
  updatePin(planId: string, pinId: string, patch: Partial<PlanPin>) {
    save(load().map((p) =>
      p.id === planId ? { ...p, pins: p.pins.map((pn) => pn.id === pinId ? { ...pn, ...patch } : pn) } : p,
    ));
  },
  removePin(planId: string, pinId: string) {
    save(load().map((p) => (p.id === planId ? { ...p, pins: p.pins.filter((pn) => pn.id !== pinId) } : p)));
  },
};

export function usePlans(): Plan[] {
  return useSyncExternalStore(plansStore.subscribe, snapshot, () => []);
}
