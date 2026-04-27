import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tndCurrency',
  standalone: true,
})
export class TndCurrencyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    minimumFractionDigits = 3,
    maximumFractionDigits = 3,
  ): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const amount = typeof value === 'string' ? Number(value) : value;

    if (!Number.isFinite(amount)) {
      return '';
    }

    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  }
}
