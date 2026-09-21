export const CART_KEY = "studioQuoteSelections";
export const DOWNLOADS_KEY = "studioDownloads";

export function createCommerceStore(storage, projects) {
  const read = (key) => {
    try {
      const value = JSON.parse(storage.getItem(key) || "[]");
      if (!Array.isArray(value)) return [];
      const seen = new Set();
      return value.filter((item) => {
        if (!item || !projects.some((project) => project.id === item.id) || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).map((item) => ({ id: item.id, downloadedAt: item.downloadedAt, quantity: Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1))) }));
    } catch { return []; }
  };
  const write = (key, entries) => {
    storage.setItem(key, JSON.stringify(entries));
    return entries;
  };
  return {
    cart: () => read(CART_KEY),
    downloads: () => read(DOWNLOADS_KEY),
    add(project) {
      const entries = read(CART_KEY);
      if (entries.some((item) => item.id === project.id)) return entries;
      return write(CART_KEY, [...entries, { id: project.id, quantity: 1 }]);
    },
    quantity(id, quantity) {
      return write(CART_KEY, read(CART_KEY).map((item) => item.id === id
        ? { ...item, quantity: Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1))) } : item));
    },
    remove(key, id) { return write(key, read(key).filter((item) => item.id !== id)); },
    recordDownload(project) {
      return write(DOWNLOADS_KEY, [{ id: project.id, downloadedAt: new Date().toISOString() },
        ...read(DOWNLOADS_KEY).filter((item) => item.id !== project.id)]);
    },
  };
}
