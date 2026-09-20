import { CommonModule } from '@angular/common';
import { Component, Inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
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

/**
 * Apa pun yang keluar dari datepicker menjadi `Date` biasa — atau `null`.
 *
 * KENAPA INI PERLU
 *
 * Aplikasi ini mendaftarkan `provideMomentDateAdapter(...)` di `app.module.ts`.
 * Artinya SETIAP datepicker Material di sini menghasilkan objek **Moment**,
 * bukan `Date`. Moment tidak punya `getFullYear()`; ia punya `year()`.
 *
 * Dialog ini semula menyimpannya apa adanya ke `signal<Date | null>` dan
 * memanggil `getFullYear()` atasnya. Hasilnya di peramban:
 *
 *     TypeError: c.getFullYear is not a function
 *
 * TypeScript tidak dapat menangkapnya: `(ngModelChange)` memancarkan `any`,
 * jadi anotasi `Date` pada signalnya cuma janji yang tidak pernah ditagih.
 * Uji pun tidak — uji `jumlahHari` memberi `Date` sungguhan, karena itu yang
 * ditulis di tipenya. Satu-satunya yang tahu adalah aplikasi yang berjalan.
 *
 * Karena itu penormalannya ditaruh DI PERBATASAN: apa pun bentuk yang datang,
 * yang disimpan selalu `Date`. Moment, Luxon, dan Day.js sama-sama menyediakan
 * `toDate()`, jadi mengganti adapter di kemudian hari tidak menjatuhkan dialog
 * ini lagi.
 */
export function keTanggal(nilai: unknown): Date | null {
  if (nilai === null || nilai === undefined || nilai === '') return null;

  if (nilai instanceof Date) {
    return Number.isNaN(nilai.getTime()) ? null : nilai;
  }

  // Moment / Luxon / Day.js.
  const pustaka = nilai as { toDate?: () => Date; isValid?: () => boolean };
  if (typeof pustaka?.toDate === 'function') {
    // Mengetik tanggal yang tidak masuk akal menghasilkan Moment yang TIDAK
    // sah — dan `toDate()` atasnya memberi `Invalid Date`, yang lolos
    // `instanceof Date` lalu meracuni setiap hitungan di belakangnya.
    if (typeof pustaka.isValid === 'function' && !pustaka.isValid()) return null;
    const d = pustaka.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }

  if (typeof nilai === 'string') {
    /*
     * `YYYY-MM-DD` diurai SENDIRI, tidak diserahkan ke `new Date(teks)`.
     *
     * `new Date('2026-09-14')` dibaca sebagai tengah malam UTC. Di Jakarta
     * (UTC+7) itu menjadi 14 September pukul 07.00 — masih tanggal yang sama,
     * jadi tampak benar. Tetapi di zona barat UTC ia MUNDUR SATU HARI, dan
     * yang mengunduh rekapnya mendapat rentang yang bergeser tanpa satu pun
     * pesan galat.
     */
    const cocok = /^(\d{4})-(\d{2})-(\d{2})/.exec(nilai);
    if (cocok) {
      return new Date(Number(cocok[1]), Number(cocok[2]) - 1, Number(cocok[3]));
    }
    const d = new Date(nilai);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof nilai === 'number' && Number.isFinite(nilai)) {
    const d = new Date(nilai);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
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
    /*
     * `MatNativeDateModule` SENGAJA tidak ada di sini.
     *
     * Adapter tanggal aplikasi ini adalah Moment (`provideMomentDateAdapter`
     * di `app.module.ts`). Mencantumkan modul adapter bawaan di sini memberi
     * kesan dialog ini bekerja dengan `Date` — dan kesan itulah yang membuat
     * signalnya dulu dianotasi `Date` lalu melempar `getFullYear is not a
     * function` di peramban.
     */
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

  /**
   * Dipakai template untuk menormalkan nilai dari datepicker.
   *
   * Disediakan sebagai method, bukan dipanggil di dalam `set()` milik signal,
   * supaya perbatasannya terlihat di templatenya — di situlah nilai asing
   * masuk, dan di situ pula orang berikutnya akan mencarinya.
   */
  readonly keTanggal = keTanggal;

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
