import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { Request } from 'express';

import { OrdersService } from './orders.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';


@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body()
    dto: CreateOrderDto,

    @Req()
    req: Request,
  ) {
    const correlationId = String(req.id);

    return this.ordersService.create(dto, correlationId);
  }

  @Get()
  findAll(
    @Query()
    query: ListOrdersQueryDto,
  ) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe)
    id: string,
  ) {
    return this.ordersService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/reprocess')
  reprocess(
    @Param('id', ParseUUIDPipe)
    id: string,

    @Req()
    req: Request,
  ) {
    return this.ordersService.reprocess(id, String(req.id));
  }
}
