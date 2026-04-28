import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await authService.ensureProfile();

  if (!user) {
    return router.createUrlTree(['/auth']);
  }

  if (user.role !== 'ADMIN') {
    return router.createUrlTree(['/catalog']);
  }

  return true;
};
