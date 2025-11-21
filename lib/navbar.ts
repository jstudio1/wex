const NAVBAR_ORDER_WITH_HOME = ['home', 'premiumApp', 'social', 'products', 'mtopup', 'cashcard', 'categories', 'blog', 'contact'] as const;
const NAVBAR_STORAGE_KEYS = NAVBAR_ORDER_WITH_HOME.filter((key) => key !== 'home');

type NavbarOrderKey = typeof NAVBAR_ORDER_WITH_HOME[number];
type NavbarStorageKey = typeof NAVBAR_STORAGE_KEYS[number];

const isStorageKey = (value: unknown): value is NavbarStorageKey => {
  return typeof value === 'string' && (NAVBAR_STORAGE_KEYS as readonly string[]).includes(value);
};

export function normalizeNavbarOrder(order?: string[]): NavbarOrderKey[] {
  const filtered = Array.isArray(order) ? order.filter(isStorageKey) : [];
  const unique = Array.from(new Set(filtered));
  const result = [...unique];

  NAVBAR_STORAGE_KEYS.forEach((key, index) => {
    if (result.includes(key)) return;

    // find previous default key that already exists to insert after
    for (let i = index - 1; i >= 0; i--) {
      const prevKey = NAVBAR_STORAGE_KEYS[i];
      const prevIndex = result.indexOf(prevKey);
      if (prevIndex !== -1) {
        result.splice(prevIndex + 1, 0, key);
        return;
      }
    }

    // otherwise insert at beginning
    result.unshift(key);
  });

  return ['home', ...result];
}

export function extractStorageNavbarOrder(order?: string[]): NavbarStorageKey[] {
  if (!Array.isArray(order)) return [...NAVBAR_STORAGE_KEYS];
  const filtered = order.filter(isStorageKey);
  const unique = Array.from(new Set(filtered));

  NAVBAR_STORAGE_KEYS.forEach((key, index) => {
    if (unique.includes(key)) return;

    for (let i = index - 1; i >= 0; i--) {
      const prevKey = NAVBAR_STORAGE_KEYS[i];
      const prevIndex = unique.indexOf(prevKey);
      if (prevIndex !== -1) {
        unique.splice(prevIndex + 1, 0, key);
        return;
      }
    }

    unique.unshift(key);
  });

  return unique;
}

export { NAVBAR_ORDER_WITH_HOME, NAVBAR_STORAGE_KEYS };

