export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

/**
 * Function with multiple variables for debugging/breakpoint testing
 * This function is designed to have a clear breakpoint location
 * where multiple variables are in scope for inspection
 */
export function calculateWithMultipleVariables(x: number, y: number): object {
  const numberVar = 42;
  const stringVar = 'hello';
  const boolVar = true;
  const arrayVar = [1, 2, 3, 4, 5];
  const objectVar = { a: 1, b: 2, c: 3 };

  // Breakpoint location - all variables should be inspectable here
  const sum = x + y;
  const product = x * y;
  const difference = x - y;

  return {
    numberVar,
    stringVar,
    boolVar,
    arrayVar,
    objectVar,
    sum,
    product,
    difference,
  };
}
