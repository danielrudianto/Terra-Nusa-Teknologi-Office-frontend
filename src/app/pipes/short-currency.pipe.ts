import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortCurrency',
  pure: false,
  standalone: false,
})
export class ShortCurrencyPipe implements PipeTransform {
  transform(value: number, ...args: unknown[]): string {
    const currency = args[0] || 'Rp. ';
    if (value == null) return '';
    if (value >= 1_000_000_000) {
      return (
        currency +
        (value / 1_000_000_000).toLocaleString('id-ID', {
          maximumFractionDigits: 2,
        }) +
        'M'
      );
    }
    if (value >= 1_000_000) {
      return (
        currency +
        (value / 1_000_000).toLocaleString('id-ID', {
          maximumFractionDigits: 2,
        }) +
        'Jt'
      );
    }
    if (value >= 1_000) {
      return (
        currency +
        (value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) +
        'rb'
      );
    }
    return currency + value.toLocaleString('id-ID');
  }
}
