import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ArtisanRegistrationPayload,
  AuthResponse,
  AuthUser,
  BuyerRegistrationPayload,
  LoginPayload,
} from '../models/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'greencraft.access-token';

  readonly accessToken = signal<string | null>(
    localStorage.getItem(this.storageKey),
  );
  readonly user = signal<AuthUser | null>(null);
  readonly loadingProfile = signal(false);

  constructor() {
    if (this.accessToken()) {
      void this.ensureProfile();
    }
  }

  async login(payload: LoginPayload) {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>('/api/v1/auth/login', payload),
    );
    this.applyAuthResponse(response);
    return response;
  }

  async registerBuyer(payload: BuyerRegistrationPayload) {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>('/api/v1/auth/register/buyer', payload),
    );
    this.applyAuthResponse(response);
    return response;
  }

  async registerArtisan(payload: ArtisanRegistrationPayload) {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>('/api/v1/auth/register/artisan', payload),
    );
    this.applyAuthResponse(response);
    return response;
  }

  async ensureProfile() {
    if (!this.accessToken()) {
      this.user.set(null);
      return null;
    }

    if (this.user()) {
      return this.user();
    }

    this.loadingProfile.set(true);

    try {
      const response = await firstValueFrom(
        this.http.get<{ user: AuthUser }>('/api/v1/auth/me'),
      );
      this.user.set(response.user);
      return response.user;
    } catch {
      this.clearSession();
      return null;
    } finally {
      this.loadingProfile.set(false);
    }
  }

  logout() {
    this.clearSession();
  }

  private applyAuthResponse(response: AuthResponse) {
    localStorage.setItem(this.storageKey, response.accessToken);
    this.accessToken.set(response.accessToken);
    this.user.set(response.user);
  }

  private clearSession() {
    localStorage.removeItem(this.storageKey);
    this.accessToken.set(null);
    this.user.set(null);
  }
}
