import { Injectable } from '@nestjs/common';

import { RabbitMqService } from '../../messaging/rabbitmq.service';

import {
  ORDERS_EXCHANGE,
  ORDER_CREATED_ROUTING_KEY,
} from '../../messaging/rabbitmq.constants';

import { OrderCreatedEvent } from './order-created.event';

@Injectable()
export class OrderEventsPublisher {
  constructor(private readonly rabbitMqService: RabbitMqService) {}

  publishCreated(event: OrderCreatedEvent): Promise<void> {
    return this.rabbitMqService.publish(
      ORDERS_EXCHANGE,
      ORDER_CREATED_ROUTING_KEY,
      event,
      {
        messageId: event.eventId,
        correlationId: event.correlationId,
        type: 'order.created',
      },
    );
  }
}
