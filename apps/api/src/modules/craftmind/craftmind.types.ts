import { UserRole } from '@prisma/client';

export type CraftmindProvider = 'local' | 'anthropic';

export type CraftmindMessageRole = 'user' | 'assistant';

export interface CraftmindMessage {
  role: CraftmindMessageRole;
  content: string;
}

export interface CraftmindContextDocument {
  id: string;
  kind: 'artisan-profile' | 'catalog-product' | 'vendor-product' | 'material' | 'policy';
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CraftmindContextBundle {
  query: string;
  summary: string;
  documents: CraftmindContextDocument[];
}

export interface CraftmindChatRequest {
  role: UserRole;
  prompt: string;
  history: CraftmindMessage[];
  context: CraftmindContextBundle;
}

export interface CraftmindChatResponse {
  provider: CraftmindProvider;
  model: string;
  text: string;
}

export interface CraftmindListingDraft {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  story: string;
  materials: string[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  launchChecklist: string[];
}

export interface CraftmindListingRequest {
  role: UserRole;
  prompt: string;
  categoryName: string;
  ecoRatingLabel?: string | null;
  materialNames: string[];
  context: CraftmindContextBundle;
}

export interface CraftmindListingResponse {
  provider: CraftmindProvider;
  model: string;
  draft: CraftmindListingDraft;
}
