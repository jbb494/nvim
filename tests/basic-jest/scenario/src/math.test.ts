import { describe, it, expect } from "@jest/globals";
import { add, subtract, multiply, divide } from "./math";

describe("Math functions", () => {
  describe("add", () => {
    it("should add two positive numbers", () => {
      const a = 2;
      const b = 3;
      // #First breakpoint
      expect(add(a, b)).toBe(5);
    });

    it("should add negative numbers", () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it("should add zero", () => {
      expect(add(0, 5)).toBe(5);
    });
  });

  describe("subtract", () => {
    it("should subtract two numbers", () => {
      expect(subtract(10, 5)).toBe(5);
    });

    it("should handle negative results", () => {
      expect(subtract(5, 10)).toBe(-5);
    });
  });

  describe("multiply", () => {
    it("should multiply two positive numbers", () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it("should multiply by zero", () => {
      expect(multiply(5, 0)).toBe(0);
    });

    it("should multiply negative numbers", () => {
      expect(multiply(-2, 3)).toBe(-6);
    });
  });

  describe("divide", () => {
    it("should divide two numbers", () => {
      expect(divide(10, 2)).toBe(5);
    });

    it("should throw error on division by zero", () => {
      expect(() => divide(10, 0)).toThrow("Division by zero");
    });

    it("should handle decimal division", () => {
      expect(divide(7, 2)).toBe(3.5);
    });
  });
});
