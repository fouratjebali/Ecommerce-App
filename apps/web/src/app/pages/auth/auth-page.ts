import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type AuthMode = 'login' | 'register';
type RegistrationType = 'buyer' | 'artisan';

@Component({
  selector: 'app-auth-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})
export class AuthPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly mode = signal<AuthMode>('login');
  protected readonly registrationType = signal<RegistrationType>('buyer');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly loginForm = {
    email: '',
    password: '',
  };

  protected readonly buyerForm = {
    email: '',
    fullName: '',
    password: '',
  };

  protected readonly artisanForm = {
    email: '',
    fullName: '',
    password: '',
    studioName: '',
    slug: '',
    headline: '',
    bio: '',
    location: '',
    impactStatement: '',
  };

  protected setMode(mode: AuthMode) {
    this.mode.set(mode);
    this.errorMessage.set(null);
  }

  protected setRegistrationType(type: RegistrationType) {
    this.registrationType.set(type);
    this.errorMessage.set(null);
  }

  protected async submit() {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      if (this.mode() === 'login') {
        const response = await this.authService.login(this.loginForm);
        await this.router.navigateByUrl(
          response.user.role === 'ARTISAN' ? '/vendor' : '/catalog',
        );
        return;
      }

      if (this.registrationType() === 'buyer') {
        await this.authService.registerBuyer(this.buyerForm);
        await this.router.navigateByUrl('/catalog');
        return;
      }

      await this.authService.registerArtisan(this.artisanForm);
      await this.router.navigateByUrl('/vendor');
    } catch {
      this.errorMessage.set(
        "Nous n'avons pas pu traiter votre demande. Verifiez vos informations puis reessayez.",
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
