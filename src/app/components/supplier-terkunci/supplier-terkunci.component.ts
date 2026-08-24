import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Pemasok yang sudah terkunci, ditampilkan sebagai TEKS.
 *
 * Dipakai pada adendum dan koreksi, di mana pemasoknya tidak dapat diganti:
 * ia mengikat dokumen pada perjanjian induknya, dan menggantinya berarti
 * menagih pihak lain atas dokumen bernomor sama.
 *
 * Sebelumnya keadaan itu ditandai dengan mematikan isiannya. Hasilnya kotak
 * abu-abu yang tetap terlihat seperti dapat diisi — yang membukanya mencoba
 * mengetik, tidak terjadi apa-apa, lalu menyimpulkan layarnya rusak. Dan
 * ketika nilainya kebetulan kosong, kotak itu tidak dapat dibedakan dari
 * isian yang memang belum diisi.
 *
 * Sebagai teks, keadaannya jelas tanpa perlu dicoba.
 */
@Component({
  selector: 'app-supplier-terkunci',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  template: `
    <div class="sptk">
      <span class="sptk__label">{{ label }}</span>

      <div class="sptk__isi">
        <span class="sptk__nama">{{ nama || ('common.dash' | translate) }}</span>
        @if (alamat) {
          <span class="sptk__alamat">{{ alamat }}</span>
        }
      </div>

      <!--
        Alasannya disebut, bukan hanya digembok.

        Gembok tanpa keterangan membuat yang membukanya bertanya-tanya apakah
        ini kesalahan; satu baris penjelasan menutup pertanyaan itu.

        Bila kartunya justru DAPAT diganti, gembok itu ditukar dengan
        tindakannya — kartu yang sama dipakai untuk pilihan yang sudah
        diambil, bukan hanya untuk yang terkunci.
      -->
      @if (aksiTeks) {
        <button type="button" class="sptk__aksi" (click)="aksi.emit()">
          <mat-icon>swap_horiz</mat-icon>
          {{ aksiTeks | translate }}
        </button>
      } @else {
        <span class="sptk__kunci">
          <mat-icon>lock</mat-icon>
          {{ kunciTeks | translate }}
        </span>
      }
    </div>
  `,
  styles: [
    `
      /*
       * Lebar penuh.
       *
       * Tanpa ini komponennya menyusut mengikuti isinya: elemen kustom
       * bersifat inline secara bawaan, sehingga kelas span2 pada
       * pemanggilnya menentukan KOLOM grid-nya tetapi tidak lebarnya.
       * Hasilnya kartu sempit di kiri dengan ruang kosong di kanannya.
       */
      :host {
        display: block;
        width: 100%;
      }

      .sptk {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.85rem 1rem;
        border-radius: 12px;
        background: var(--surface-2, #f6f8ff);
        border: 0.5px solid var(--border, #e3e6eb);
      }

      .sptk__label {
        font-size: 0.72rem;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--muted, #9aa1b1);
      }

      .sptk__isi {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
      }

      .sptk__nama {
        font-size: 0.95rem;
        font-weight: 600;
        word-break: break-word;
      }

      .sptk__alamat {
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--muted, #6b7280);
        word-break: break-word;
      }

      .sptk__kunci {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.72rem;
        color: var(--muted, #9aa1b1);
      }

      .sptk__kunci .mat-icon {
        width: 14px;
        height: 14px;
        font-size: 14px;
      }

      /*
       * Tindakan mengganti.

       * Sengaja setenang keterangan gemboknya — sama kecil, sama redup, di
       * tempat yang sama. Yang berpindah antara layar sunting (tergembok)
       * dan layar pengisian (dapat diganti) melihat kartu yang sama; hanya
       * baris terakhirnya yang berbeda.
       */
      .sptk__aksi {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        align-self: flex-start;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.72rem;
        color: var(--brand, #154dec);
      }

      .sptk__aksi:hover {
        text-decoration: underline;
      }

      .sptk__aksi .mat-icon {
        width: 14px;
        height: 14px;
        font-size: 14px;
      }
    `,
  ],
})
export class SupplierTerkunciComponent {
  @Input() label = '';
  @Input() nama: string | null = null;
  @Input() alamat: string | null = null;

  /**
   * Kunci i18n keterangan gemboknya.
   *
   * Bawaannya pemasok — pemakaian pertamanya. Dapat diganti supaya bentuk
   * kartu yang sama dipakai juga untuk keterangan dokumen lama, alih-alih
   * menyalin gayanya ke komponen kedua yang harus dijaga sejalan.
   */
  @Input() kunciTeks = 'poForm.pemasokTerkunci';

  /**
   * Kunci i18n tindakan pengganti gemboknya.
   *
   * Dibiarkan kosong pada kartu yang memang terkunci. Diisi bila pilihannya
   * masih dapat diubah — kartunya lalu menampilkan tindakan itu, bukan
   * gembok, tanpa perlu bentuk kartu kedua yang harus dijaga sejalan.
   */
  @Input() aksiTeks: string | null = null;

  @Output() aksi = new EventEmitter<void>();
}
