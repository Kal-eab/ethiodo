/**
 * Creator referral helpers.
 */

/** Parse and validate the stored creator ref from localStorage. Returns { code, product_id, link_id } or null. */
export function resolveCreatorRef() {
  try {
    const raw = localStorage.getItem('ethiodo_creator_ref');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.expires || Date.now() > data.expires) {
      localStorage.removeItem('ethiodo_creator_ref');
      return null;
    }
    if (!data.link_id || !data.product_id) {
      localStorage.removeItem('ethiodo_creator_ref');
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem('ethiodo_creator_ref');
    return null;
  }
}