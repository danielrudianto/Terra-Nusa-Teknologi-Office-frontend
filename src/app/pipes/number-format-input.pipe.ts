import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFormatInput',
})
export class NumberFormatInputPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) return '';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) return String(value);

    // Format with 2 decimal places and space as thousand separator
    return numValue
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, '$& ')
      .replace('.', ',');
  }
}
