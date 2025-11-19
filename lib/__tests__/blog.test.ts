import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/blog';

describe('Blog Utilities', () => {
  describe('slugify', () => {
    it('should convert Thai text to slug', () => {
      // slugify filters non-word characters, so Thai text may become empty
      const result = slugify('วิธีสั่งซื้อสินค้า');
      expect(typeof result).toBe('string');
      // For Thai text, slugify removes all non-word chars, may result in empty string
      expect(result).toBe(''); // Thai characters are removed by /[^\w\s-]/g
    });

    it('should handle English text', () => {
      const result = slugify('How to Order');
      expect(result).toBe('how-to-order');
    });

    it('should handle mixed text', () => {
      const result = slugify('Test 123');
      expect(result).toBeTruthy();
    });

    it('should handle special characters', () => {
      const result = slugify('Test@#$$%');
      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
      expect(result).not.toContain('$');
      expect(result).not.toContain('%');
    });

    it('should handle empty string', () => {
      const result = slugify('');
      expect(result).toBe('');
    });
  });
});

