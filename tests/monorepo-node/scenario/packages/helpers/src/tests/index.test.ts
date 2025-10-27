import { add, multiply } from '../index';

describe('helpers', () => {
  describe('add', () => {
    it('should add two numbers', () => {
      const a = 2;
      const b = 3;
      const result = add(a, b);
      expect(result).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-2, 3)).toBe(1);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply(2, 3)).toBe(6);
    });

    it('should handle zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });
});
