import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, In, Repository } from 'typeorm';

import { randomUUID } from 'crypto';

import Decimal from 'decimal.js';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';

import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

import { calculateOrderTotal } from './domain/calculate-order-total';
import { OrderStatus } from './enums/order-status.enum';

import { OrderCreatedEvent } from './events/order-created.event';
import { OrderEventsPublisher } from './events/order-events.publisher';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly dataSource: DataSource,

    private readonly eventsPublisher: OrderEventsPublisher,
  ) {}

  async create(dto: CreateOrderDto, correlationId: string): Promise<Order> {
    const total = calculateOrderTotal(dto.items);

    const order = await this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);

      const names = [...new Set(dto.items.map((item) => item.productName))];

      const products = await productRepository.find({
        where: {
          name: In(names),
        },
      });

      const productsByName = new Map(
        products.map((product) => [product.name, product]),
      );

      const missing = names.filter((name) => !productsByName.has(name));

      if (missing.length) {
        throw new BadRequestException(
          `Produtos não encontrados: ${missing.join(', ')}`,
        );
      }

      const orderRepository = manager.getRepository(Order);

      const itemRepository = manager.getRepository(OrderItem);

      const createdOrder = await orderRepository.save(
        orderRepository.create({
          customerName: dto.customerName,

          total,

          status: OrderStatus.PENDING,

          failureReason: null,

          processedAt: null,
        }),
      );

      const items = dto.items.map((item) => {
        const product = productsByName.get(item.productName)!;

        return itemRepository.create({
          orderId: createdOrder.id,

          productId: product.id,

          productName: item.productName,

          quantity: item.quantity,

          unitPrice: new Decimal(item.price).toFixed(2),

          subtotal: new Decimal(item.price).times(item.quantity).toFixed(2),
        });
      });

      await itemRepository.save(items);

      return createdOrder;
    });

    const event = new OrderCreatedEvent(
      randomUUID(),
      order.id,
      correlationId,
      new Date().toISOString(),
    );

    await this.eventsPublisher.publishCreated(event);

    this.logger.log({
      message: 'Order created and event published',
      orderId: order.id,
      correlationId,
    });

    return this.findOne(order.id);
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: {
        id,
      },

      relations: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    return order;
  }

  async findAll(query: ListOrdersQueryDto) {
    const { page, limit } = query;

    const [data, total] = await this.orderRepository.findAndCount({
      relations: {
        items: true,
      },

      skip: (page - 1) * limit,

      take: limit,

      order: {
        createdAt: 'DESC',
      },
    });

    return {
      data,

      meta: {
        page,
        limit,
        total,

        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reprocess(id: string, correlationId: string): Promise<Order> {
    const order = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Order);

      const currentOrder = await repository
        .createQueryBuilder('order')
        .where('order.id = :id', {
          id,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!currentOrder) {
        throw new NotFoundException('Pedido não encontrado');
      }

      if (currentOrder.status !== OrderStatus.FAILED) {
        throw new BadRequestException(
          'Apenas pedidos FAILED podem ser reprocessados',
        );
      }

      currentOrder.status = OrderStatus.PENDING;

      currentOrder.failureReason = null;

      currentOrder.processedAt = null;

      return repository.save(currentOrder);
    });

    await this.eventsPublisher.publishCreated(
      new OrderCreatedEvent(
        randomUUID(),
        order.id,
        correlationId,
        new Date().toISOString(),
      ),
    );

    return this.findOne(order.id);
  }
}
