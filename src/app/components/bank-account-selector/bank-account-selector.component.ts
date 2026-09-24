import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

import {
  BankAccountPickerComponent,
  HasilPemilihRekening,
} from '../bank-account-picker/bank-account-picker.component';
import { BankLookupService, RekeningRingkas } from '../../services/bank-lookup.service';

/**
 * Pemilih rekening bank perusahaan.
 *
 *   <app-bank-account-selector formControlName="bankAccountID" />
 *
 * ControlValueAccessor, sehingga menggantikan `<mat-select
 * formControlName="bankAccountID">` tanpa menyentuh susunan formulirnya.
 * Nilai yang ditulis tetap berupa ID rekening — tidak ada perubahan di sisi
 * server.
 *
 * DIALOG, BUKAN AUTOCOMPLETE.
 *
 * Keterangan satu rekening sudah tidak muat dalam satu baris saran: nomor,
 * nama pemilik, dan nama bank bertiga menjadi satu baris panjang yang
 * terpotong justru di bagian yang membedakan. Daftar saran juga hanya hidup
 * selama kolomnya disorot, sehingga membandingkan dua rekening berarti
 * mengetik ulang.
 *
 * Kolomnya kini `readonly` dan hanya menerima hasil dialog. Konsekuensinya
 * dikehendaki: nilainya adalah id, dan teks yang tidak cocok dengan rekening
 * mana pun tidak punya arti sama sekali — dulu isian semacam itu harus
 * dijadikan `null` lewat penanganan blur tersendiri, sekarang keadaannya
 * tidak mungkin muncul.
 */
@Component({
  selector: 'app-bank-account-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TranslatePipe,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BankAccountSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="bas">
      <mat-label>{{ label() || ('common.payerAccount' | translate) }}</mat-label>

      <input
        matInput
        readonly
        [value]="teks()"
        [disabled]="nonaktif()"
        [placeholder]="'bank.selectorPlaceholder' | translate"
        (click)="buka()"
        (focus)="buka()"
      />
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    <!--
      Keterangan rekening sebagai BLOK, bukan mat-hint.

      Nama bank dan nama pemilik rekening terlalu panjang untuk teks kecil
      di bawah kolom — yang paling sering dibaca justru yang paling tidak
      terbaca. Bentuknya sama dengan spanduk di layar pembelian.
    -->
    @if (terpilih(); as r) {
      @if (r.isDelete) {
        <div class="bas-blok bas-blok--awas">
          <mat-icon>report</mat-icon>
          <div>
            <strong>{{ 'bank.terhapusJudul' | translate }}</strong>
            <span>{{ r.bankName }} &middot; {{ r.bankAccountName }}</span>
            <span>{{ 'bank.terhapusKet' | translate }}</span>
          </div>
        </div>
      } @else {
        <div class="bas-blok">
          <mat-icon>account_balance</mat-icon>
          <div>
            <strong>{{ r.bankAccountName }}</strong>
            <span>{{ r.bankName }}</span>
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .bas {
        width: 100%;
      }
      .bas input {
        cursor: pointer;
      }
      .bas-blok {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        margin: -0.6rem 0 0.9rem;
        padding: 0.7rem 0.85rem;
        border-radius: 12px;
        background: var(--brand-soft, #e7ecfb);
        border: 0.5px solid var(--brand-soft, #cdd7f7);
        color: var(--brand-strong, #0f3fd0);
      }
      .bas-blok .mat-icon {
        flex: 0 0 auto;
        width: 19px;
        height: 19px;
        font-size: 19px;
        margin-top: 1px;
      }
      .bas-blok > div {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .bas-blok strong {
        font-size: 0.83rem;
        font-weight: 700;
      }
      .bas-blok span {
        font-size: 0.76rem;
        line-height: 1.4;
      }
      .bas-blok--awas {
        background: var(--warn-bg, #fdf3e3);
        border-color: var(--warn-bg, #f4dcb4);
        color: var(--warn-fg, #8a5300);
      }
    `,
  ],
})
export class BankAccountSelectorComponent implements ControlValueAccessor {
  readonly lookup = inject(BankLookupService);
  private readonly dialog = inject(MatDialog);

  readonly label = input<string>('');

  /**
   * Boleh dikosongkan dari dalam dialog.
   *
   * Kolom rekening pembayaran wajib; kolom slip pembayaran pada pembelian
   * tidak. Bawaannya `true` supaya pemakaian yang sudah ada tidak berubah
   * perilakunya.
   */
  readonly bolehKosong = input<boolean>(true);

  /** Teks yang tampil di kolom. */
  readonly teks = signal('');
  readonly nonaktif = signal(false);

  /** ID rekening yang sedang terpilih; `null` bila belum ada yang sah. */
  private readonly idTerpilih = signal<number | null>(null);

  /** Dialognya sedang terbuka — `focus` dan `click` jangan membukanya dua kali. */
  private terbuka = false;

  private ubah: (v: number | null) => void = () => {};
  private sentuh: () => void = () => {};

  constructor() {
    void this.lookup.muat().then(() => {
      // Nilai bisa terpasang sebelum daftarnya selesai dimuat — misalnya
      // saat dialog membuka dokumen lama. Labelnya baru dapat disusun
      // setelah daftar ada, jadi disegarkan di sini.
      const id = this.idTerpilih();
      if (id !== null) this.teks.set(this.lookup.label(this.lookup.cari(id)));
    });
  }

  terpilih(): RekeningRingkas | undefined {
    return this.lookup.cari(this.idTerpilih());
  }

  // ---- ControlValueAccessor --------------------------------------------

  writeValue(nilai: number | null): void {
    const id = nilai === null || nilai === undefined ? null : Number(nilai);
    this.idTerpilih.set(id);
    this.teks.set(id === null ? '' : this.lookup.label(this.lookup.cari(id)));
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.ubah = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.sentuh = fn;
  }

  setDisabledState(nonaktif: boolean): void {
    this.nonaktif.set(nonaktif);
  }

  // ---- Interaksi --------------------------------------------------------

  buka(): void {
    if (this.nonaktif() || this.terbuka) return;
    this.terbuka = true;
    this.sentuh();

    this.dialog
      .open(BankAccountPickerComponent, {
        data: {
          terpilihID: this.idTerpilih(),
          bolehKosong: this.bolehKosong(),
        },
        autoFocus: false,
        maxWidth: '94vw',
      })
      .afterClosed()
      .subscribe((hasil: HasilPemilihRekening | undefined) => {
        this.terbuka = false;

        // Ditutup tanpa memilih: TIDAK mengubah apa pun. Berbeda dari
        // "kosongkan pilihan", yang mengembalikan `{ hapus: true }`.
        if (!hasil) return;

        if (hasil.hapus) {
          this.idTerpilih.set(null);
          this.teks.set('');
          this.ubah(null);
          return;
        }

        if (hasil.rekening) {
          const id = Number(hasil.rekening.id);
          this.idTerpilih.set(id);
          this.teks.set(this.lookup.label(this.lookup.cari(id)));
          this.ubah(id);
        }
      });
  }
}
