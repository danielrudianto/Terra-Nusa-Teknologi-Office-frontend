import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

/**
 * Pengisian data karyawan lewat tautan undangan.
 *
 * Dibuka TANPA masuk: yang menandai penggunanya adalah token pada alamatnya.
 * Karyawan lapangan tidak punya akun, dan membuatkan akun untuk pengisian
 * setahun sekali menambah kata sandi yang akan lupa lebih dulu daripada
 * dipakai.
 *
 * Karena itu halaman ini TIDAK memakai `ApiService`: layanan tersebut
 * menyisipkan token login dan mengalihkan ke halaman masuk ketika jawabannya
 * 401 — dan yang membuka halaman ini memang tidak punya keduanya.
 */
@Component({
  selector: 'app-employee-form-fill',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
    MatSlideToggleModule,
  ],
  templateUrl: './employee-form-fill.component.html',
  styleUrl: './employee-form-fill.component.scss',
})
export class EmployeeFormFillComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  isLoading = true;
  isSaving = false;

  /** Tautan tidak berlaku: tidak dikenal, dicabut, atau kedaluwarsa. */
  tidakBerlaku = false;

  token = '';
  employeeName = '';
  pengundang = '';
  expiresAt: string | null = null;

  /** Susunan pertanyaan: daftar bagian, tiap bagian berisi daftar isian. */
  bagian: any[] = [];
  jawaban: Record<string, any> = {};

  /** Ditampilkan setelah tersimpan; hilang begitu ada isian yang disunting. */
  tersimpan = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.tidakBerlaku = true;
      this.isLoading = false;
      return;
    }
    this.muat();
  }

  private get url(): string {
    return `${environment.url}employee-forms/isi/${this.token}`;
  }

  private muat(): void {
    this.http.get<any>(this.url).subscribe({
      next: (res) => {
        this.employeeName = res?.employeeName || '';
        this.pengundang = res?.pengundang || '';
        this.expiresAt = res?.expiresAt || null;
        /*
         * `fields` berbentuk `{ sections: [...] }`, bukan larik.
         *
         * Diambil apa adanya, `@for` atasnya melempar "not iterable" dan
         * SELURUH halaman gagal — bukan hanya bagian itu. Bentuk larik
         * langsung tetap diterima supaya definisi lama, bila ada, tidak
         * ikut jatuh.
         */
        const f = res?.version?.fields;
        this.bagian = Array.isArray(f) ? f : (f?.sections ?? []);
        this.jawaban = res?.answers ?? {};
        this.siapkanDaftar();
        this.isLoading = false;
      },
      error: () => {
        // Tidak dikenal, dicabut, dan kedaluwarsa diperlakukan sama —
        // sebagaimana server menjawabnya.
        this.tidakBerlaku = true;
        this.isLoading = false;
      },
    });
  }

  /**
   * Sisa waktu dalam kalimat, bukan tanggal.
   *
   * "Berlaku sampai 20 Agustus 2026, 14:32" menuntut yang membacanya
   * menghitung sendiri; "sisa 2 hari" langsung memberi tahu seberapa
   * mendesak.
   */
  get sisaWaktu(): string {
    if (!this.expiresAt) return '';
    const selisih = new Date(this.expiresAt).getTime() - Date.now();
    if (selisih <= 0) return this.translate.instant('formFill.sudahLewat');

    const jam = Math.floor(selisih / 3_600_000);
    if (jam >= 24) {
      return this.translate.instant('formFill.sisaHari', {
        n: Math.floor(jam / 24),
      });
    }
    if (jam >= 1) {
      return this.translate.instant('formFill.sisaJam', { n: jam });
    }
    return this.translate.instant('formFill.sisaKurangSejam');
  }

  /** Sisa waktu menipis; ditandai supaya terlihat tanpa dibaca. */
  get segeraHabis(): boolean {
    if (!this.expiresAt) return false;
    const selisih = new Date(this.expiresAt).getTime() - Date.now();
    return selisih > 0 && selisih < 24 * 3_600_000;
  }

  /**
   * Tambah satu baris pada isian berbentuk daftar.
   *
   * Lariknya DIGANTI, bukan disunting di tempat: Angular membandingkan
   * rujukan, dan menambah ke larik yang sama membuat barisnya tidak muncul
   * sampai ada hal lain yang memicu penggambaran ulang.
   */
  /**
   * Simpan jawaban ya/tidak sebagai BOOLEAN, bukan teks.
   *
   * Jawaban lama menyimpan `true` dan `false` sungguhan; menyimpannya sebagai
   * "Ya"/"Tidak" membuat dua bentuk hidup berdampingan di kolom yang sama,
   * dan rekap yang menghitungnya harus menebak mana yang berarti apa.
   */
  setYaTidak(kunci: string, nilai: boolean): void {
    this.jawaban = { ...this.jawaban, [kunci]: !!nilai };
    this.ubah();
  }

  tambahBaris(kunci: string): void {
    const kini = Array.isArray(this.jawaban[kunci]) ? this.jawaban[kunci] : [];
    this.jawaban = { ...this.jawaban, [kunci]: [...kini, {}] };
    this.ubah();
  }

  hapusBaris(kunci: string, i: number): void {
    const kini = Array.isArray(this.jawaban[kunci]) ? this.jawaban[kunci] : [];
    this.jawaban = {
      ...this.jawaban,
      [kunci]: kini.filter((_: any, n: number) => n !== i),
    };
    this.ubah();
  }

  /**
   * Pastikan isian daftar berupa larik sebelum ditampilkan.
   *
   * Jawaban lama dapat memuat `null` pada isian yang dulu belum ada, dan
   * `@for` atas `null` menggagalkan seluruh halaman — bukan hanya baris itu.
   */
  private siapkanDaftar(): void {
    // Penjaga terakhir; `bagian` seharusnya sudah berupa larik, tetapi
    // definisi formulir datang dari basis data dan bentuknya tidak dijamin
    // oleh apa pun di sisi ini.
    if (!Array.isArray(this.bagian)) {
      this.bagian = [];
      return;
    }

    for (const s of this.bagian) {
      for (const f of s?.fields ?? []) {
        if (f?.type !== 'daftar') continue;
        if (!Array.isArray(this.jawaban[f.key])) {
          this.jawaban[f.key] = [];
        }
      }
    }
  }

  ubah(): void {
    this.tersimpan = false;
  }

  simpan(): void {
    this.isSaving = true;
    this.http.put(this.url, { answers: this.jawaban }).subscribe({
      next: () => {
        this.tersimpan = true;
        this.isSaving = false;
        // Tetap di halaman ini, dengan isian yang masih terlihat.
        //
        // Halaman terima kasih memutus kemungkinan membetulkan satu huruf
        // yang baru disadari keliru sedetik setelah menekan kirim.
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(
          err?.error?.detail ||
            this.translate.instant('formFill.gagalSimpan'),
          this.translate.instant('common.close'),
          { duration: 4000 },
        );
      },
    });
  }
}
