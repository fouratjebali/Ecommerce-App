import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CRAFTMIND_PROVIDER_ANTHROPIC,
  CRAFTMIND_PROVIDER_LOCAL,
} from './craftmind.constants';
import {
  CraftmindChatRequest,
  CraftmindChatResponse,
  CraftmindListingDraft,
  CraftmindListingRequest,
  CraftmindListingResponse,
} from './craftmind.types';
import { slugify, toTitleCase, tokenizeQuery } from './craftmind.helpers';

interface AnthropicMessageResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

@Injectable()
export class CraftmindProviderService {
  private readonly logger = new Logger(CraftmindProviderService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateChat(request: CraftmindChatRequest): Promise<CraftmindChatResponse> {
    const provider = this.configService.get<string>('CRAFTMIND_PROVIDER', 'local');

    if (provider === CRAFTMIND_PROVIDER_ANTHROPIC) {
      const anthropicResponse = await this.tryAnthropicChat(request);

      if (anthropicResponse) {
        return anthropicResponse;
      }
    }

    return this.generateLocalChat(request);
  }

  async generateListingDraft(
    request: CraftmindListingRequest,
  ): Promise<CraftmindListingResponse> {
    const provider = this.configService.get<string>('CRAFTMIND_PROVIDER', 'local');

    if (provider === CRAFTMIND_PROVIDER_ANTHROPIC) {
      const anthropicResponse = await this.tryAnthropicListingDraft(request);

      if (anthropicResponse) {
        return anthropicResponse;
      }
    }

    return this.generateLocalListingDraft(request);
  }

  private async tryAnthropicChat(
    request: CraftmindChatRequest,
  ): Promise<CraftmindChatResponse | null> {
    const text = await this.callAnthropic(
      this.buildChatSystemPrompt(request),
      [
        ...request.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: 'user' as const,
          content: request.prompt,
        },
      ],
    );

    if (!text) {
      return null;
    }

    return {
      provider: CRAFTMIND_PROVIDER_ANTHROPIC,
      model: this.configService.get<string>('CRAFTMIND_MODEL', 'claude-sonnet-4-5'),
      text,
    };
  }

  private async tryAnthropicListingDraft(
    request: CraftmindListingRequest,
  ): Promise<CraftmindListingResponse | null> {
    const text = await this.callAnthropic(
      this.buildListingSystemPrompt(request),
      [
        {
          role: 'user' as const,
          content: this.buildListingUserPrompt(request),
        },
      ],
    );

    if (!text) {
      return null;
    }

    const parsed = parseListingDraft(text);

    if (!parsed) {
      this.logger.warn(
        'Anthropic returned a non-JSON listing draft. Falling back to local draft generation.',
      );
      return null;
    }

    return {
      provider: CRAFTMIND_PROVIDER_ANTHROPIC,
      model: this.configService.get<string>('CRAFTMIND_MODEL', 'claude-sonnet-4-5'),
      draft: normalizeListingDraft(parsed),
    };
  }

  private async callAnthropic(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      return null;
    }

