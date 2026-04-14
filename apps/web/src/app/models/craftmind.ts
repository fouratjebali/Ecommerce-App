export interface CraftmindMessage {
  role: 'user' | 'assistant';
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

export interface CraftmindChatPayload {
  prompt: string;
  history?: CraftmindMessage[];
}

export interface CraftmindChatResponse {
  reply: {
    role: 'assistant';
    content: string;
    provider: string;
    model: string;
  };
  context: CraftmindContextBundle;
  suggestedPrompts: string[];
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

export interface CraftmindListingDraftPayload {
  prompt: string;
  categoryId?: string;
  ecoRatingId?: string;
  materialIds?: string[];
}

export interface CraftmindListingDraftResponse {
  draft: CraftmindListingDraft;
  context: CraftmindContextBundle;
  provider: string;
  model: string;
}

export type CraftmindStreamEvent =
  | {
      type: 'token';
      chunk: string;
    }
  | {
      type: 'done';
      context: CraftmindContextBundle;
      provider: string;
      model: string;
      suggestedPrompts: string[];
    };
