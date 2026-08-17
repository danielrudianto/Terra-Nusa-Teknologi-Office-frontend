import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime } from 'rxjs';

import { environment } from 'src/environments/environment';

interface SoalUjian {
  id: number;
  sortOrder: number;
  question: string;
  notes: string | null;
  attachment: string | null;
  category: string | null;
  maxScore: number | null;
  allowsUpload: boolean;
}

/**
 * Halaman pengerjaan ujian.
 *
 * Dibuka pelamar lewat tautan bertoken, TANPA akun. Karena itu tidak ada satu
 * pun penjagaan di sini yang boleh dianggap mengamankan apa pun — timer,
 * masa berlaku, dan kepemilikan soal semuanya diperiksa ulang di server.
 * Yang ada di layar hanya untuk menolong yang mengerjakan, bukan menahan
 * yang hendak menyiasati.
 */
@Component({
  selector: 'app-exam-work',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './exam-work.component.html',
  styleUrl: './exam-work.component.scss',
})
export class ExamWorkComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  token = '';
  memuat = true;
  galat = '';

  soal: SoalUjian[] = [];
  jawaban: Record<string, string> = {};

  /** Sisa waktu dalam detik; sumbernya server, dihitung mundur di layar. */
  sisaDetik = 0;
  durasiMenit = 0;

  mengirim = false;
  terkirim = false;

  /**
   * Keadaan penyimpanan otomatis.
   *
   * Ditampilkan supaya yang mengerjakan tahu pekerjaannya aman. Tanpa
   * penanda, satu-satunya cara memastikan adalah memuat ulang halaman — dan
   * itu justru yang paling ditakuti saat ujian berjalan.
   */
  keadaanSimpan: 'diam' | 'menyimpan' | 'tersimpan' | 'gagal' = 'diam';

  /** Soal yang belum dijawab; dipakai peringatan sebelum mengirim. */
  get belumDijawab(): SoalUjian[] {
    return this.soal.filter((s) => !String(this.jawaban[s.id] || '').trim());
  }

  get waktuHabis(): boolean {
    return this.sisaDetik <= 0;
  }

  /** Kurang dari lima menit; dipakai menyalakan peringatan merah. */
  get hampirHabis(): boolean {
    return this.sisaDetik > 0 && this.sisaDetik <= 300;
  }

  get waktuTeks(): string {
    const d = Math.max(this.sisaDetik, 0);
    const j = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const dt = d % 60;
    const dd = (n: number) => String(n).padStart(2, '0');
    return j > 0 ? `${j}:${dd(m)}:${dd(dt)}` : `${dd(m)}:${dd(dt)}`;
  }

  private jam?: ReturnType<typeof setInterval>;
  private readonly ketikan = new Subject<void>();

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.router.navigate(['/exam']);
      return;
    }

    /*
     * Menyimpan ditunda 2 detik setelah ketikan terakhir.
     *
     * Menyimpan pada setiap ketukan huruf mengirim ratusan permintaan untuk
     * satu jawaban; menunggu sampai selesai mengetik berarti tidak pernah
     * tersimpan bagi yang mengetik terus-menerus. Dua detik cukup lama untuk
     * menggabungkan satu kalimat, cukup pendek untuk tidak kehilangan banyak.
     */
    this.ketikan.pipe(debounceTime(2000)).subscribe(() => this.simpan());

    this.mulai();
  }

  ngOnDestroy(): void {
    if (this.jam) clearInterval(this.jam);
  }

  /**
   * Peringatan sebelum menutup tab.
   *
   * Menutup tab di tengah ujian adalah kesalahan yang tidak dapat
   * diperbaiki: waktunya terus berjalan, dan yang belum tersimpan hilang.
   */
  @HostListener('window:beforeunload', ['$event'])
  cegahTutup(e: BeforeUnloadEvent): void {
    if (!this.terkirim && this.soal.length && !this.waktuHabis) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  private mulai(): void {
    this.http
      .post<any>(`${environment.url}hr/exam/${this.token}/mulai`, {})
      .subscribe({
        next: (res) => {
          this.soal = res?.questions || [];
          this.jawaban = res?.answers || {};
          this.sisaDetik = Number(res?.sisaDetik) || 0;
          this.durasiMenit = Number(res?.durationMinutes) || 0;
          this.memuat = false;
          this.jalankanJam();
        },
        error: (e) => {
          this.memuat = false;
          this.galat =
            e?.error?.detail ||
            this.translate.instant('examWork.gagalMemuat');
        },
      });
  }

  private jalankanJam(): void {
    if (this.jam) clearInterval(this.jam);
    this.jam = setInterval(() => {
      if (this.sisaDetik > 0) this.sisaDetik--;
      /*
       * Habisnya waktu TIDAK mengirim otomatis.
       *
       * Yang sedang mengetik saat detik terakhir akan kehilangan kalimatnya
       * bila layarnya berpindah sendiri. Jawaban terakhir sudah tersimpan
       * berkala, dan tombol Kirim tetap dapat ditekan — servernya yang
       * memutuskan apakah masih diterima.
       */
    }, 1000);
  }

  onKetik(): void {
    this.ketikan.next();
  }

  simpan(): void {
    if (this.terkirim || !this.soal.length) return;
    this.keadaanSimpan = 'menyimpan';
    this.http
      .put<any>(`${environment.url}hr/exam/${this.token}/jawaban`, {
        answers: this.jawaban,
      })
      .subscribe({
        next: (res) => {
          this.keadaanSimpan = 'tersimpan';
          // Sisa waktu diselaraskan ke server setiap kali menyimpan.
          //
          // Hitungan di layar melenceng bila tabnya sempat tidak aktif —
          // peramban memperlambat pewaktu pada tab latar belakang.
          if (typeof res?.sisaDetik === 'number') {
            this.sisaDetik = res.sisaDetik;
          }
        },
        error: () => (this.keadaanSimpan = 'gagal'),
      });
  }

  kirim(): void {
    if (this.mengirim || this.terkirim) return;
    this.mengirim = true;
    this.http
      .post<any>(`${environment.url}hr/exam/${this.token}/kirim`, {
        answers: this.jawaban,
      })
      .subscribe({
        next: () => {
          this.terkirim = true;
          this.mengirim = false;
          if (this.jam) clearInterval(this.jam);
        },
        error: (e) => {
          this.mengirim = false;
          this.galat =
            e?.error?.detail || this.translate.instant('examWork.gagalKirim');
        },
      });
  }

  /** Gulir ke soal tertentu; dipakai daftar soal yang belum dijawab. */
  keSoal(id: number): void {
    document
      .getElementById(`soal-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
