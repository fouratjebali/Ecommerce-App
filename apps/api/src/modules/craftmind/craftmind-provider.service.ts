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
        'Anthropic a retourne un brouillon non JSON. Retour a la generation locale du brouillon.',
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
      `CraftMind a analyse votre demande : "${request.prompt.trim()}".`,
      `Commencez par ancrer votre texte dans ce que GreenCraft peut verifier aujourd'hui : matieres, contexte de sourcing, point de vue de l'artisan et impact mesurable.`,
      `Utilisez ces references verifiables comme base de travail :\n${references}`,
      `Etape recommandee : affinez le titre autour de la matiere principale, gardez une description courte centree sur le benefice et transformez l'histoire artisanale en un detail de sourcing concret.`,
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
        : artisanDocument?.title ?? 'artisan GreenCraft';
    const categoryName = request.categoryName || 'Objets artisanaux';
    const materialLead = request.materialNames[0] ?? 'matieres sourcees avec soin';
    const queryTokens = tokenizeQuery(request.prompt);
    const titleSeed =
      queryTokens.slice(0, 2).map((token) => toTitleCase(token)).join(' ') ||
      'Atelier';
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
        shortDescription: `${normalizedName} est un ${categoryName.toLowerCase()} realise avec ${materialLead} pour des acheteurs qui recherchent une provenance artisanale verifiable.`,
        description: `${normalizedName} traduit l'histoire durable de GreenCraft dans une fiche ${categoryName.toLowerCase()} qui reste concrete, chaleureuse et precise. Mettez d'abord en avant ${materialLine}, expliquez comment la piece s'inscrit dans des usages reels, puis liez chaque promesse environnementale aux matieres ou au processus de fabrication.\n\nDans la description longue, reliez la forme du produit a l'approche de l'artisan, mentionnez l'amelioration de sourcing ou l'impact mesure, puis terminez par une attente pratique comme le delai, l'usage quotidien ou l'entretien.`,
        story: `${artisanStudio} peut raconter cette piece a travers des choix de matieres attentifs, une production plus lente et la valeur concrete d'un objet artisanal face aux alternatives jetables. Gardez le recit ancre dans les habitudes de sourcing de l'atelier et dans les informations d'impact deja disponibles dans le catalogue GreenCraft.`,
        materials: request.materialNames,
        tags: Array.from(
          new Set([
            slugify(categoryName),
            ...request.materialNames.map((material) => slugify(material)),
            'sustainable-handmade',
            'artisan-made',
          ]),
        ).filter(Boolean),
        seoTitle: `${normalizedName} | ${categoryName} durable sur GreenCraft`,
        seoDescription: `${normalizedName} realise avec ${materialLead}. Decouvrez l'histoire artisanale, le contexte de sourcing et les details d'impact sur GreenCraft.`,
        launchChecklist: [
          'Verifiez que les photos correspondent bien aux matieres et a la finition decrites.',
          "Confirmez le score d'impact et les economies de CO2 avant toute promesse environnementale.",
          "Ajoutez un detail de sourcing issu du processus d'atelier pour rendre l'histoire concrete.",
          'Controlez le delai, le stock et la note eco avant de passer le produit en PUBLISHED.',
        ],
      },
    };
  }

  private buildChatSystemPrompt(request: CraftmindChatRequest) {
    return [
      'Vous etes CraftMind pour GreenCraft Marketplace.',
      'Repondez avec un ton artisanal, chaleureux et attentif a la durabilite.',
      'N utilisez que les faits confirmes par le contexte fourni.',
      "Si une information demandee n'apparait pas dans le contexte, dites qu'elle doit etre confirmee.",
      `Resume du contexte : ${request.context.summary}`,
      `Documents de contexte :\n${request.context.documents
        .map((document) => `- ${document.title}: ${document.snippet}`)
        .join('\n')}`,
    ].join('\n');
  }

  private buildListingSystemPrompt(request: CraftmindListingRequest) {
    return [
      'Vous etes CraftMind pour GreenCraft Marketplace.',
      'Retournez uniquement du JSON valide.',
      "Generez un brouillon de fiche fonde sur le contexte marketplace et atelier fourni.",
      "N'inventez ni certifications ni affirmations de sourcing.",
      `Categorie : ${request.categoryName}`,
      `Note eco : ${request.ecoRatingLabel ?? 'Non precisee'}`,
      `Matieres : ${request.materialNames.join(', ') || 'Non precisees'}`,
      `Resume du contexte : ${request.context.summary}`,
      `Documents de contexte :\n${request.context.documents
        .map((document) => `- ${document.title}: ${document.snippet}`)
        .join('\n')}`,
      'Retournez un JSON avec les cles : name, slug, shortDescription, description, story, materials, tags, seoTitle, seoDescription, launchChecklist.',
    ].join('\n');
  }

  private buildListingUserPrompt(request: CraftmindListingRequest) {
    return `Creez un brouillon de fiche produit a partir de cette demande artisanale : ${request.prompt}`;
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
  const name = draft.name?.trim() || 'Brouillon produit GreenCraft';

  return {
    name,
    slug: slugify(draft.slug?.trim() || name),
    shortDescription:
      draft.shortDescription?.trim() ||
      'Un brouillon de fiche GreenCraft est pret a etre affine.',
    description:
      draft.description?.trim() ||
      'CraftMind a prepare une description de fiche a relire avant publication.',
    story:
      draft.story?.trim() ||
      "Relisez l'histoire artisanale et remplacez les placeholders par des details de sourcing verifies.",
    materials: Array.isArray(draft.materials)
      ? draft.materials.map((material) => String(material))
      : [],
    tags: Array.isArray(draft.tags)
      ? draft.tags.map((tag) => slugify(String(tag))).filter(Boolean)
      : [],
    seoTitle: draft.seoTitle?.trim() || `${name} | GreenCraft`,
    seoDescription:
      draft.seoDescription?.trim() ||
      'Genere avec CraftMind pour GreenCraft.',
    launchChecklist:
      Array.isArray(draft.launchChecklist) && draft.launchChecklist.length
        ? draft.launchChecklist.map((item) => String(item))
        : [
            'Relisez le texte genere.',
            'Validez les informations produit avant publication.',
          ],
  };
}
