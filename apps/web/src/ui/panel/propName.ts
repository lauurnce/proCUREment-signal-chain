import type { Accessory } from "@hq/shared";

/** Plain names for prop kinds. Anything else reads from its kind, like "Snack shelf". */
const KIND_NAMES: Record<string, string> = {
  "plant-tall": "Tall plant",
  "delivery-truck": "Delivery truck",
};

/** A prop's name for the Office tab: its label, or its kind in plain words. */
export function propName(prop: Accessory): string {
  if (prop.label) return prop.label;
  const name = KIND_NAMES[prop.kind] ?? prop.kind.replace(/-/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}
