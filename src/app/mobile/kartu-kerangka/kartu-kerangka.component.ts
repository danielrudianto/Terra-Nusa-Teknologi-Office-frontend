import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Kerangka berkilau untuk daftar kartu di ponsel — padanan `appKerangka`
 * pada tabel desktop. Menggantikan pemintal di tengah layar: bentuk
 * daftarnya sudah terlihat sebelum isinya datang, jadi halamannya tidak
 * melompat saat kartu pertama masuk.
 *
 *   @if (sedangMemuat) { <app-kartu-kerangka /> }
 */
@Component({
  selector: 'app-kartu-kerangka',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="akn-m-kerangka" aria-busy="true">
    @for (i of daftar; track i) {
      <div class="akn-m-kerangka__kartu">
        <span class="akn-m-kerangka__bulat"></span>
        <span class="akn-m-kerangka__teks">
          <span class="akn-m-kerangka__garis" style="width: 72%"></span>
          <span class="akn-m-kerangka__garis" style="width: 46%"></span>
        </span>
      </div>
    }
  </div>`,
})
export class KartuKerangkaComponent {
  @Input() jumlah = 5;

  get daftar(): number[] {
    return Array.from({ length: Math.max(1, this.jumlah) }, (_, i) => i);
  }
}
