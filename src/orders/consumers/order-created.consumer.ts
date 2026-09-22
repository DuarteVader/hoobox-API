import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';

import { Channel, ConsumeMessage } from 'amqplib';

import { RabbitMqService } from '../../messaging/rabbitmq.service';

import {
  ORDER_CREATED_QUEUE,
  ORDER_RETRY_ROUTING_KEY,
  ORDERS_RETRY_EXCHANGE,
} from '../../messaging/rabbitmq.constants';

import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderProcessorService } from '../order-processor.service';
import { RetryPolicy } from '../domain/retry-policy';

@Injectable()
export class OrderCreatedConsumer
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(OrderCreatedConsumer.name);

  private channel: Channel | undefined;

  constructor(
    private readonly rabbitMq: RabbitMqService,

    private readonly processor: OrderProcessorService,

    private readonly retryPolicy: RetryPolicy,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.channel = await this.rabbitMq.createConsumerChannel(5);

    await this.channel.consume(
      ORDER_CREATED_QUEUE,

      (message) => {
        if (message) {
          void this.handleMessage(message);
        }
      },

      {
        noAck: false,
      },
    );

    this.logger.log('Order consumer started');
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    if (!this.channel) {
      return;
    }

    let event: OrderCreatedEvent;

    try {
      event = JSON.parse(message.content.toString());
    } catch {
      this.logger.error('Invalid RabbitMQ message');

      /*
       * requeue=false
       *
       * Como a fila possui DLX,
       * Rabbit manda para DLQ.
       */
      this.channel.nack(message, false, false);

      return;
    }

    const retryCount = Number(
      message.properties.headers?.['x-retry-count'] ?? 0,
    );

    try {
      await this.processor.process(event.orderId, event.correlationId);

      this.channel.ack(message);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown processing error';

      this.logger.error({
        message: 'Order processing failed',
        orderId: event.orderId,
        retryCount,
        reason,
        correlationId: event.correlationId,
      });

      if (this.retryPolicy.shouldRetry(retryCount)) {
        try {
          await this.rabbitMq.publish(
            ORDERS_RETRY_EXCHANGE,
            ORDER_RETRY_ROUTING_KEY,
            event,
            {
              messageId: event.eventId,

              correlationId: event.correlationId,

              headers: {
                ...message.properties.headers,

                'x-retry-count': retryCount + 1,
              },
            },
          );

          /*
           * Só damos ACK na original
           * depois que a mensagem de
           * retry foi confirmada.
           */
          this.channel.ack(message);

          return;
        } catch (publishError) {
          this.logger.error('Unable to publish retry message');

          /*
           * Não conseguimos garantir
           * o retry.
           *
           * Recolocamos a mensagem
           * original na fila.
           */
          this.channel.nack(message, false, true);

          return;
        }
      }

      try {
        await this.processor.markTechnicalFailure(event.orderId, reason);

        /*
         * requeue=false
         *
         * A fila principal possui
         * dead-letter exchange.
         *
         * Então a mensagem irá
         * automaticamente para
         * orders.dlq.
         */
        this.channel.nack(message, false, false);
      } catch {
        /*
         * Se nem conseguimos salvar
         * FAILED, não podemos perder
         * a mensagem.
         */
        this.channel.nack(message, false, true);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
  }
}
