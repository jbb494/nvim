import { add, multiply } from '@monorepo/helpers';

function main() {
  const sum = add(10, 5);
  const product = multiply(10, 5);

  console.log(`Sum: ${sum}`);
  console.log(`Product: ${product}`);
}

main();
