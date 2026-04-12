import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppEnvironment } from '../../config/environment';

@Injectable()
export class VisualSearchCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(VisualSearchCacheService.name);
  private readonly memoryStore = new Map<
    string,
    { value: string; expiresAt: number | null }
  >();
  private client: Redis | null = null;
  private usingMemoryStore = process.env.NODE_ENV === 'test';

  constructor(private readonly configService: ConfigService<AppEnvironment>) {}

  async getSimilarProductIds(productId: string) {
    return this.getJson<string[]>(this.buildSimilarProductsKey(productId));
  }

  async setSimilarProductIds(productId: string, productIds: string[]) {
    await this.setJson(
      this.buildSimilarProductsKey(productId),
      productIds,
      this.getTtlSeconds(),
    );
  }

  async getCategoryFallbackIds(categorySlug: string) {
    return this.getJson<string[]>(this.buildCategoryFallbackKey(categorySlug));
  }

  async setCategoryFallbackIds(categorySlug: string, productIds: string[]) {
    await this.setJson(
      this.buildCategoryFallbackKey(categorySlug),
      productIds,
      this.getTtlSeconds(),
    );
  }

  async getDiscoveryFallbackIds() {
    return this.getJson<string[]>(this.buildDiscoveryFallbackKey());
  }

  async setDiscoveryFallbackIds(productIds: string[]) {
    await this.setJson(
      this.buildDiscoveryFallbackKey(),
      productIds,
      this.getTtlSeconds(),
    );
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  private async getJson<T>(key: string) {
    const raw = await this.get(key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async setJson(key: string, value: unknown, ttlSeconds: number) {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  private buildSimilarProductsKey(productId: string) {
    return `visual-search:similar:${productId}`;
  }

  private buildCategoryFallbackKey(categorySlug: string) {
    return `visual-search:category:${categorySlug}`;
  }

  private buildDiscoveryFallbackKey() {
    return 'visual-search:discovery';
  }

  private getTtlSeconds() {
    return (
      this.configService.get('VISUAL_SEARCH_CACHE_TTL_MINUTES', {
        infer: true,
      })! * 60
    );
  }

  private async get(key: string) {
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

  private async set(key: string, value: string, ttlSeconds: number) {
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
        `Falling back to in-memory visual-search cache because Redis is unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }
}
