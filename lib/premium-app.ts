export type PremiumAppDisplayMode = 'list' | 'cards';

export function normalizePremiumAppDisplayMode(mode?: string | null): PremiumAppDisplayMode {
  return mode === 'cards' ? 'cards' : 'list';
}