    const apiUrl = this.configService.get<string>(
      'ANTHROPIC_API_URL',
      'https://api.anthropic.com/v1/messages',
    );
    const model = this.configService.get<string>('CRAFTMIND_MODEL', 'claude-sonnet-4-5');
    const maxTokens = this.configService.get<number>('CRAFTMIND_MAX_TOKENS', 900);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Anthropic request failed with status ${response.status}.`);
        return null;
      }

      const payload = (await response.json()) as AnthropicMessageResponse;
      const text = payload.content
        ?.filter((item) => item.type === 'text' && item.text)
        .map((item) => item.text!.trim())
        .join('\n\n')
        .trim();

      return text || null;
    } catch (error) {
      this.logger.warn(`Anthropic request failed: ${String(error)}`);
      return null;
    }
  }

  private generateLocalChat(request: CraftmindChatRequest): CraftmindChatResponse {
    const references = request.context.documents
      .slice(0, 4)
      .map((document) => `- ${document.title}: ${document.snippet}`)
      .join('\n');

    const responseText = [
      `CraftMind reviewed your prompt: "${request.prompt.trim()}".`,
      `Start by anchoring the copy in what GreenCraft can verify today: materials, sourcing context, artisan perspective, and measurable impact.`,
      `Use these grounded references as your draft base:\n${references}`,
      `Recommended next move: refine the product title around the lead material, keep the short description benefit-first, and turn the artisan story into one concrete sourcing detail buyers can trust.`,
    ].join('\n\n');

    return {
      provider: CRAFTMIND_PROVIDER_LOCAL,
      model: 'craftmind-local-rag',
      text: responseText,
    };
  }

  private generateLocalListingDraft(
    request: CraftmindListingRequest,
  ): CraftmindListingResponse {
    const artisanDocument = request.context.documents.find(
      (document) => document.kind === 'artisan-profile',
    );
    const artisanStudio =
      typeof artisanDocument?.metadata?.artisanName === 'string'
        ? artisanDocument.metadata.artisanName
        : artisanDocument?.title ?? 'GreenCraft artisan';
    const categoryName = request.categoryName || 'Handmade Goods';
    const materialLead = request.materialNames[0] ?? 'responsibly sourced materials';
    const queryTokens = tokenizeQuery(request.prompt);
    const titleSeed =
      queryTokens.slice(0, 2).map((token) => toTitleCase(token)).join(' ') ||
      'Studio Crafted';
    const name = `${titleSeed} ${toTitleCase(categoryName.replace(/&/g, ' '))}`
      .replace(/\s+/g, ' ')
      .trim();
    const normalizedName = name.length > 56 ? name.slice(0, 56).trimEnd() : name;
    const materialLine = request.materialNames.length
      ? request.materialNames.join(', ')
      : materialLead;

    return {
      provider: CRAFTMIND_PROVIDER_LOCAL,
      model: 'craftmind-local-rag',
      draft: {
        name: normalizedName,
        slug: slugify(normalizedName),
        shortDescription: `${normalizedName} is a ${categoryName.toLowerCase()} made with ${materialLead} and positioned for buyers who want verified craft provenance.`,
        description: `${normalizedName} brings GreenCraft's sustainability story into a ${categoryName.toLowerCase()} listing that feels tactile, warm, and specific. Lead with ${materialLine}, highlight how the piece fits real daily rituals, and keep every environmental claim tied to the actual materials or making process.\n\nFor the full description, connect the form factor to the artisan's approach, note the measured impact or sourcing improvement, and end with a practical expectation such as lead time, everyday use, or care.`,
        story: `${artisanStudio} can frame this piece around thoughtful material choices, slower production, and the buyer-facing value of choosing handmade over disposable alternatives. Keep the story rooted in the studio's actual sourcing habits and the impact details already available in the GreenCraft catalog.`,
        materials: request.materialNames,
        tags: Array.from(
          new Set([
            slugify(categoryName),
            ...request.materialNames.map((material) => slugify(material)),
            'sustainable-handmade',
            'artisan-made',
          ]),
        ).filter(Boolean),
        seoTitle: `${normalizedName} | Sustainable ${categoryName} on GreenCraft`,
        seoDescription: `${normalizedName} crafted with ${materialLead}. Discover the artisan story, sourcing context, and impact details on GreenCraft Marketplace.`,
        launchChecklist: [
          'Confirm the product photos match the material and finish described in the draft.',
          'Verify the impact score and CO2 savings before publishing sustainability claims.',
          'Add one sourcing detail from the studio process to make the story concrete.',
          'Review lead time, inventory, and eco rating fields before switching to PUBLISHED.',
        ],
      },
    };
  }

  private buildChatSystemPrompt(request: CraftmindChatRequest) {
    return [
      'You are CraftMind for GreenCraft Marketplace.',
      'Answer with an artisan-first, sustainability-aware tone.',
      'Only use facts grounded in the provided retrieval context.',
      'If a requested fact is not in context, say that it needs confirmation.',
      `Retrieved context summary: ${request.context.summary}`,
      `Context documents:\n${request.context.documents
        .map((document) => `- ${document.title}: ${document.snippet}`)
        .join('\n')}`,
    ].join('\n');
  }

  private buildListingSystemPrompt(request: CraftmindListingRequest) {
    return [
      'You are CraftMind for GreenCraft Marketplace.',
      'Return only valid JSON.',
      'Generate a listing draft grounded in the supplied marketplace and artisan context.',
      'Do not invent certifications or sourcing claims.',
      `Category: ${request.categoryName}`,
      `Eco rating: ${request.ecoRatingLabel ?? 'Not specified'}`,
      `Materials: ${request.materialNames.join(', ') || 'Not specified'}`,
      `Context summary: ${request.context.summary}`,
      `Context documents:\n${request.context.documents
        .map((document) => `- ${document.title}: ${document.snippet}`)
        .join('\n')}`,
      'Return JSON with keys: name, slug, shortDescription, description, story, materials, tags, seoTitle, seoDescription, launchChecklist.',
    ].join('\n');
  }

  private buildListingUserPrompt(request: CraftmindListingRequest) {
    return `Create a product listing draft from this artisan prompt: ${request.prompt}`;
  }
}

function parseListingDraft(value: string): Partial<CraftmindListingDraft> | null {
  const cleaned = value
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as Partial<CraftmindListingDraft>;
  } catch {
    return null;
  }
}

function normalizeListingDraft(
  draft: Partial<CraftmindListingDraft>,
): CraftmindListingDraft {
  const name = draft.name?.trim() || 'GreenCraft Draft Product';

  return {
    name,
    slug: slugify(draft.slug?.trim() || name),
    shortDescription:
      draft.shortDescription?.trim() ||
      'A GreenCraft listing draft is ready for refinement.',
    description:
      draft.description?.trim() ||
      'CraftMind prepared a listing description that should be reviewed before publishing.',
    story:
      draft.story?.trim() ||
      'Review the artisan story and replace placeholders with verified sourcing details.',
    materials: Array.isArray(draft.materials)
      ? draft.materials.map((material) => String(material))
      : [],
    tags: Array.isArray(draft.tags)
      ? draft.tags.map((tag) => slugify(String(tag))).filter(Boolean)
      : [],
    seoTitle: draft.seoTitle?.trim() || `${name} | GreenCraft Marketplace`,
    seoDescription:
      draft.seoDescription?.trim() ||
      'Generated with CraftMind for GreenCraft Marketplace.',
    launchChecklist:
      Array.isArray(draft.launchChecklist) && draft.launchChecklist.length
        ? draft.launchChecklist.map((item) => String(item))
        : [
            'Review the generated copy.',
            'Validate product facts before publishing.',
          ],
  };
}
