// Shared helpers for the flexible product options (variants) system.
//
// A product can define any number of "option groups" (Color, Size, Storage…),
// each with a list of values. A value may carry its own photo and an additive
// price (`price_add`). Everything here is schemaless JSON on the product — no
// migration needed. Legacy products only have a flat `sizes` array; these
// helpers convert that on the fly so old products keep working untouched.

import imageCompression from 'browser-image-compression';
import { base44 } from '@/api/base44Client';

// Stable id generator (crypto.randomUUID isn't available in every runtime).
export function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

// The label a legacy product's single `sizes` group gets, matching the wording
// ProductDetail.jsx used before this feature: Color for phones, Size for
// clothing/shoes, Option otherwise.
export function legacyGroupName(category = '') {
  if (category === 'phones' || category.startsWith('electronics_phones')) return 'Color';
  if (category.startsWith('clothing') || category.startsWith('shoes')) return 'Size';
  return 'Option';
}

// Returns the product's option groups in the NEW format, converting the legacy
// `sizes` array on the fly. Never read `product.sizes` directly in new code —
// always go through this.
export function getOptionGroups(product) {
  if (Array.isArray(product?.option_groups) && product.option_groups.length > 0) {
    return product.option_groups;
  }
  if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
    return [{
      id: 'legacy',
      name: legacyGroupName(product.category),
      values: product.sizes.map(s => ({ id: String(s), label: String(s) })),
    }];
  }
  return [];
}

// True when at least one value in the group has a photo — render it as photo
// cards; otherwise as text chips.
export function groupHasImages(group) {
  return (group?.values || []).some(v => v?.image);
}

// { "Color": "White", "Size": "XL" } -> "Color: White · Size: XL"
export function formatSelection(options) {
  if (!options || typeof options !== 'object') return '';
  return Object.entries(options)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

// "White / XL" — compact form used in notifications and thumbnails.
export function shortSelection(options) {
  if (!options || typeof options !== 'object') return '';
  return Object.values(options).filter(v => v != null && v !== '').join(' / ');
}

// Finds the value object chosen for a given group, matching by label.
export function findValue(group, selections) {
  if (!group || !selections) return null;
  const label = selections[group.name];
  return (group.values || []).find(v => v.label === label) || null;
}

// Total unit price = product.price + sum of price_add of the selected values.
export function unitPrice(product, selections) {
  const base = Number(product?.price) || 0;
  if (!selections) return base;
  const groups = getOptionGroups(product);
  let add = 0;
  for (const g of groups) {
    const v = findValue(g, selections);
    if (v?.price_add) add += Number(v.price_add) || 0;
  }
  return base + add;
}

// The image to show for a given selection: the selected image-value's photo if
// any, else the product's cover image.
export function selectionImage(product, selections) {
  const groups = getOptionGroups(product);
  for (const g of groups) {
    const v = findValue(g, selections);
    if (v?.image) return v.image;
  }
  return product?.images?.[0] || '';
}

// Compress (if large) and upload a product/variant image, returning its URL.
// Extracted so the admin image gallery and the option-value picker share one
// code path instead of duplicating the compression settings.
export async function uploadProductImage(file) {
  const compressed = file.size > 500 * 1024
    ? await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true })
    : file;
  const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
  return file_url;
}
