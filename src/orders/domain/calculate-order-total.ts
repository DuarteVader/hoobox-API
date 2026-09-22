import Decimal from 'decimal.js';

interface Item {
  quantity: number;
  price: number;
}

export function calculateOrderTotal(items: Item[]): string {
  const total = items.reduce(
    (current, item) =>
      current.plus(new Decimal(item.price).times(item.quantity)),
    new Decimal(0),
  );

  return total.toFixed(2);
}
