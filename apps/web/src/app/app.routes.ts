import { Routes } from '@angular/router';
import { buyerGuard } from './guards/buyer.guard';
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
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart/cart-page').then((module) => module.CartPageComponent),
  },
  {
    path: 'checkout',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/checkout/checkout-page').then(
        (module) => module.CheckoutPageComponent,
      ),
  },
  {
    path: 'orders',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/orders/orders-page').then(
        (module) => module.OrdersPageComponent,
      ),
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
