import { Injectable } from '@nestjs/common';

import { MAX_RETRIES } from '../../messaging/rabbitmq.constants';

@Injectable()
export class RetryPolicy {
  shouldRetry(currentRetryCount: number): boolean {
    return currentRetryCount < MAX_RETRIES;
  }
}
