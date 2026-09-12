import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';

import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import {
  DataRekap,
  PenawaranRekap,
  biayaSebenarnya,
  tidakLengkap,
} from 'src/app/helpers/tender-rekap.helper';

/** Alasan sependek ini tidak menerangkan apa pun; disamakan dengan server. */
export const MINIMAL_ALASAN = 10;

export interface DataKeputusan {
  /** `pemenang` memilih pemasok; `tutup` mengakhiri tanpa memilih. */
  mode: 'pemenang' | 'tutup';
  rekap: DataRekap;
}

export interface HasilKeputusan {
  mode: 'pemenang' | 'tutup';
  winnerQuoteID: number | null;
  reason: string;
}

/**
 * Keputusan akhir sebuah tender.
 *
 * Dua keadaan, satu dialog: memilih pemasok, atau menutup tanpa memilih siapa
 * pun. Keduanya menuntut ALASAN TERTULIS, dan itu bukan formalitas —
 * pemenang tidak selalu yang termurah, dan keputusan TIDAK MEMBELI justru yang
 * paling sering dipertanyakan setahun kemudian sekaligus yang paling sedikit
 * meninggalkan dokumen.
 *
 * Digabung menjadi satu komponen karena bentuknya memang sama: daftar pilihan
 * (kosong pada mode tutup) ditambah satu isian alasan. Dua komponen terpisah
 * berarti aturan panjang alasan ditulis dua kali, dan yang satu akan
 * tertinggal ketika yang lain disesuaikan.
 */
@Component({
  selector: 'app-tender-keputusan-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    DialogGeserDirective,
  ],
  templateUrl: './tender-keputusan-dialog.component.html',
  styleUrl: './tender-keputusan-dialog.component.scss',
})
export class TenderKeputusanDialogComponent {
  readonly MINIMAL_ALASAN = MINIMAL_ALASAN;

  formGroup: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private dialogRef: MatDialogRef<TenderKeputusanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DataKeputusan,
  ) {
    this.formGroup = this.formBuilder.group({
      winnerQuoteID: [
        null as number | null,
        this.isPemenang ? Validators.required : [],
      ],
      reason: ['', [Validators.required, Validators.minLength(MINIMAL_ALASAN)]],
    });
  }

  get isPemenang(): boolean {
    return this.data?.mode === 'pemenang';
  }

  get quotes(): PenawaranRekap[] {
    return this.data?.rekap?.quotes ?? [];
  }

  biaya(q: PenawaranRekap): number {
    return biayaSebenarnya(this.data.rekap, q);
  }

  sebagian(q: PenawaranRekap): boolean {
    return tidakLengkap(this.data.rekap, q);
  }

  nama(q: PenawaranRekap): string {
    return `${q.supplierPrefix ?? ''} ${q.supplierName ?? ''}`.trim();
  }

  /**
   * Biaya sebenarnya TERENDAH di antara penawaran yang lengkap.
   *
   * Ditandai, tetapi tidak dipilihkan. Yang termurah belum tentu yang dipilih
   * — waktu kirim, garansi, dan riwayat pemasok ikut menentukan — dan memilih
   * otomatis akan membuat keputusannya tampak sudah diambil sistem.
   */
  get terendah(): number | null {
    const lengkap = this.quotes.filter((q) => !this.sebagian(q));
    if (lengkap.length < 2) return null;
    return Math.min(...lengkap.map((q) => this.biaya(q)));
  }

  isTerendah(q: PenawaranRekap): boolean {
    const m = this.terendah;
    return m !== null && !this.sebagian(q) && this.biaya(q) === m;
  }

  simpan(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }
    const v = this.formGroup.getRawValue();
    const hasil: HasilKeputusan = {
      mode: this.data.mode,
      winnerQuoteID: this.isPemenang ? Number(v.winnerQuoteID) : null,
      reason: String(v.reason || '').trim(),
    };
    this.dialogRef.close(hasil);
  }

  batal(): void {
    this.dialogRef.close();
  }
}
