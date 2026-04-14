import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import {
  CraftmindChatPayload,
  CraftmindChatResponse,
  CraftmindListingDraftPayload,
  CraftmindListingDraftResponse,
  CraftmindStreamEvent,
} from '../models/craftmind';

@Injectable({ providedIn: 'root' })
export class CraftmindApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  chat(payload: CraftmindChatPayload) {
    return this.http.post<CraftmindChatResponse>('/api/v1/craftmind/chat', payload);
  }

  generateListingDraft(payload: CraftmindListingDraftPayload) {
    return this.http.post<CraftmindListingDraftResponse>(
      '/api/v1/craftmind/listing-drafts',
      payload,
    );
  }

  streamChat(payload: CraftmindChatPayload) {
    return new Observable<CraftmindStreamEvent>((observer) => {
      const abortController = new AbortController();
      const token = this.authService.accessToken();

      void (async () => {
        try {
          const response = await fetch('/api/v1/craftmind/chat/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
            signal: abortController.signal,
          });

          if (!response.ok || !response.body) {
            throw new Error(`CraftMind stream failed with status ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

            let boundaryIndex = buffer.indexOf('\n\n');

            while (boundaryIndex >= 0) {
              const rawEvent = buffer.slice(0, boundaryIndex);
              buffer = buffer.slice(boundaryIndex + 2);
              this.emitStreamEvent(rawEvent, observer);
              boundaryIndex = buffer.indexOf('\n\n');
            }

            if (done) {
              break;
            }
          }

          observer.complete();
        } catch (error) {
          if (!abortController.signal.aborted) {
            observer.error(error);
          }
        }
      })();

      return () => {
        abortController.abort();
      };
    });
  }

  private emitStreamEvent(
    rawEvent: string,
    observer: {
      next: (value: CraftmindStreamEvent) => void;
    },
  ) {
    const lines = rawEvent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const eventName = lines
      .find((line) => line.startsWith('event:'))
      ?.slice('event:'.length)
      .trim();
    const dataValue = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim())
      .join('');

    if (!eventName || !dataValue) {
      return;
    }

    const parsed = JSON.parse(dataValue) as Record<string, unknown>;

    if (eventName === 'token' && typeof parsed['chunk'] === 'string') {
      observer.next({
        type: 'token',
        chunk: parsed['chunk'],
      });
      return;
    }

    if (
      eventName === 'done' &&
      parsed['context'] &&
      typeof parsed['provider'] === 'string' &&
      typeof parsed['model'] === 'string' &&
      Array.isArray(parsed['suggestedPrompts'])
    ) {
      observer.next({
        type: 'done',
        context: parsed['context'] as CraftmindListingDraftResponse['context'],
        provider: parsed['provider'],
        model: parsed['model'],
        suggestedPrompts: parsed['suggestedPrompts'].map((item) => String(item)),
      });
    }
  }
}
