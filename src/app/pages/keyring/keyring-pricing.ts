/* =========================================================
   Keyring pricing — edit these values to change the quote.
   ========================================================= */

export type KeyringKind = '3d' | 'laser';

export interface KeyringModel {
  id: string;
  /** Which "Design Type" preset list this model appears under */
  kind: KeyringKind;
  name: string;
  /** Cost per keyring in pounds, before discount */
  baseCost: number;
  maxCharacters: number;
}

export const FLAT_SERVICE_CHARGE = 5.0; // £ per order

export const DESIGN_TYPES = [
  { id: 'std3d', label: 'Standard 3D Print Presets', kind: '3d' },
  { id: 'stdlaser', label: 'Standard Laser Cut Presets', kind: 'laser' },
  { id: 'custom', label: 'Tailor-Made Custom Design', kind: null },
] as const satisfies readonly { id: string; label: string; kind: KeyringKind | null }[];

export type DesignTypeId = (typeof DESIGN_TYPES)[number]['id'];

export const KEYRING_MODELS: KeyringModel[] = [
  { id: 'std3dround', kind: '3d', name: '【3D】Standard Round', baseCost: 0.13, maxCharacters: 20 },
  { id: 'mc_pickaxe', kind: '3d', name: '【3D】MC Pixelated Pickaxe', baseCost: 0.18, maxCharacters: 15 },
  { id: 'colossus_bear', kind: '3d', name: '【3D】Colossus Bear (currently not available)', baseCost: 0.2, maxCharacters: 10 },
  { id: 'stdlasercircle', kind: 'laser', name: '【Laser】Standard Circle with Engraved Logo & Text', baseCost: 0.08, maxCharacters: 20 },
  { id: 'stdlaserhex', kind: 'laser', name: '【Laser】Standard Hexagon with Engraved Logo & Text', baseCost: 0.08, maxCharacters: 25 },
];

/** Applied to the keyring subtotal. Tiers are checked in order; the first whose maxQuantity covers the order wins. */
export const DISCOUNT_TIERS = [
  { maxQuantity: 10, discount: 0 }, //    1–10 keyrings
  { maxQuantity: 25, discount: 0.05 }, // 11–25 keyrings
  { maxQuantity: 50, discount: 0.1 }, //  26–50 keyrings
  { maxQuantity: Infinity, discount: 0.15 }, // 51+
];

export const COLOURS = [
  'Jade White (10100)',
  'Black (10101)',
  'Pumpkin Orange (10301)',
  'Sunflower Yellow (10402)',
  'Mistletoe Green (10502)',
  'Purple (10700)',
  'Matte Scarlet Red (11200)',
  'Matte Latte Brown (11800)',
  'Translucent Aqua Blue (13612)',
  'Other (Contact Us)',
];

export const LARGE_ORDER_NOTE =
  "Large orders (50+ keyrings) may involve outsourcing, which could affect final pricing and turnaround. We'll confirm with you.";

export interface KeyringQuote {
  quantity: number;
  discount: number;
  /** Keyrings only, after discount */
  subtotal: number;
  /** Subtotal plus the flat service charge */
  total: number;
  /** Per keyring, excluding the service charge */
  perKeyring: number;
}

export function modelsFor(kind: KeyringKind): KeyringModel[] {
  return KEYRING_MODELS.filter((m) => m.kind === kind);
}

export function quoteKeyrings(model: KeyringModel, rawQuantity: number): KeyringQuote {
  const quantity = Number.isFinite(rawQuantity) && rawQuantity >= 1 ? Math.floor(rawQuantity) : 1;
  const discount = DISCOUNT_TIERS.find((tier) => quantity <= tier.maxQuantity)?.discount ?? 0;
  const subtotal = model.baseCost * quantity * (1 - discount);
  return {
    quantity,
    discount,
    subtotal,
    total: subtotal + FLAT_SERVICE_CHARGE,
    perKeyring: subtotal / quantity,
  };
}

export function formatGbp(amount: number): string {
  return `£${amount.toFixed(2)}`;
}
