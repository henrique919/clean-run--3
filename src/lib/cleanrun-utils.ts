import type { Settings } from "./store";
import type { Item, ItemType, ProjectConfig } from "./types";
import { TYPE_LABEL } from "./types";

export function projectConfigFor(settings: Settings, projectName: string): ProjectConfig {
  return settings.projectConfigs[projectName] ?? defaultProjectConfig(projectName);
}

export function subcontractorEmail(settings: Settings, subName: string): string {
  return settings.subProfiles[subName]?.email?.trim() ?? "";
}

export function itemTypeLabel(type: ItemType): string {
  return TYPE_LABEL[type] ?? "Item";
}

export function formatLocation(item: Pick<Item, "building" | "level" | "unit" | "room">): string {
  return [item.building, item.level, item.unit, item.room].filter(Boolean).join(" / ") || "Location not set";
}

export function buildIssueEmail(item: Item, note?: string): { subject: string; body: string } {
  const subject = `[CleanRun IQ] ${item.code} ${itemTypeLabel(item.type)} — ${item.building} ${item.unit} ${item.room}`;
  const itemUrl = typeof window !== "undefined" ? `${window.location.origin}/items/${item.id}` : `/items/${item.id}`;
  const body = [
    `Project: ${item.project}`,
    `Item code: ${item.code}`,
    `Type: ${itemTypeLabel(item.type)}`,
    `Location: ${formatLocation(item)}`,
    `Trade: ${item.trade || "—"}`,
    `Priority: ${item.priority}`,
    `Due date: ${item.dueDate}`,
    item.raisedBy ? `Raised by: ${item.raisedBy}` : "",
    "",
    "Description:",
    item.description,
    note ? `\nAdditional instruction:\n${note}` : "",
    "",
    `Link to item: ${itemUrl}`,
    "",
    "Instruction: Please upload rectification evidence and mark ready for review once complete.",
    "",
    "— Issued via CleanRun IQ",
  ].filter(Boolean).join("\n");
  return { subject, body };
}

export function openMailto(email: string, subject: string, body: string) {
  if (typeof window === "undefined") return;
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function defaultProjectConfig(name: string): ProjectConfig {
  return {
    name,
    address: "",
    buildings: [],
    levels: [],
    units: [],
    rooms: [],
    defaultDueDays: 7,
  };
}
