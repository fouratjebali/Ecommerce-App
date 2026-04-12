import { VISUAL_SEARCH_EMBEDDING_TABLE } from './visual-search.constants';

export function buildEnsureVisualSearchStorageStatements(
  vectorDimensions: number,
) {
  if (!Number.isInteger(vectorDimensions) || vectorDimensions <= 0) {
    throw new Error('Visual search vector dimensions must be a positive integer.');
  }

  const vectorType = `vector(${vectorDimensions})`;

  return [
    `
      CREATE TABLE IF NOT EXISTS ${VISUAL_SEARCH_EMBEDDING_TABLE} (
        "productId" UUID PRIMARY KEY REFERENCES "Product"("id") ON DELETE CASCADE,
        "embedding" ${vectorType} NOT NULL,
        "embeddingVersion" TEXT NOT NULL,
        "sourceStrategy" TEXT NOT NULL,
        "imageUrl" TEXT,
        "dominantColorHex" TEXT,
        "indexedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    `
      CREATE INDEX IF NOT EXISTS "VisualSearchEmbedding_indexedAt_idx"
      ON ${VISUAL_SEARCH_EMBEDDING_TABLE} ("indexedAt" DESC);
    `,
  ];
}

export function toVectorLiteral(vector: number[]) {
  if (!vector.length) {
    throw new Error('Visual search vectors cannot be empty.');
  }

  return `[${vector.map((value) => value.toFixed(8)).join(',')}]`;
}

export function clampVector(vector: number[]) {
  return vector.map((value) => {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (value < 0) {
      return 0;
    }

    if (value > 1) {
      return 1;
    }

    return value;
  });
}
