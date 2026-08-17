import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
  inject,
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
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';

interface PicRingkas {
  id: number;
  name: string;
  phoneNumber: string | null;
  position: string | null;
}

/**
 * Pemilih penanggung jawab dari daftar karyawan.
 *
 * Nilai yang tersimpan adalah TEKS NAMANYA, bukan id. Alasannya: dokumen
 * mencantumkan nama, dan yang dituju tidak selalu karyawan tetap — sebagian
 * purchase order menyebut penanggung jawab yang tidak ada di daftar sama
 * sekali. Mengikat pada id membuat nama semacam itu tidak dapat diisi.
 *
 * Karena itu mengetik bebas tetap diperbolehkan. Memilih dari daftar hanya
 * jalan yang lebih cepat, bukan satu-satunya jalan.
 *
 * Daftarnya berasal dari rute yang mengembalikan nama dan telepon SAJA —
 * tabel karyawan memuat gaji dan riwayat kesehatan, dan yang membuat purchase
 * order tidak perlu melihatnya.
 */
@Component({
  selector: 'app-pic-autocomplete',
  standalone: true,
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
      useExisting: forwardRef(() => PicAutocompleteComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="pica">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        autocomplete="off"
        type="search"
        [matAutocomplete]="auto"
        [ngModel]="teks"
        (ngModelChange)="onKetik($event)"
        (blur)="onSentuh()"
        [placeholder]="placeholder"
      />

      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="pilih($event.option.value)">
        @for (p of saran; track p.id) {
          <mat-option [value]="p">
            <span class="pica__nama">{{ p.name }}</span>
            @if (p.position) {
              <span class="pica__jab">{{ p.position }}</span>
            }
          </mat-option>
        }
      </mat-autocomplete>

      <mat-hint>{{ 'poForm.picHint' | translate }}</mat-hint>
    </mat-form-field>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .pica {
        width: 100%;
      }

      .pica__nama {
        font-weight: 500;
      }

      /* Jabatan membedakan dua orang bernama sama. */
      .pica__jab {
        margin-left: 0.4rem;
        font-size: 0.78rem;
        color: var(--muted, #8a90a0);
      }
    `,
  ],
})
export class PicAutocompleteComponent implements ControlValueAccessor {
  private readonly apiService = inject(ApiService);

  @Input() label = '';
  @Input() placeholder = '';

  /**
   * Nomor telepon orang yang dipilih.
   *
   * Diteruskan keluar supaya layar dapat mengisikannya ke isian telepon di
   * sebelahnya — menyalinnya tangan dari layar lain persis pekerjaan yang
   * hendak dihilangkan.
   */
  @Output() teleponTerpilih = new EventEmitter<string>();

  teks = '';
  saran: PicRingkas[] = [];

  private readonly ketikan = new Subject<string>();

  private ubah: (v: string) => void = () => {};
  private sentuh: () => void = () => {};

  constructor() {
    /*
     * Ditunda 250 ms.
     *
     * Tanpa ini setiap ketukan huruf mengirim satu permintaan; mengetik
     * sepuluh huruf berarti sepuluh permintaan yang sembilan di antaranya
     * sudah usang sebelum jawabannya tiba.
     */
    this.ketikan
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((q) => this.muat(q));
  }

  private muat(keyword: string): void {
    this.apiService
      .get('employees/pilihan-pic', keyword ? { keyword } : {})
      .subscribe({
        next: (res: any) => (this.saran = res || []),
        // Gagal memuat TIDAK menghalangi pengetikan: nilainya teks bebas,
        // dan daftar hanyalah jalan pintas.
        error: () => (this.saran = []),
      });
  }

  onKetik(v: string): void {
    this.teks = v ?? '';
    this.ubah(this.teks);
    this.ketikan.next(this.teks);
  }

  pilih(p: PicRingkas): void {
    this.teks = p.name;
    this.ubah(this.teks);
    if (p.phoneNumber) this.teleponTerpilih.emit(p.phoneNumber);
  }

  onSentuh(): void {
    this.sentuh();
  }

  // ---- ControlValueAccessor ---------------------------------------------

  writeValue(v: string | null): void {
    this.teks = (v ?? '').toString();
  }

  registerOnChange(fn: (v: string) => void): void {
    this.ubah = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.sentuh = fn;
  }
}
