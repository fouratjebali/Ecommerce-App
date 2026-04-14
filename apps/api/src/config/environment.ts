import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:4200'),
  API_DOCS_ENABLED: booleanish.default(true),
  JWT_SECRET: z.string().min(12).default('greencraft-local-secret'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z
    .string()
    .default(
      'postgresql://greencraft:greencraft@localhost:5432/greencraft?schema=public',
    ),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CART_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(72),
  CART_RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  BUNDLE_DISCOUNT_PERCENT: z.coerce.number().int().min(0).max(100).default(8),
  VISUAL_SEARCH_VECTOR_DIMENSIONS: z.coerce
    .number()
    .int()
    .positive()
    .default(192),
  VISUAL_SEARCH_DEFAULT_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .max(24)
    .default(8),
  VISUAL_SEARCH_CACHE_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(360),
  CRAFTMIND_PROVIDER: z.enum(['local', 'anthropic']).default('local'),
  CRAFTMIND_MODEL: z.string().default('claude-sonnet-4-5'),
  CRAFTMIND_MAX_TOKENS: z.coerce.number().int().positive().max(4096).default(900),
  CRAFTMIND_RETRIEVAL_LIMIT: z.coerce.number().int().positive().max(10).default(4),
  CRAFTMIND_STREAM_DELAY_MS: z.coerce.number().int().min(0).max(250).default(18),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_API_URL: z.string().url().default('https://api.anthropic.com/v1/messages'),
  RABBITMQ_URL: z
    .string()
    .default('amqp://greencraft:greencraft@localhost:5672'),
  MEILISEARCH_HOST: z.string().default('http://localhost:7700'),
  MEILISEARCH_MASTER_KEY: z.string().default('greencraft-master-key'),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): AppEnvironment {
  return environmentSchema.parse(config);
}
