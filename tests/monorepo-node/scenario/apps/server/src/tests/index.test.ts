import { add, multiply } from '@monorepo/helpers';

describe('server', () => {
  describe('integration with helpers', () => {
    it('should use add from helpers', () => {
      const result = add(10, 5);
      expect(result).toBe(15);
    });

    it('should use multiply from helpers', () => {
      const result = multiply(10, 5);
      expect(result).toBe(50);
    });
  });
});
