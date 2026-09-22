import { RetryPolicy } from './retry-policy';

describe('RetryPolicy', () => {
  const policy = new RetryPolicy();

  it('should allow retry before the limit', () => {
    expect(policy.shouldRetry(0)).toBe(true);

    expect(policy.shouldRetry(2)).toBe(true);
  });

  it('should stop retrying after the limit', () => {
    expect(policy.shouldRetry(3)).toBe(false);
  });
});
