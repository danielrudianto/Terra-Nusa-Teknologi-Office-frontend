import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';

interface KlienRingkas {
  id: number;
  prefix?: string | null;
  name: string;
  city?: string | null;
}

/**
 * Pemilih klien berbentuk autocomplete.
 *
 * BERBEDA dari `ClientSelectorComponent`, yang berupa dialog dan dipakai
 * layar faktur penjualan. Yang ini komponen isian biasa: dipasang langsung
 * di formulir, sehingga tidak menjadi dialog di dalam dialog saat proyek
 * dibuat dari dialog.
 *
 * Menggantikan `mat-select` pada formulir proyek. Select memuat sejumlah
 * tertentu klien lalu berhenti — dua ratus pada pemasangan sebelumnya —
 * sehingga klien di luar itu tidak pernah muncul, dan penggunanya
 * menyimpulkan datanya belum terdaftar lalu membuat data ganda.
 *
 * Pencariannya di SERVER, bukan menyaring daftar yang sudah dimuat: dengan
 * begitu jumlah klien tidak lagi punya batas atas.
 *
 * PILIHAN WAJIB. Mengetik nama yang mirip tidak cukup — nilainya baru terisi
 * setelah satu klien benar-benar dipilih dari daftar.
 */
@Component({
  selector: 'app-client-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './client-autocomplete.component.html',
  styleUrl: './client-autocomplete.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ClientAutocompleteComponent),
      multi: true,
    },
    {
      // Validator disediakan komponennya sendiri: yang tahu bahwa teks di
      // kotak belum menunjuk klien mana pun adalah komponen ini. Menyerahkan
      // aturan itu ke tiap formulir berarti menulisnya ulang di setiap layar,
      // dan satu yang terlupa membuat proyek tersimpan menunjuk klien yang
      // tidak ada.
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ClientAutocompleteComponent),
      multi: true,
    },
  ],
})
export class ClientAutocompleteComponent
  implements ControlValueAccessor, Validator
{
  constructor(private apiService: ApiService) {
    this.cari$
      .pipe(
        // Menunggu ketikan berhenti; tanpa ini setiap huruf memanggil server.
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((kata) => {
          this.isLoading = true;
          return this.apiService.get('clients', {
            page: 1,
            pageSize: 20,
            keyword: kata || undefined,
          });
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.saran = (res?.data ?? res ?? []) as KlienRingkas[];
          this.isLoading = false;
        },
        error: () => {
          // Gagal mencari tidak perlu menghentikan pengisian; daftarnya
          // dikosongkan dan penggunanya dapat mencoba lagi.
          this.saran = [];
          this.isLoading = false;
        },
      });
  }

  @Input() label = 'client.selectorLabel';
  @Input() required = true;
  @Input() disabled = false;

  // Menampung objek klien, bukan teks: `displayWith` yang merender.
  teks = new FormControl<KlienRingkas | string | null>(null);
  saran: KlienRingkas[] = [];
  isLoading = false;

  /** Klien yang benar-benar terpilih; null bila belum ada. */
  terpilih: KlienRingkas | null = null;

  private cari$ = new Subject<string>();
  private _onChange: (v: number | null) => void = () => {};
  private _onTouched: () => void = () => {};

  /** Nama seperti yang terlihat di layar: awalan diikuti namanya. */
  tampilan = (k: KlienRingkas | null): string => {
    if (!k) return '';
    return [k.prefix, k.name].filter(Boolean).join(' ');
  };

  /**
   * Dipanggil saat pengguna MENGETIK, dengan teks mentah dari kotaknya.
   *
   * Teks diambil dari elemennya, bukan dari `teks.value`: setelah satu klien
   * dipilih, nilai kontrolnya berupa OBJEK klien — dan membacanya sebagai
   * teks menghasilkan pencarian atas "[object Object]".
   */
  onKetik(nilai: string): void {
    /*
     * Mengetik membatalkan pilihan sebelumnya.
     *
     * Tanpa ini, mengubah teks setelah memilih meninggalkan nilai lama
     * sementara yang terbaca di layar sudah berbeda — dan proyeknya
     * tersimpan menunjuk klien yang tidak sedang dilihat penggunanya.
     */
    if (this.terpilih && nilai !== this.tampilan(this.terpilih)) {
      this.terpilih = null;
      this._onChange(null);
    }
    this.cari$.next(nilai ?? '');
  }

  onFokus(): void {
    // Daftar awal muncul tanpa perlu mengetik lebih dulu.
    if (!this.saran.length) this.cari$.next(this.teksMentah);
  }

  /**
   * Isi kotak sebagai TEKS, apa pun bentuk nilainya.
   *
   * Setelah satu klien dipilih, nilai kontrolnya berupa objek klien.
   * Membacanya langsung sebagai teks menghasilkan "[object Object]" — baik
   * saat dipakai mencari maupun saat diperiksa validatornya.
   */
  private get teksMentah(): string {
    const v = this.teks.value;
    if (!v) return '';
    return typeof v === 'string' ? v : this.tampilan(v);
  }

  /**
   * Satu klien dipilih dari daftar.
   *
   * Nilai kotaknya TIDAK disetel di sini. `mat-option [value]="k"` sudah
   * menulis objek kliennya, dan `displayWith` yang mengubahnya menjadi teks.
   * Menimpanya dengan teks membuat `displayWith` menerima string — yang
   * tidak punya `prefix` maupun `name` — sehingga kotaknya justru tampil
   * KOSONG tepat setelah pengguna memilih.
   *
   * `isUserInput` diperiksa karena `onSelectionChange` juga menyala saat
   * pilihan sebelumnya DILEPAS; tanpa penjagaan itu, memilih klien kedua
   * menjalankan fungsi ini dua kali dengan klien yang berbeda.
   */
  pilih(k: KlienRingkas, dariPengguna: boolean): void {
    if (!dariPengguna) return;
    this.terpilih = k;
    this._onChange(k.id);
    this._onTouched();
  }

  bersihkan(): void {
    this.terpilih = null;
    // Dikosongkan dengan null, bukan string: `displayWith` menangani null,
    // sedangkan string kosong akan dibacanya sebagai klien tanpa nama.
    this.teks.setValue(null, { emitEvent: false });
    this.saran = [];
    this._onChange(null);
    this._onTouched();
  }

  // ---- ControlValueAccessor ---------------------------------------------

  writeValue(nilai: number | null): void {
    if (!nilai) {
      this.terpilih = null;
      this.teks.setValue(null, { emitEvent: false });
      return;
    }
    if (this.terpilih?.id === nilai) return;

    /*
     * Nilai dari luar berupa ID; namanya diambil agar kotaknya tidak tampil
     * kosong saat menyunting proyek yang sudah ada.
     *
     * Tanpa ini, membuka proyek lama memperlihatkan pemilih klien yang
     * kosong — dan menyimpan tanpa menyentuhnya akan menghapus kliennya.
     */
    this.apiService.get(`clients/${nilai}`, {}).subscribe({
      next: (k: any) => {
        if (!k) return;
        this.terpilih = k as KlienRingkas;
        // Objeknya yang disetel, bukan teksnya — `displayWith` yang menulis.
        this.teks.setValue(this.terpilih as any, { emitEvent: false });
      },
      error: () => {},
    });
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(nonaktif: boolean): void {
    this.disabled = nonaktif;
    if (nonaktif) this.teks.disable();
    else this.teks.enable();
  }

  // ---- Validator ---------------------------------------------------------

  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.required) return null;
    if (control.value) return null;
    // Dibedakan: sudah mengetik tetapi belum memilih, versus benar-benar
    // kosong. Yang pertama jauh lebih mudah disalahpahami penggunanya.
    return this.teksMentah.trim()
      ? { clientNotSelected: true }
      : { required: true };
  }
}
