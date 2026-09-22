import 'dotenv/config';

import { DataSource } from 'typeorm';

import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { User } from '../auth/entities/user.entity';

import { InitialSchema1790000000000 } from './migrations/1790000000000-InitialSchema';
import { SeedProducts1790000001000 } from './migrations/1790000001000-SeedProducts';

export default new DataSource({
  type: 'mysql',

  host: process.env.DB_HOST,

  port: Number(process.env.DB_PORT ?? 3306),

  username: process.env.DB_USERNAME,

  password: process.env.DB_PASSWORD,

  database: process.env.DB_DATABASE,

  entities: [Product, Order, OrderItem, User],

  migrations: [InitialSchema1790000000000, SeedProducts1790000001000],

  synchronize: false,
});
