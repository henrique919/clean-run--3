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
    if (!raw) return seedPlans();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return seedPlans();
    return parsed.filter((p): p is Plan =>
      !!p && typeof p === "object" && typeof (p as Plan).id === "string" && typeof (p as Plan).image === "string",
    );
  } catch {
    return seedPlans();
  }
}

function seedPlans(): Plan[] {
  const seed: Plan[] = [{
    id: "demo-plan-jura-a-l03",
    project: "Jura Noosa",
    building: "Block A",
    level: "L03",
    name: "Demo Level Plan — Block A / L03",
    image: placeholderPlan(),
    createdAt: new Date().toISOString(),
    pins: [
      { id: "demo-pin-def-001", x: 0.74, y: 0.34, itemId: "demo-def-open-jura", label: "DEF-001" },
      { id: "demo-pin-def-004", x: 0.35, y: 0.46, itemId: "demo-def-ready-jura", label: "DEF-004" },
      { id: "demo-pin-def-007", x: 0.71, y: 0.28, itemId: "demo-def-closed-jura", label: "DEF-007" },
      { id: "demo-pin-inc-001", x: 0.31, y: 0.39, itemId: "demo-inc-open-jura", label: "INC-001" },
    ],
  }];
  saveRaw(seed);
  return seed;
}

function placeholderPlan(): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 560'><rect width='900' height='560' fill='#f8fafc'/><rect x='70' y='70' width='760' height='420' rx='10' fill='#fff' stroke='#0f172a' stroke-width='6'/><path d='M450 70v420M70 280h760' stroke='#94a3b8' stroke-width='4'/><rect x='110' y='110' width='285' height='130' fill='#e2e8f0' stroke='#64748b'/><text x='252' y='180' text-anchor='middle' font-family='Inter,Arial' font-size='28' fill='#334155'>A-305 Kitchen</text><rect x='505' y='105' width='275' height='150' fill='#e2e8f0' stroke='#64748b'/><text x='642' y='170' text-anchor='middle' font-family='Inter,Arial' font-size='28' fill='#334155'>A-304 Ensuite</text><rect x='110' y='320' width='285' height='120' fill='#f1f5f9' stroke='#94a3b8'/><text x='252' y='385' text-anchor='middle' font-family='Inter,Arial' font-size='24' fill='#475569'>Living</text><rect x='505' y='320' width='275' height='120' fill='#f1f5f9' stroke='#94a3b8'/><text x='642' y='385' text-anchor='middle' font-family='Inter,Arial' font-size='24' fill='#475569'>Bedroom</text><text x='450' y='535' text-anchor='middle' font-family='Inter,Arial' font-size='18' fill='#64748b'>Demo plan for pin workflow testing only</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const listeners = new Set<() => void>();
let cache: Plan[] | null = null;
function snapshot(): Plan[] {
  if (cache === null) cache = load();
  return cache;
}
function saveRaw(next: Plan[]) {
  if (isBrowser) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch (e) { console.warn("Plan save failed (storage full?)", e); }
  }
}
function save(next: Plan[]) {
  saveRaw(next);
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
