import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

import { ProductsModule } from '../products/products.module';
import { MessagingModule } from '../messaging/messaging.module';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderProcessorService } from './order-processor.service';
import { OrderEventsPublisher } from './events/order-events.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),

    ProductsModule,

    MessagingModule,
  ],

  controllers: [OrdersController],

  providers: [OrdersService, OrderProcessorService, OrderEventsPublisher],

  exports: [OrdersService, OrderProcessorService],
})
export class OrdersModule {}
