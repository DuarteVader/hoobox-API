import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';

import * as bcrypt from 'bcryptjs';

import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UserSeederService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,

    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const username = this.config.get<string>('DEMO_USER', 'admin');

    const password = this.config.get<string>('DEMO_PASSWORD', 'admin123');

    const existing = await this.repository.findOne({
      where: {
        username,
      },
    });

    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await this.repository.save(
      this.repository.create({
        username,
        passwordHash,
        role: UserRole.ADMIN,
      }),
    );
  }
}
