import { calculateOrderTotal } from './calculate-order-total';

describe('calculateOrderTotal', () => {
  it('should calculate the total correctly', () => {
    const result = calculateOrderTotal([
      {
        quantity: 2,
        price: 10,
      },

      {
        quantity: 1,
        price: 5,
      },
    ]);

    expect(result).toBe('25.00');
  });
});
