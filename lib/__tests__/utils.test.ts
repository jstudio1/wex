import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('ควร merge class names ได้', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ควรจัดการกับ undefined และ null', () => {
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar');
  });

  it('ควร merge tailwind classes ที่ conflict', () => {
    // tailwind-merge ควรเลือก class สุดท้าย
    expect(cn('px-2 py-1', 'px-4')).toContain('px-4');
    expect(cn('px-2 py-1', 'px-4')).toContain('py-1');
  });

  it('ควรจัดการกับ conditional classes', () => {
    const condition = true;
    expect(cn('foo', condition && 'bar')).toBe('foo bar');
    expect(cn('foo', !condition && 'bar')).toBe('foo');
  });

  it('ควรจัดการกับ array ของ classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('ควรจัดการกับ object ของ classes', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toContain('foo');
    expect(cn({ foo: true, bar: false, baz: true })).toContain('baz');
    expect(cn({ foo: true, bar: false, baz: true })).not.toContain('bar');
  });

  it('ควรจัดการกับ empty strings', () => {
    expect(cn('', 'foo', '')).toBe('foo');
  });

  it('ควรจัดการกับ mixed inputs', () => {
    const result = cn(
      'base-class',
      ['array-class-1', 'array-class-2'],
      { conditional: true, hidden: false },
      'string-class'
    );
    expect(result).toContain('base-class');
    expect(result).toContain('array-class-1');
    expect(result).toContain('array-class-2');
    expect(result).toContain('conditional');
    expect(result).toContain('string-class');
    expect(result).not.toContain('hidden');
  });
});

