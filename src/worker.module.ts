import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from 'nestjs-pino';

import { getDatabaseConfig } from './config/database.config';

import { OrdersModule } from './orders/orders.module';

import { MessagingModule } from './messaging/messaging.module';

import { OrderCreatedConsumer } from './orders/consumers/order-created.consumer';

import { RetryPolicy } from './orders/domain/retry-policy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    LoggerModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (config: ConfigService) => getDatabaseConfig(config),
    }),

    MessagingModule,

    OrdersModule,
  ],

  providers: [OrderCreatedConsumer, RetryPolicy],
})
export class WorkerModule {}
