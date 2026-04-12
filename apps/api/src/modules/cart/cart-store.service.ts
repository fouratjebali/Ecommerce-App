import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppEnvironment } from '../../config/environment';

@Injectable()
export class CartStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(CartStoreService.name);
  private readonly memoryStore = new Map<
    string,
    { value: string; expiresAt: number | null }
  >();
  private client: Redis | null = null;
  private usingMemoryStore = process.env.NODE_ENV === 'test';

  constructor(private readonly configService: ConfigService<AppEnvironment>) {}

  async get(key: string) {
    const client = await this.getClient();

    if (!client) {
      const entry = this.memoryStore.get(key);

      if (!entry) {
        return null;
      }

      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        this.memoryStore.delete(key);
        return null;
      }

      return entry.value;
    }

    return client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    const client = await this.getClient();

    if (!client) {
      this.memoryStore.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return;
    }

    await client.set(key, value, 'EX', ttlSeconds);
  }

  async delete(key: string) {
    const client = await this.getClient();

    if (!client) {
      this.memoryStore.delete(key);
      return;
    }

    await client.del(key);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  private async getClient() {
    if (this.usingMemoryStore) {
      return null;
    }

    if (this.client) {
      return this.client;
    }

    const candidate = new Redis(this.configService.get('REDIS_URL')!, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    try {
      await candidate.connect();
      this.client = candidate;
      return this.client;
    } catch (error) {
      this.usingMemoryStore = true;
      candidate.disconnect();
      this.logger.warn(
        `Falling back to in-memory cart storage because Redis is unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }
}
