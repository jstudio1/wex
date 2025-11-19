import { describe, expect, it } from 'vitest';
import { generateDestRef, parseOutputString, toWepayState } from './wepay';

describe('toWepayState', () => {
  it('returns completed state for status 2', () => {
    expect(toWepayState('2')).toEqual({ state: 'completed', isTerminal: true });
  });

  it('returns failed state for status 4', () => {
    expect(toWepayState(4)).toEqual({ state: 'failed', isTerminal: true });
  });

  it('returns processing for unknown statuses', () => {
    expect(toWepayState('unknown')).toEqual({ state: 'processing', isTerminal: false });
    expect(toWepayState(undefined)).toEqual({ state: 'processing', isTerminal: false });
  });
});

describe('generateDestRef', () => {
  it('creates uppercase refs with max length 20 and prefix', () => {
    const ref = generateDestRef('GT');
    expect(ref.startsWith('GT')).toBe(true);
    expect(ref).toMatch(/^[A-Z0-9]+$/);
    expect(ref.length).toBeLessThanOrEqual(20);
  });

  it('uses default prefix when not provided', () => {
    const ref = generateDestRef();
    expect(ref.startsWith('GT')).toBe(true);
  });
});

describe('parseOutputString', () => {
  it('parses querystring like output into object map', () => {
    const output = 'transaction_id=123&status=2&dest_ref=ABC';
    const parsed = parseOutputString(output);
    expect(parsed.transaction_id).toBe('123');
    expect(parsed.status).toBe('2');
    expect(parsed.dest_ref).toBe('ABC');
  });

  it('handles repeated keys by returning last value', () => {
    const parsed = parseOutputString('status=2&status=3');
    expect(parsed.status).toBe('3');
  });
});


