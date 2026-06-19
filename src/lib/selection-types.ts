export const SELECTION_TYPE_VALUES = [
  "colour",
  "construction",
  "cabinetry",
  "appliance",
  "electrical",
  "tapware",
  "other",
] as const;

export type SelectionTypeValue = (typeof SELECTION_TYPE_VALUES)[number];

const SELECTION_TYPE_ALIASES: Record<string, SelectionTypeValue> = {
  color: "colour",
  fixture: "other",
  fixtures: "other",
};

export function normalizeSelectionType(value: string | null | undefined): SelectionTypeValue {
  const normalized = String(value ?? "").trim().toLowerCase();
  if ((SELECTION_TYPE_VALUES as readonly string[]).includes(normalized)) return normalized as SelectionTypeValue;
  return SELECTION_TYPE_ALIASES[normalized] ?? "colour";
}
