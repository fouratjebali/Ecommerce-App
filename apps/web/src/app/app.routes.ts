import { Routes } from '@angular/router';
import { vendorGuard } from './guards/vendor.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home-page').then((module) => module.HomePageComponent),
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./pages/catalog/catalog-page').then(
        (module) => module.CatalogPageComponent,
      ),
  },
  {
    path: 'catalog/:slug',
    loadComponent: () =>
      import('./pages/product-detail/product-detail-page').then(
        (module) => module.ProductDetailPageComponent,
      ),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/auth-page').then((module) => module.AuthPageComponent),
  },
  {
    path: 'vendor',
    canActivate: [vendorGuard],
    loadComponent: () =>
      import('./pages/vendor/vendor-page').then(
        (module) => module.VendorPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
