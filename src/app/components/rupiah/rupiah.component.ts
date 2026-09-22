import { formatNumber } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  LOCALE_ID,
} from '@angular/core';

/**
 * Nominal rupiah untuk TABEL: "Rp" kecil dan redup, angkanya berlebar
 * seragam (`tabular-nums`) sehingga koma dan titik ribuan sejajar ke bawah
 * satu kolom — cara aplikasi bank menampilkan saldo.
 *
 *   <app-rupiah [nilai]="po.total" />
 *   <app-rupiah [nilai]="aset.value" digit="1.0-0" />
 *
 * Angkanya diformat persis seperti `number: digit` pada lokal aktif, jadi
 * menggantikan `{{ x | currency: "Rp " : "symbol" : "1.2-2" }}` dan
 * `Rp {{ x | number: "1.2-2" }}` tanpa mengubah digit yang tampil.
 *
 * Tanda minus ditaruh DI DEPAN "Rp" (−Rp 1.000), bukan di antara simbol
 * dan angka: yang dibaca pertama harus tandanya.
 */
@Component({
  selector: 'app-rupiah',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="rp" [class.rp--neg]="negatif"
    >@if (negatif) {<span class="rp__tanda">−</span>}<span class="rp__sym">Rp</span>{{ teks }}</span
  >`,
})
export class RupiahComponent {
  @Input() nilai: number | string | null | undefined;
  @Input() digit = '1.2-2';

  constructor(@Inject(LOCALE_ID) private locale: string) {}

  private get angka(): number {
    const n = Number(this.nilai);
    return Number.isFinite(n) ? n : 0;
  }

  /** Nol negatif (−0,001) dibaca nol, bukan "−Rp 0,00". */
  get negatif(): boolean {
    return this.angka <= -0.005;
  }

  get teks(): string {
    return formatNumber(Math.abs(this.angka), this.locale, this.digit);
  }
}
