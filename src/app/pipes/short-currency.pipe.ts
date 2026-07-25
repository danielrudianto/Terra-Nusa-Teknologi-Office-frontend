import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortCurrency',
  pure: false,
  standalone: true,
})
export class ShortCurrencyPipe implements PipeTransform {
  transform(value: number, ...args: unknown[]): string {
    const currency = args[0] || 'Rp. ';
    if (value == null) return '';
    const _value = Math.abs(value);
    if (_value >= 1_000_000_000) {
      return (
        currency +
        (_value / 1_000_000_000).toLocaleString('id-ID', {
          maximumFractionDigits: 2,
        }) +
        'M'
      );
    }
    if (_value >= 1_000_000) {
      return (
        currency +
        (_value / 1_000_000).toLocaleString('id-ID', {
          maximumFractionDigits: 2,
        }) +
        'Jt'
      );
    }
    if (_value >= 1_000) {
      return (
        currency +
        (_value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) +
        'rb'
      );
    }
    return (value < 0 ? "-" : "") + currency + _value.toLocaleString('id-ID');
  }
}
