import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import * as amqp from 'amqplib';

import { Options, Channel, ConfirmChannel, ChannelModel } from 'amqplib';

import {
  ORDER_CREATED_QUEUE,
  ORDER_CREATED_ROUTING_KEY,
  ORDER_DLQ,
  ORDER_FAILED_ROUTING_KEY,
  ORDER_RETRY_QUEUE,
  ORDER_RETRY_ROUTING_KEY,
  ORDERS_DLX,
  ORDERS_EXCHANGE,
  ORDERS_RETRY_EXCHANGE,
  RETRY_DELAY_MS,
} from './rabbitmq.constants';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);

  private connection: ChannelModel;

  private publishChannel: ConfirmChannel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = await amqp.connect(url);

    this.publishChannel = await this.connection.createConfirmChannel();

    await this.assertTopology(this.publishChannel);

    this.logger.log('RabbitMQ connected');
  }

  private async assertTopology(channel: Channel): Promise<void> {
    await channel.assertExchange(ORDERS_EXCHANGE, 'direct', {
      durable: true,
    });

    await channel.assertExchange(ORDERS_RETRY_EXCHANGE, 'direct', {
      durable: true,
    });

    await channel.assertExchange(ORDERS_DLX, 'direct', {
      durable: true,
    });

    await channel.assertQueue(ORDER_CREATED_QUEUE, {
      durable: true,

      arguments: {
        'x-dead-letter-exchange': ORDERS_DLX,

        'x-dead-letter-routing-key': ORDER_FAILED_ROUTING_KEY,
      },
    });

    await channel.bindQueue(
      ORDER_CREATED_QUEUE,
      ORDERS_EXCHANGE,
      ORDER_CREATED_ROUTING_KEY,
    );

    await channel.assertQueue(ORDER_RETRY_QUEUE, {
      durable: true,

      arguments: {
        'x-message-ttl': RETRY_DELAY_MS,

        'x-dead-letter-exchange': ORDERS_EXCHANGE,

        'x-dead-letter-routing-key': ORDER_CREATED_ROUTING_KEY,
      },
    });

    await channel.bindQueue(
      ORDER_RETRY_QUEUE,
      ORDERS_RETRY_EXCHANGE,
      ORDER_RETRY_ROUTING_KEY,
    );

    await channel.assertQueue(ORDER_DLQ, {
      durable: true,
    });

    await channel.bindQueue(ORDER_DLQ, ORDERS_DLX, ORDER_FAILED_ROUTING_KEY);
  }

  async createConsumerChannel(prefetch = 5): Promise<Channel> {
    const channel = await this.connection.createChannel();

    await this.assertTopology(channel);

    await channel.prefetch(prefetch);

    return channel;
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options: Options.Publish = {},
  ): Promise<void> {
    const content = Buffer.from(JSON.stringify(payload));

    await new Promise<void>((resolve, reject) => {
      this.publishChannel.publish(
        exchange,
        routingKey,
        content,
        {
          persistent: true,
          contentType: 'application/json',
          ...options,
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.publishChannel) {
      await this.publishChannel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }
}
