const store = {};

export const cache = {
  set(key, data, ttlMinutes = 5) {
    store[key] = {
      data,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    };
  },

  get(key) {
    const entry = store[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete store[key];
      return null;
    }
    return entry.data;
  },

  clear(key) {
    delete store[key];
  },

  clearAll() {
    Object.keys(store).forEach(k => delete store[k]);
  }
};