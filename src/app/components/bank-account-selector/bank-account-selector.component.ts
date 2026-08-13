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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

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
 * WAJIB DIPILIH DARI DAFTAR. Berbeda dari pemilih proyek yang menerima kode
 * asing dengan peringatan, di sini nilainya adalah id: teks yang tidak cocok
 * dengan rekening mana pun tidak punya arti sama sekali. Karena itu, isian
 * yang tidak cocok menjadikan nilainya `null` — bukan disimpan apa adanya —
 * sehingga validator `required` menangkapnya dan formulir tidak dapat
 * dikirim dengan rekening yang tidak ada.
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
    MatAutocompleteModule,
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
        [matAutocomplete]="auto"
        [value]="teks()"
        [disabled]="nonaktif()"
        [placeholder]="'bank.selectorPlaceholder' | translate"
        (input)="onKetik($event)"
        (blur)="onKehilanganFokus()"
      />
      <mat-icon matSuffix>search</mat-icon>

      <mat-autocomplete
        #auto="matAutocomplete"
        (optionSelected)="onPilih($event.option.value)"
      >
        @for (r of saran(); track r.id) {
          <mat-option [value]="r.id">
            <span class="bas-nomor">{{ r.bankAccountNumber }}</span>
            <span class="bas-nama">{{ r.bankAccountName }}</span>
            <span class="bas-bank">{{ r.bankName }}</span>
          </mat-option>
        }
        @if (saran().length === 0) {
          <mat-option [disabled]="true">
            {{ 'bank.noMatch' | translate }}
          </mat-option>
        }
      </mat-autocomplete>

      @if (terpilih(); as r) {
        <mat-hint>{{ r.bankName }} &middot; {{ r.bankAccountName }}</mat-hint>
      } @else if (teks()) {
        <mat-hint class="bas-hint--asing">
          <mat-icon>error_outline</mat-icon>
          {{ 'bank.mustPick' | translate }}
        </mat-hint>
      }
    </mat-form-field>
  `,
  styles: [
    `
      .bas {
        width: 100%;
      }
      .bas-nomor {
        font-weight: 600;
        margin-right: 0.6rem;
      }
      .bas-nama {
        color: var(--muted);
        font-size: 0.9em;
        margin-right: 0.5rem;
      }
      .bas-bank {
        color: var(--faint);
        font-size: 0.8em;
      }
      .bas-hint--asing {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--warn-fg);
      }
      .bas-hint--asing .mat-icon {
        width: 1em;
        height: 1em;
        font-size: 1em;
        line-height: 1em;
      }
    `,
  ],
})
export class BankAccountSelectorComponent implements ControlValueAccessor {
  readonly lookup = inject(BankLookupService);

  readonly label = input<string>('');

  /** Teks yang tampil di kolom. */
  readonly teks = signal('');
  readonly nonaktif = signal(false);

  /** ID rekening yang sedang terpilih; `null` bila belum ada yang sah. */
  private readonly idTerpilih = signal<number | null>(null);

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

  saran(): RekeningRingkas[] {
    // Bila sudah ada yang terpilih, teksnya adalah label lengkap dan tidak
    // cocok dengan kata kunci mana pun. Daftar penuh ditampilkan agar
    // penggantian rekening tidak memaksa menghapus isian dulu.
    const q = this.terpilih() ? '' : this.teks();
    return this.lookup.saring(q);
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

  onKetik(ev: Event): void {
    this.teks.set((ev.target as HTMLInputElement).value ?? '');

    /*
     * Mengetik membatalkan pilihan sebelumnya.
     *
     * Tanpa ini, mengubah teks tanpa memilih ulang akan meninggalkan id
     * lama — kolomnya menampilkan satu rekening sementara yang tersimpan
     * rekening lain, dan tidak ada yang tahu sampai uangnya salah kirim.
     */
    if (this.idTerpilih() !== null) {
      this.idTerpilih.set(null);
      this.ubah(null);
    }
  }

  onPilih(id: number): void {
    this.idTerpilih.set(Number(id));
    this.teks.set(this.lookup.label(this.lookup.cari(id)));
    this.ubah(Number(id));
  }

  onKehilanganFokus(): void {
    this.sentuh();

    // Teks yang tidak berujung pada pilihan dikosongkan, bukan dibiarkan.
    // Isian yang terlihat terisi padahal nilainya kosong adalah bentuk
    // kekeliruan yang paling sulit disadari.
    if (this.idTerpilih() === null && this.teks()) {
      this.teks.set('');
    }
  }
}
