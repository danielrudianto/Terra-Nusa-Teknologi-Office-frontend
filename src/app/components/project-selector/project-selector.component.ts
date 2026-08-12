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

import { ProjectLookupService, ProyekRingkas } from '../../services/project-lookup.service';

/**
 * Pemilih kode proyek.
 *
 *   <app-project-selector formControlName="projectName" />
 *   <app-project-selector formControlName="projectName" [readonly]="true" />
 *
 * Dibuat sebagai ControlValueAccessor agar dapat menggantikan
 * `<input matInput formControlName="projectName">` tanpa mengubah susunan
 * formulir yang sudah ada — penting karena kolom ini muncul di lebih dari
 * dua puluh berkas.
 *
 * Nilai yang ditulis ke formulir tetap berupa KODE (string), sama seperti
 * sebelumnya. Tidak ada perubahan yang dibutuhkan di sisi server.
 *
 * Kode yang tidak terdaftar tidak ditolak, hanya ditandai. Dokumen lama
 * memuat kode yang belum tentu ada di master, dan menolaknya akan membuat
 * dokumen itu tidak bisa disimpan ulang sama sekali.
 */
@Component({
  selector: 'app-project-selector',
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
      useExisting: forwardRef(() => ProjectSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="ps">
      <mat-label>{{ label() || ('project.code' | translate) }}</mat-label>

      <input
        matInput
        [matAutocomplete]="auto"
        [value]="teks()"
        [disabled]="nonaktif()"
        [readonly]="readonly()"
        [placeholder]="'project.selectorPlaceholder' | translate"
        (input)="onKetik($event)"
        (blur)="onSentuh()"
      />

      <mat-autocomplete
        #auto="matAutocomplete"
        (optionSelected)="onPilih($event.option.value)"
      >
        @for (p of saran(); track p.id) {
          <mat-option [value]="p.code">
            <span class="ps-kode">{{ p.code }}</span>
            <span class="ps-nama">{{ p.name }}</span>
            @if (p.isCancelled) {
              <span class="ps-tanda ps-tanda--batal">{{
                'project.state.batal' | translate
              }}</span>
            } @else if (!p.isActive) {
              <span class="ps-tanda">{{
                'project.state.selesai' | translate
              }}</span>
            }
          </mat-option>
        }
      </mat-autocomplete>

      @if (terpilih(); as p) {
        <mat-hint class="ps-hint">{{ p.name }}</mat-hint>
      } @else if (teks() && !lookup.dikenal(teks())) {
        <mat-hint class="ps-hint ps-hint--asing">
          <mat-icon>error_outline</mat-icon>
          {{ 'project.unknownCode' | translate }}
        </mat-hint>
      }
    </mat-form-field>
  `,
  styles: [
    `
      .ps {
        width: 100%;
      }
      .ps-kode {
        font-weight: 700;
        margin-right: 0.6rem;
      }
      .ps-nama {
        color: var(--muted);
        font-size: 0.85em;
      }
      .ps-tanda {
        margin-left: 0.5rem;
        font-size: 0.7em;
        font-weight: 600;
        padding: 0.1rem 0.35rem;
        border-radius: 0.25rem;
        background: var(--surface-2);
        color: var(--muted);
      }
      .ps-tanda--batal {
        background: var(--bad-bg);
        color: var(--bad-fg);
      }
      .ps-hint {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      .ps-hint--asing {
        color: var(--warn-fg);
      }
      .ps-hint--asing .mat-icon {
        width: 1em;
        height: 1em;
        font-size: 1em;
        line-height: 1em;
      }
    `,
  ],
})
export class ProjectSelectorComponent implements ControlValueAccessor {
  readonly lookup = inject(ProjectLookupService);

  /** Label kolom. Kosong berarti memakai label bawaan. */
  readonly label = input<string>('');
  /** Hanya baca: dipakai bila kodenya diturunkan dari nomor dokumen. */
  readonly readonly = input(false);

  readonly teks = signal('');
  readonly nonaktif = signal(false);

  private ubah: (v: string) => void = () => {};
  private sentuh: () => void = () => {};

  constructor() {
    void this.lookup.muat();
  }

  /** Saran yang tampil: disaring, dan yang batal ditaruh paling belakang. */
  saran(): ProyekRingkas[] {
    const daftar = this.lookup.saring(this.teks());
    return [...daftar].sort((a, b) => {
      const bobot = (p: ProyekRingkas) =>
        p.isCancelled ? 2 : p.isActive ? 0 : 1;
      return bobot(a) - bobot(b) || a.code.localeCompare(b.code);
    });
  }

  terpilih(): ProyekRingkas | undefined {
    return this.lookup.cari(this.teks());
  }

  // ---- ControlValueAccessor --------------------------------------------

  writeValue(nilai: string | null): void {
    this.teks.set((nilai ?? '').toString());
  }

  registerOnChange(fn: (v: string) => void): void {
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
    /*
     * Kode diseragamkan huruf besar dan tanpa spasi sejak diketik.
     *
     * Inilah sumber utama kode kembar sebelumnya: "micz", "MICZ ", dan
     * "MICZ" tersimpan sebagai tiga proyek berbeda. Menyeragamkannya di
     * sini membuat yang terlihat sama dengan yang tersimpan.
     */
    const mentah = (ev.target as HTMLInputElement).value ?? '';
    const bersih = mentah.toUpperCase().replace(/\s+/g, '');
    if (bersih !== mentah) {
      (ev.target as HTMLInputElement).value = bersih;
    }
    this.teks.set(bersih);
    this.ubah(bersih);
  }

  onPilih(kode: string): void {
    this.teks.set(kode);
    this.ubah(kode);
  }

  onSentuh(): void {
    this.sentuh();
  }
}
