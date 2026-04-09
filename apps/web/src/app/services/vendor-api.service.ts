import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  VendorDashboardResponse,
  VendorProfilePayload,
  VendorProfileResponse,
} from '../models/vendor';

@Injectable({ providedIn: 'root' })
export class VendorApiService {
  private readonly http = inject(HttpClient);

  getDashboard() {
    return this.http.get<VendorDashboardResponse>('/api/v1/vendors/me/dashboard');
  }

  getProfile() {
    return this.http.get<VendorProfileResponse>('/api/v1/vendors/me/profile');
  }

  updateProfile(payload: VendorProfilePayload) {
    return this.http.patch<VendorProfileResponse>(
      '/api/v1/vendors/me/profile',
      payload,
    );
  }
}
