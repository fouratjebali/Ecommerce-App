import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { fallbackStorefront } from '../data/fallback-storefront';
import { StorefrontHomepage } from '../models/storefront';

@Injectable({ providedIn: 'root' })
export class StorefrontService {
  private readonly http = inject(HttpClient);

  getHomepage() {
    return this.http
      .get<StorefrontHomepage>('/api/v1/storefront/homepage')
      .pipe(catchError(() => of(fallbackStorefront)));
  }
}
