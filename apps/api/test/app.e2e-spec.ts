import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('GreenCraft API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.services.api).toBe('online');
      });
  });

  it('/api/v1/cart (GET) returns an empty cart for a new session', () => {
    return request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('x-cart-session', 'e2e-session')
      .expect(200)
      .expect(({ body }) => {
        expect(body.sessionId).toBe('e2e-session');
        expect(body.summary.itemCount).toBe(0);
        expect(body.summary.totalInCents).toBe(0);
      });
  });

  it('/api/v1/cart (GET) rejects missing cart sessions', () => {
    return request(app.getHttpServer()).get('/api/v1/cart').expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
