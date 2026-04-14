import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  VendorAttributeOptionsResponse,
  VendorProduct,
  VendorProductPayload,
} from '../../models/catalog';
import {
  CraftmindContextDocument,
  CraftmindListingDraft,
  CraftmindMessage,
} from '../../models/craftmind';
import { VendorOrderItemsResponse } from '../../models/orders';
import { VendorDashboardResponse, VendorProfilePayload } from '../../models/vendor';
import { AuthService } from '../../services/auth.service';
import { CatalogApiService } from '../../services/catalog-api.service';
import { CraftmindApiService } from '../../services/craftmind-api.service';
import { OrdersApiService } from '../../services/orders-api.service';
import { VendorApiService } from '../../services/vendor-api.service';

interface ProductAttributeDraft {
  definitionId: string;
  optionId?: string;
  valueText?: string;
  valueNumber?: number | null;
  valueBoolean?: boolean;
}

interface ProductFormState {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  story: string;
  categoryId: string;
  ecoRatingId: string;
  currency: string;
  price: number;
  inventoryCount: number;
  impactScore: number;
  co2SavedKg: number;
  leadTimeDays: number;
  status: VendorProductPayload['status'];
  isFeatured: boolean;
  imageUrl: string;
  imageAlt: string;
  materialIds: string[];
  attributeValues: ProductAttributeDraft[];
}

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

interface CraftmindThreadMessage extends CraftmindMessage {
  id: string;
}

@Component({
  selector: 'app-vendor-page',
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './vendor-page.html',
  styleUrl: './vendor-page.scss',
})
export class VendorPageComponent {
  protected readonly authService = inject(AuthService);

  private readonly vendorApiService = inject(VendorApiService);
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly craftmindApiService = inject(CraftmindApiService);
  private readonly ordersApiService = inject(OrdersApiService);
  private readonly router = inject(Router);
  private craftmindStreamSubscription: Subscription | null = null;
  private craftmindMessageSequence = 0;

