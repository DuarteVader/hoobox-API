import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',

  host: configService.getOrThrow<string>('DB_HOST'),

  port: Number(configService.getOrThrow<string>('DB_PORT')),

  username: configService.getOrThrow<string>('DB_USERNAME'),

  password: configService.getOrThrow<string>('DB_PASSWORD'),

  database: configService.getOrThrow<string>('DB_DATABASE'),

  autoLoadEntities: true,

  synchronize: false,

  logging: false,
});
