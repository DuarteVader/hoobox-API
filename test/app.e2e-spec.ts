import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create an order with PENDING status', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin123',
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    expect(token).toBeDefined();

    const orderResponse = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'E2E Test',
        items: [
          {
            productName: 'Mouse',
            quantity: 2,
            price: 150,
          },
        ],
      })
      .expect(201);

    expect(orderResponse.body.id).toBeDefined();

    expect(orderResponse.body.customerName).toBe('E2E Test');

    expect(orderResponse.body.status).toBe('PENDING');

    expect(Number(orderResponse.body.total)).toBe(300);
  });
});
