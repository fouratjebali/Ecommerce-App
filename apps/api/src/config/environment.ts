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
    .default('postgresql://greencraft:greencraft@localhost:5432/greencraft?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RABBITMQ_URL: z.string().default('amqp://greencraft:greencraft@localhost:5672'),
  MEILISEARCH_HOST: z.string().default('http://localhost:7700'),
  MEILISEARCH_MASTER_KEY: z.string().default('greencraft-master-key'),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): AppEnvironment {
  return environmentSchema.parse(config);
}
