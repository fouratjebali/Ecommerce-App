import { Pipe, PipeTransform } from '@angular/core';
import { translateMarketLabel } from '../utils/market-labels';

@Pipe({
  name: 'marketLabel',
  standalone: true,
})
export class MarketLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return translateMarketLabel(value);
  }
}
