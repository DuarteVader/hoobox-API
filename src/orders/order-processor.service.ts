import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { DataSource } from 'typeorm';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';

import { OrderStatus } from './enums/order-status.enum';

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

@Injectable()
export class OrderProcessorService {
  private readonly logger = new Logger(OrderProcessorService.name);

  constructor(
    private readonly dataSource: DataSource,

    private readonly configService: ConfigService,
  ) {}

  async process(orderId: string, correlationId: string): Promise<void> {
    const delay = Number(
      this.configService.get('ORDER_PROCESSING_DELAY_MS', '1500'),
    );

    await sleep(delay);

    await this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);

      /*
       * Lock do pedido.
       *
       * Enquanto esta transaction
       * estiver aberta, outro worker
       * tentando processar o mesmo
       * pedido terá que esperar.
       */
      const order = await orderRepository
        .createQueryBuilder('order')
        .where('order.id = :orderId', {
          orderId,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      /*
       * Idempotência.
       */
      if (order.status !== OrderStatus.PENDING) {
        this.logger.log({
          message: 'Order already processed',
          orderId,
          status: order.status,
          correlationId,
        });

        return;
      }

      /*
       * Falha proposital exigida
       * pelo case.
       */
      if (order.customerName.toLowerCase().includes('fail')) {
        throw new Error('Simulated processing failure');
      }

      const items = await manager.getRepository(OrderItem).find({
        where: {
          orderId,
        },
      });

      /*
       * Agrupa produtos repetidos.
       *
       * Ex:
       * Mouse x3
       * Mouse x3
       *
       * vira:
       *
       * Mouse x6
       */
      const requestedQuantity = new Map<string, number>();

      for (const item of items) {
        requestedQuantity.set(
          item.productId,

          (requestedQuantity.get(item.productId) ?? 0) + item.quantity,
        );
      }

      /*
       * Ordenar IDs ajuda a reduzir
       * possibilidade de deadlocks
       * quando pedidos bloqueiam
       * vários produtos.
       */
      const productIds = [...requestedQuantity.keys()].sort();

      const products = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id IN (:...ids)', {
          ids: productIds,
        })
        .orderBy('product.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      if (products.length !== productIds.length) {
        throw new Error('One or more products were not found');
      }

      /*
       * Primeiro verifica TODOS.
       *
       * Só depois decrementa.
       */
      for (const product of products) {
        const quantity = requestedQuantity.get(product.id)!;

        if (product.stock < quantity) {
          order.status = OrderStatus.FAILED;

          order.failureReason = 'estoque insuficiente';

          await orderRepository.save(order);

          this.logger.warn({
            message: 'Insufficient stock',
            orderId,
            productId: product.id,
            correlationId,
          });

          return;
        }
      }

      /*
       * Todos têm estoque.
       *
       * Agora podemos reservar.
       */
      for (const product of products) {
        const quantity = requestedQuantity.get(product.id)!;

        product.stock -= quantity;
      }

      await manager.getRepository(Product).save(products);

      order.status = OrderStatus.PROCESSED;

      order.failureReason = null;

      order.processedAt = new Date();

      await orderRepository.save(order);

      this.logger.log({
        message: 'Order processed',
        orderId,
        correlationId,
      });
    });
  }

  async markTechnicalFailure(orderId: string, reason: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Order);

      const order = await repository
        .createQueryBuilder('order')
        .where('order.id = :orderId', {
          orderId,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!order) {
        return;
      }

      if (order.status !== OrderStatus.PENDING) {
        return;
      }

      order.status = OrderStatus.FAILED;

      order.failureReason = reason.substring(0, 255);

      await repository.save(order);
    });
  }
}
