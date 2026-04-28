import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account-menu',
  imports: [CommonModule],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
})
export class AccountMenuComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly user = computed(() => this.authService.user());

  protected readonly displayName = computed(() => this.user()?.fullName?.trim() || 'Compte GreenCraft');

  protected readonly initials = computed(() => {
    const source = this.displayName() || this.user()?.email || 'GC';
    const initials = source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'GC';
  });

  protected readonly roleLabel = computed(() => {
    switch (this.user()?.role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'ARTISAN':
        return 'Vendeur artisan';
      case 'BUYER':
        return 'Acheteur';
      default:
        return 'Compte';
    }
  });

  protected readonly studioName = computed(() => this.user()?.artisanProfile?.studioName ?? null);

  protected toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.open.update((value) => !value);
  }

  protected async logout() {
    this.open.set(false);
    this.authService.logout();
    await this.router.navigateByUrl('/auth');
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape() {
    this.open.set(false);
  }
}
