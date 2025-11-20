import { describe, it, expect } from 'vitest';
import { normalizePremiumAppDisplayMode } from '@/lib/premium-app';

describe('normalizePremiumAppDisplayMode', () => {
  it('returns cards when input is cards', () => {
    expect(normalizePremiumAppDisplayMode('cards')).toBe('cards');
  });

  it('falls back to list for undefined', () => {
    expect(normalizePremiumAppDisplayMode(undefined)).toBe('list');
  });

  it('falls back to list for unknown values', () => {
    expect(normalizePremiumAppDisplayMode('something')).toBe('list');
  });
});

