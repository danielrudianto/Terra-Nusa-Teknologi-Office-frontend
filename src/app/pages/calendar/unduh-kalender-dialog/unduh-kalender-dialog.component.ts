import { CommonModule } from '@angular/common';
import { Component, Inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { CalendarMonthSelectorComponent } from '../calendar-month-selector/calendar-month-selector.component';

/** Batas rentang, dalam hari. Ditegakkan JUGA di server. */
export const MAKS_HARI_RENTANG = 60;

export type ModeUnduh = 'bulan' | 'rentang';
export type FormatUnduh = 'pdf' | 'xlsx';

export interface HasilUnduhKalender {
  mode: ModeUnduh;
  /** 0-based, seperti `Date.getMonth()`. Hanya berarti bila `mode === 'bulan'`. */
  month: number;
  year: number;
  /** `YYYY-MM-DD`. Hanya berarti bila `mode === 'rentang'`. */
  mulai: string;
  akhir: string;
  format: FormatUnduh;
}

export interface DataUnduhKalender {
  month: number;
  year: number;
  /** Keterangan dasar saldo yang sedang dipakai layar; ikut ke berkasnya. */
  modeSaldo?: string;
}

/**
 * Tanggal lokal menjadi `YYYY-MM-DD`.
 *
 * TIDAK memakai `toISOString()`. `toISOString` mengubah ke UTC lebih dulu,
 * sehingga tanggal yang dipilih di Jakarta (UTC+7) mundur satu hari untuk
 * seluruh jam sebelum pukul 07.00 — dan `Date` dari datepicker bertengger di
 * tengah malam waktu setempat, jadi mundurnya SELALU terjadi, bukan
 * kadang-kadang.
 */
export function tanggalLokal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Selisih hari, INKLUSIF kedua ujungnya. 1 Sep–1 Sep = 1 hari. */
export function jumlahHari(mulai: Date, akhir: Date): number {
  const a = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate());
  const b = new Date(akhir.getFullYear(), akhir.getMonth(), akhir.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

/**
 * Dialog unduh kalender — pilih cakupan lebih dulu, format belakangan.
 *
 * Sebelumnya menu ini hanya menawarkan format, dan cakupannya diam-diam
 * mengikuti bulan yang sedang dibuka. Itu jawaban yang benar untuk satu
 * pertanyaan saja; yang perlu dua bulan sekaligus harus mengunduh dua kali
 * lalu menggabungkannya sendiri — dan saldo awal lembar kedua tidak
 * menyambung ke saldo akhir lembar pertama.
 */
@Component({
  selector: 'app-unduh-kalender-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    DialogGeserDirective,
    CalendarMonthSelectorComponent,
  ],
  templateUrl: './unduh-kalender-dialog.component.html',
  styleUrl: './unduh-kalender-dialog.component.scss',
})
export class UnduhKalenderDialogComponent {
  readonly MAKS = MAKS_HARI_RENTANG;

  readonly mode = signal<ModeUnduh>('bulan');
  readonly format = signal<FormatUnduh>('xlsx');

  month: number;
  year: number;

  readonly mulai = signal<Date | null>(null);
  readonly akhir = signal<Date | null>(null);

  readonly modeSaldo: string;

  constructor(
    private readonly dialogRef: MatDialogRef<UnduhKalenderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: DataUnduhKalender,
  ) {
    this.month = data?.month ?? new Date().getMonth();
    this.year = data?.year ?? new Date().getFullYear();
    this.modeSaldo = data?.modeSaldo ?? '';

    /*
     * Rentang bawaannya BULAN YANG SEDANG DIBUKA, bukan kosong.
     *
     * Berpindah ke mode rentang lalu menemukan dua isian kosong memaksa
     * orang mengarang tanggal dari nol untuk sesuatu yang sudah ia lihat di
     * layar. Diisi lebih dulu, mengubah salah satu ujungnya cukup satu
     * ketukan.
     */
    const awalBulan = new Date(this.year, this.month, 1);
    const akhirBulan = new Date(this.year, this.month + 1, 0);
    this.mulai.set(awalBulan);
    this.akhir.set(akhirBulan);
  }

  /**
   * Batas atas datepicker `akhir`.
   *
   * MENCEGAH, bukan menegur. Rentang yang melewati batas tidak dapat dipilih
   * sejak awal; pesan galat di bawah tetap ada karena `mulai` masih dapat
   * digeser SETELAH `akhir` dipilih, dan pada saat itu batasnya sudah
   * terlampaui tanpa ada yang menyentuh isian `akhir`.
   */
  readonly maksAkhir = computed<Date | null>(() => {
    const m = this.mulai();
    if (!m) return null;
    return new Date(m.getFullYear(), m.getMonth(), m.getDate() + this.MAKS - 1);
  });

  readonly hari = computed<number>(() => {
    const m = this.mulai();
    const a = this.akhir();
    if (!m || !a) return 0;
    return jumlahHari(m, a);
  });

  readonly terbalik = computed<boolean>(() => this.hari() < 1);
  readonly kepanjangan = computed<boolean>(() => this.hari() > this.MAKS);

  readonly sah = computed<boolean>(() => {
    if (this.mode() === 'bulan') return true;
    return !!this.mulai() && !!this.akhir() && !this.terbalik() && !this.kepanjangan();
  });

  onBulanBerubah(e: { month: number; year: number }) {
    this.month = e.month;
    this.year = e.year;
  }

  unduh() {
    if (!this.sah()) return;

    const m = this.mulai();
    const a = this.akhir();

    this.dialogRef.close(<HasilUnduhKalender>{
      mode: this.mode(),
      month: this.month,
      year: this.year,
      mulai: m ? tanggalLokal(m) : '',
      akhir: a ? tanggalLokal(a) : '',
      format: this.format(),
    });
  }
}