  protected readonly loading = signal(true);
  protected readonly savingProfile = signal(false);
  protected readonly savingProduct = signal(false);
  protected readonly dashboard = signal<VendorDashboardResponse | null>(null);
  protected readonly options = signal<VendorAttributeOptionsResponse | null>(null);
  protected readonly products = signal<VendorProduct[]>([]);
  protected readonly vendorOrderItems = signal<VendorOrderItemsResponse['items']>([]);
  protected readonly editingProductId = signal<string | null>(null);
  protected readonly updatingOrderItemId = signal<string | null>(null);
  protected readonly notice = signal<NoticeState | null>(null);
  protected readonly craftmindLoading = signal(false);
  protected readonly generatingListingDraft = signal(false);
  protected readonly craftmindMessages = signal<CraftmindThreadMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content:
        'CraftMind is ready to help with catalog-aware product copy, sourcing language, and listing draft generation.',
    },
  ]);
  protected readonly craftmindStreamingReply = signal('');
  protected readonly craftmindContextDocuments = signal<CraftmindContextDocument[]>([]);
  protected readonly craftmindContextSummary = signal<string | null>(null);
  protected readonly craftmindSuggestedPrompts = signal<string[]>([
    'Generate a warmer artisan-led product title.',
    'Help me rewrite this description with stronger sourcing details.',
    'What claims should I verify before publishing this listing?',
  ]);
  protected readonly craftmindDraft = signal<CraftmindListingDraft | null>(null);
  protected readonly craftmindProviderSummary = signal<string | null>(null);

  protected profileForm: VendorProfilePayload = {
    studioName: '',
    headline: '',
    bio: '',
    location: '',
    impactStatement: '',
  };

  protected productForm: ProductFormState = this.createEmptyProductForm();
  protected craftmindPrompt = '';

  constructor() {
    void this.loadPage();
  }

  ngOnDestroy() {
    this.craftmindStreamSubscription?.unsubscribe();
  }

  protected async saveProfile() {
    this.savingProfile.set(true);
    this.notice.set(null);

    try {
      const response = await firstValueFrom(this.vendorApiService.updateProfile(this.profileForm));
      this.profileForm = { ...response.profile };
      await this.loadVendorOverview();
      this.notice.set({
        tone: 'success',
        text: 'Studio profile saved for the current sprint workspace.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'The studio profile could not be saved right now.',
      });
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected startNewProduct() {
    this.editingProductId.set(null);
    this.notice.set(null);
    this.productForm = this.createEmptyProductForm(this.options());
  }

  protected editProduct(product: VendorProduct) {
    this.editingProductId.set(product.id);
    this.notice.set(null);
    this.productForm = {
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      story: product.story,
      categoryId: product.categoryId,
      ecoRatingId: product.ecoRatingId,
      currency: product.currency,
      price: product.priceInCents / 100,
      inventoryCount: product.inventoryCount,
      impactScore: product.impactScore,
      co2SavedKg: product.co2SavedKg,
      leadTimeDays: product.leadTimeDays,
      status: product.status as VendorProductPayload['status'],
      isFeatured: product.isFeatured,
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      materialIds: [...product.materialIds],
      attributeValues: this.buildAttributeDrafts(
        this.options()?.attributeDefinitions ?? [],
        product.attributeValues,
      ),
    };
  }

  protected toggleMaterial(materialId: string, checked: boolean) {
    const materialIds = checked
      ? [...new Set([...this.productForm.materialIds, materialId])]
      : this.productForm.materialIds.filter((id) => id !== materialId);

    this.productForm = {
      ...this.productForm,
      materialIds,
    };
  }

  protected updateAttributeOption(definitionId: string, optionId: string) {
    this.patchAttribute(definitionId, {
      optionId: optionId || undefined,
      valueText: undefined,
      valueNumber: null,
      valueBoolean: false,
    });
  }

  protected updateAttributeText(definitionId: string, valueText: string) {
    this.patchAttribute(definitionId, {
      optionId: undefined,
      valueText: valueText || undefined,
      valueNumber: null,
      valueBoolean: false,
    });
  }

  protected updateAttributeNumber(definitionId: string, value: string) {
    this.patchAttribute(definitionId, {
      optionId: undefined,
      valueText: undefined,
      valueNumber: value === '' ? null : Number(value),
      valueBoolean: false,
    });
  }

  protected updateAttributeBoolean(definitionId: string, checked: boolean) {
    this.patchAttribute(definitionId, {
      optionId: undefined,
      valueText: undefined,
      valueNumber: null,
      valueBoolean: checked,
    });
  }

  protected readAttributeOption(definitionId: string) {
    return this.findAttribute(definitionId)?.optionId ?? '';
  }

  protected readAttributeText(definitionId: string) {
    return this.findAttribute(definitionId)?.valueText ?? '';
  }

  protected readAttributeNumber(definitionId: string) {
    return this.findAttribute(definitionId)?.valueNumber ?? null;
  }

  protected readAttributeBoolean(definitionId: string) {
    return this.findAttribute(definitionId)?.valueBoolean ?? false;
  }

  protected materialName(materialId: string) {
    return (
      this.options()?.materials.find((material) => material.id === materialId)?.name ?? materialId
    );
  }

  protected async saveProduct() {
    if (!this.productForm.materialIds.length) {
      this.notice.set({
        tone: 'error',
        text: 'Select at least one material before saving a product.',
      });
      return;
    }

    this.savingProduct.set(true);
    this.notice.set(null);

    try {
      const payload = this.buildProductPayload();
      const editingProductId = this.editingProductId();

      if (editingProductId) {
        await firstValueFrom(this.catalogApiService.updateVendorProduct(editingProductId, payload));
      } else {
        await firstValueFrom(this.catalogApiService.createVendorProduct(payload));
      }

      await Promise.all([this.loadVendorProducts(), this.loadVendorOverview()]);

      if (!editingProductId) {
        this.productForm = this.createEmptyProductForm(this.options());
      }

      this.notice.set({
        tone: 'success',
        text: editingProductId
          ? 'Product updated in the artisan catalog.'
          : 'Product created and added to the artisan catalog.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'The product payload was rejected. Check the required fields and try again.',
      });
    } finally {
      this.savingProduct.set(false);
    }
  }

  protected seedCraftmindPromptFromProductForm() {
    this.craftmindPrompt = this.composeCraftmindBrief();
  }

  protected askCraftmind(prompt: string) {
    this.craftmindPrompt = prompt;
    void this.sendCraftmindPrompt();
  }

  protected async sendCraftmindPrompt() {
    const prompt = (this.craftmindPrompt.trim() || this.composeCraftmindBrief()).trim();

    if (!prompt) {
      this.notice.set({
        tone: 'error',
        text: 'Add a CraftMind prompt or seed one from the current product form first.',
      });
      return;
    }

    const history = this.buildCraftmindHistory();

    this.craftmindStreamSubscription?.unsubscribe();
    this.craftmindLoading.set(true);
    this.craftmindStreamingReply.set('');
    this.craftmindDraft.set(null);
    this.notice.set(null);
    this.appendCraftmindMessage('user', prompt);
    this.craftmindPrompt = '';

    this.craftmindStreamSubscription = this.craftmindApiService
      .streamChat({
        prompt,
        history,
      })
      .subscribe({
        next: (event) => {
          if (event.type === 'token') {
            this.craftmindStreamingReply.update((current) =>
              current ? `${current} ${event.chunk}` : event.chunk,
            );
            return;
          }

          const assistantReply = this.craftmindStreamingReply().trim();

          if (assistantReply) {
            this.appendCraftmindMessage('assistant', assistantReply);
          }

          this.craftmindStreamingReply.set('');
          this.craftmindContextDocuments.set(event.context.documents);
          this.craftmindContextSummary.set(event.context.summary);
          this.craftmindSuggestedPrompts.set(event.suggestedPrompts);
          this.craftmindProviderSummary.set(`${event.provider} · ${event.model}`);
        },
        error: () => {
          this.craftmindStreamingReply.set('');
          this.notice.set({
            tone: 'error',
            text: 'CraftMind could not stream a response right now.',
          });
          this.craftmindLoading.set(false);
        },
        complete: () => {
          this.craftmindLoading.set(false);
          this.craftmindStreamSubscription = null;
        },
      });
  }

  protected async generateDraftWithCraftmind() {
    const prompt = (this.craftmindPrompt.trim() || this.composeCraftmindBrief()).trim();

    if (!prompt) {
      this.notice.set({
        tone: 'error',
        text: 'Add a CraftMind brief or use the current product form to generate one.',
      });
      return;
    }

    this.generatingListingDraft.set(true);
    this.notice.set(null);

    try {
      const response = await firstValueFrom(
        this.craftmindApiService.generateListingDraft({
          prompt,
          categoryId: this.productForm.categoryId || undefined,
          ecoRatingId: this.productForm.ecoRatingId || undefined,
          materialIds: this.productForm.materialIds,
        }),
      );

      this.craftmindDraft.set(response.draft);
      this.craftmindContextDocuments.set(response.context.documents);
      this.craftmindContextSummary.set(response.context.summary);
      this.craftmindProviderSummary.set(`${response.provider} · ${response.model}`);
      this.notice.set({
        tone: 'success',
        text: 'CraftMind generated a listing draft from your current brief.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'CraftMind could not generate a listing draft right now.',
      });
    } finally {
      this.generatingListingDraft.set(false);
    }
  }

  protected applyCraftmindDraft() {
    const draft = this.craftmindDraft();

    if (!draft) {
      return;
    }

    const matchedMaterialIds = this.options()
      ?.materials.filter((material) =>
        draft.materials.some(
          (name) => name.trim().toLowerCase() === material.name.trim().toLowerCase(),
        ),
      )
      .map((material) => material.id);

    this.productForm = {
      ...this.productForm,
      name: draft.name,
      slug: draft.slug,
      shortDescription: draft.shortDescription,
      description: draft.description,
      story: draft.story,
      materialIds:
        matchedMaterialIds?.length ? matchedMaterialIds : this.productForm.materialIds,
    };

    this.notice.set({
      tone: 'success',
      text: 'CraftMind draft applied to the product form. Review and adjust before saving.',
    });
  }

  protected formatCraftmindDocumentKind(kind: CraftmindContextDocument['kind']) {
    switch (kind) {
      case 'artisan-profile':
        return 'Studio';
      case 'vendor-product':
        return 'Your product';
      case 'catalog-product':
        return 'Marketplace';
      case 'material':
        return 'Material';
      case 'policy':
        return 'Guide';
      default:
        return 'Reference';
    }
  }

  protected async logout() {
    this.authService.logout();
    await this.router.navigateByUrl('/auth');
  }

  protected async updateOrderItemStatus(itemId: string, status: string) {
    this.updatingOrderItemId.set(itemId);
    this.notice.set(null);

    try {
      await firstValueFrom(this.ordersApiService.updateVendorOrderItemStatus(itemId, status));
      await this.loadVendorOrders();
      this.notice.set({
        tone: 'success',
        text: 'Vendor order status updated.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'The order item status could not be updated.',
      });
    } finally {
      this.updatingOrderItemId.set(null);
    }
  }

  private async loadPage() {
    this.loading.set(true);
    this.notice.set(null);

    try {
      await this.authService.ensureProfile();

      const [dashboardResponse, profileResponse, optionsResponse] = await Promise.all([
        firstValueFrom(this.vendorApiService.getDashboard()),
        firstValueFrom(this.vendorApiService.getProfile()),
        firstValueFrom(this.catalogApiService.getVendorAttributeOptions()),
      ]);

      this.dashboard.set(dashboardResponse);
      this.profileForm = { ...profileResponse.profile };
      this.options.set(optionsResponse);
      this.productForm = this.createEmptyProductForm(optionsResponse);

      await Promise.all([this.loadVendorProducts(), this.loadVendorOrders()]);
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'The vendor workspace could not be loaded. Sign in again if the session expired.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadVendorOverview() {
    const [dashboardResponse, profileResponse] = await Promise.all([
      firstValueFrom(this.vendorApiService.getDashboard()),
      firstValueFrom(this.vendorApiService.getProfile()),
    ]);

    this.dashboard.set(dashboardResponse);
    this.profileForm = { ...profileResponse.profile };
  }

  private async loadVendorProducts() {
    const response = await firstValueFrom(this.catalogApiService.getVendorProducts());
    this.products.set(response.items);
  }

  private async loadVendorOrders() {
    const response = await firstValueFrom(this.ordersApiService.getVendorOrderItems());
    this.vendorOrderItems.set(response.items);
  }

  private createEmptyProductForm(options = this.options()): ProductFormState {
    return {
      slug: '',
      name: '',
      shortDescription: '',
      description: '',
      story: '',
      categoryId: options?.categories[0]?.id ?? '',
      ecoRatingId: options?.ecoRatings[0]?.id ?? '',
      currency: 'USD',
      price: 84,
      inventoryCount: 6,
      impactScore: 80,
      co2SavedKg: 2.5,
      leadTimeDays: 5,
      status: 'DRAFT',
      isFeatured: false,
      imageUrl:
        'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80',
      imageAlt: 'GreenCraft studio product image',
      materialIds: options?.materials[0] ? [options.materials[0].id] : [],
      attributeValues: this.buildAttributeDrafts(options?.attributeDefinitions ?? []),
    };
  }

  private buildAttributeDrafts(
    definitions: VendorAttributeOptionsResponse['attributeDefinitions'],
    existingValues: VendorProduct['attributeValues'] = [],
  ) {
    return definitions.map((definition) => {
      const existingValue = existingValues.find(
        (attribute) => attribute.definitionId === definition.id,
      );

      return {
        definitionId: definition.id,
        optionId: existingValue?.optionId ?? undefined,
        valueText: existingValue?.valueText ?? undefined,
        valueNumber: existingValue?.valueNumber ?? null,
        valueBoolean: existingValue?.valueBoolean ?? false,
      };
    });
  }

  private findAttribute(definitionId: string) {
    return this.productForm.attributeValues.find(
      (attribute) => attribute.definitionId === definitionId,
    );
  }

  private patchAttribute(
    definitionId: string,
    nextValue: Omit<ProductAttributeDraft, 'definitionId'>,
  ) {
    const nextAttributes = this.productForm.attributeValues.map((attribute) =>
      attribute.definitionId === definitionId
        ? {
            definitionId,
            ...nextValue,
          }
        : attribute,
    );

    this.productForm = {
      ...this.productForm,
      attributeValues: nextAttributes,
    };
  }

  private buildCraftmindHistory() {
    return this.craftmindMessages()
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  }

  private appendCraftmindMessage(role: CraftmindMessage['role'], content: string) {
    this.craftmindMessages.update((messages) => [
      ...messages,
      {
        id: `${role}-${++this.craftmindMessageSequence}`,
        role,
        content,
      },
    ]);
  }

  private composeCraftmindBrief() {
    const materialNames = this.productForm.materialIds
      .map((materialId) => this.materialName(materialId))
      .join(', ');
    const categoryName =
      this.options()?.categories.find((category) => category.id === this.productForm.categoryId)
        ?.name ?? 'handmade goods';
    const ecoRatingLabel =
      this.options()?.ecoRatings.find((ecoRating) => ecoRating.id === this.productForm.ecoRatingId)
        ?.label ?? 'current eco rating';

    return [
      `Create or improve a GreenCraft listing for a ${categoryName.toLowerCase()}.`,
      this.productForm.name ? `Current name: ${this.productForm.name}.` : null,
      this.productForm.shortDescription
        ? `Current short description: ${this.productForm.shortDescription}.`
        : null,
      this.productForm.story ? `Current story: ${this.productForm.story}.` : null,
      materialNames ? `Materials in scope: ${materialNames}.` : null,
      `Target eco rating: ${ecoRatingLabel}.`,
      `Impact score target: ${this.productForm.impactScore}/100.`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildProductPayload(): VendorProductPayload {
    const attributeValues: VendorProductPayload['attributeValues'] = [];

    for (const attribute of this.productForm.attributeValues) {
      if (attribute.optionId) {
        attributeValues.push({
          definitionId: attribute.definitionId,
          optionId: attribute.optionId,
        });
        continue;
      }

      if (attribute.valueText?.trim()) {
        attributeValues.push({
          definitionId: attribute.definitionId,
          valueText: attribute.valueText.trim(),
        });
        continue;
      }

      if (
        attribute.valueNumber !== null &&
        attribute.valueNumber !== undefined &&
        !Number.isNaN(attribute.valueNumber)
      ) {
        attributeValues.push({
          definitionId: attribute.definitionId,
          valueNumber: attribute.valueNumber,
        });
        continue;
      }

      if (typeof attribute.valueBoolean === 'boolean') {
        attributeValues.push({
          definitionId: attribute.definitionId,
          valueBoolean: attribute.valueBoolean,
        });
      }
    }

    return {
      slug: this.productForm.slug.trim(),
      name: this.productForm.name.trim(),
      shortDescription: this.productForm.shortDescription.trim(),
      description: this.productForm.description.trim(),
      story: this.productForm.story.trim(),
      categoryId: this.productForm.categoryId,
      ecoRatingId: this.productForm.ecoRatingId,
      currency: this.productForm.currency.trim() || 'USD',
      priceInCents: Math.round(this.productForm.price * 100),
      inventoryCount: this.productForm.inventoryCount,
      impactScore: this.productForm.impactScore,
      co2SavedKg: this.productForm.co2SavedKg,
      leadTimeDays: this.productForm.leadTimeDays,
      status: this.productForm.status,
      isFeatured: this.productForm.isFeatured,
      imageUrl: this.productForm.imageUrl.trim(),
      imageAlt: this.productForm.imageAlt.trim(),
      materialIds: [...this.productForm.materialIds],
      attributeValues,
    };
  }
}
