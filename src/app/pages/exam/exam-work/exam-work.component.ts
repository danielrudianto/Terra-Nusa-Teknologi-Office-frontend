import { Component, HostBinding, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
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
import { PaletUjianService } from '../palet-ujian.service';

import { AknLogoComponent } from '../bagian/akn-logo.component';
import { TemaUjianComponent } from '../bagian/tema-ujian.component';
import { KakiAknComponent } from '../bagian/kaki-akn.component';

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
    AknLogoComponent,
    TemaUjianComponent,
    KakiAknComponent,
  ],
  templateUrl: './exam-work.component.html',
  styleUrl: './exam-work.component.scss',
})
export class ExamWorkComponent implements OnInit, OnDestroy {
  private readonly paletSvc = inject(PaletUjianService);

  /**
   * Palet yang dipilih di halaman depan IKUT TERBAWA ke sini.
   *
   * Tanpa ini, warnanya berganti sendiri tepat pada saat pelamar menekan
   * "Mulai ujian" — dan pergantian yang tidak ia minta, di detik pertama
   * timer berjalan, terbaca sebagai sesuatu yang rusak.
   */
  @HostBinding('attr.data-palet') get paletHost(): string {
    return this.paletSvc.palet();
  }

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
  //: `menunggu` = ada ketikan yang belum berangkat ke server.
  //:
  //: Dibedakan dari `menyimpan`: yang pertama berarti permintaannya belum
  //: dikirim, yang kedua berarti sedang berjalan. Menyamakannya membuat
  //: penanda menampilkan "menyimpan..." selama dua detik jeda ketikan,
  //: padahal belum ada apa pun yang dikirim — dan pelamar yang menutup
  //: tabnya di detik itu mengira jawabannya sudah aman.
  keadaanSimpan:
    | 'diam'
    | 'menunggu'
    | 'menyimpan'
    | 'tersimpan'
    | 'gagal' = 'diam';

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
  private detak?: ReturnType<typeof setInterval>;
  private readonly ketikan = new Subject<void>();

  /**
   * Ada perubahan yang BELUM sampai ke server.
   *
   * Dipakai tiga penyimpan sekaligus — ketikan, detak berkala, dan saat tab
   * disembunyikan — supaya ketiganya tidak mengirim permintaan untuk
   * jawaban yang sudah tersimpan.
   */
  private kotor = false;

  /** Sedang ada permintaan simpan berjalan; mencegah dua sekaligus. */
  private sedangSimpan = false;

  /** Berapa kali simpan gagal berturut-turut; menentukan jeda coba lagi. */
  private gagalBeruntun = 0;

  /**
   * DETAK BERKALA.
   *
   * Sebelumnya satu-satunya pemicu simpan adalah berhentinya ketikan selama
   * dua detik. Pelamar yang mengetik terus-menerus selama sepuluh menit
   * karena itu tidak pernah tersimpan sekali pun, dan yang berhenti mengetik
   * lalu berpindah aplikasi kehilangan ketikan terakhirnya.
   */
  private static readonly DETAK_MS = 20000;

  /** Jeda coba-lagi setelah gagal: 3s, 6s, 12s, lalu tetap 24s. */
  private static readonly JEDA_ULANG_MS = [3000, 6000, 12000, 24000];

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

    /*
     * Detak berkala, SELAIN pemicu ketikan.
     *
     * Hanya menyimpan bila memang ada perubahan (`kotor`), jadi ujian yang
     * ditinggal diam tidak membebani server sama sekali.
     */
    this.detak = setInterval(
      () => this.simpan(),
      ExamWorkComponent.DETAK_MS,
    );

    this.mulai();
  }

  ngOnDestroy(): void {
    if (this.jam) clearInterval(this.jam);
    if (this.detak) clearInterval(this.detak);
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
    this.kotor = true;
    this.keadaanSimpan = 'menunggu';
    this.ketikan.next();
  }

  /**
   * Simpan saat tab DISEMBUNYIKAN — bukan hanya saat ditutup.
   *
   * `beforeunload` diabaikan banyak peramban ponsel, dan berpindah aplikasi
   * di ponsel tidak pernah memicunya sama sekali. `visibilitychange` dan
   * `pagehide` justru yang menyala di situ, dan keduanya yang menyelamatkan
   * ketikan terakhir pelamar yang ditelepon di tengah ujian.
   */
  @HostListener('document:visibilitychange')
  simpanSaatDisembunyikan(): void {
    // HANYA saat berpindah ke tersembunyi. Kembali terlihat tidak perlu
    // menyimpan apa pun — dan menyimpan di situ mengirim permintaan setiap
    // kali pelamar bertukar tab.
    if (document.visibilityState === 'hidden') this.simpan();
  }

  @HostListener('window:pagehide')
  simpanSaatPergi(): void {
    this.simpan();
  }

  /** Tombol simpan manual — lihat keterangan di templatnya. */
  simpanSekarang(): void {
    this.kotor = true;
    this.simpan();
  }

  simpan(): void {
    if (this.terkirim || !this.soal.length || this.waktuHabis) return;

    /*
     * Tidak ada perubahan berarti tidak ada permintaan.
     *
     * Tanpa penjaga ini, detak berkala mengirim jawaban yang sama setiap
     * dua puluh detik sepanjang sembilan puluh menit — untuk setiap pelamar
     * yang sedang membaca soal tanpa mengetik apa pun.
     */
    if (!this.kotor) return;

    // Satu permintaan pada satu waktu. Dua simpan yang tumpang tindih dapat
    // tiba di server terbalik urutannya, dan yang lebih lama menimpa yang
    // lebih baru.
    if (this.sedangSimpan) return;

    this.sedangSimpan = true;
    this.keadaanSimpan = 'menyimpan';

    // Ditandai bersih SEBELUM permintaannya berangkat: ketikan yang datang
    // selama permintaan berjalan harus menandainya kotor lagi, supaya
    // ketikan itu tidak ikut dianggap tersimpan.
    this.kotor = false;

    this.http
      .put<any>(`${environment.url}hr/exam/${this.token}/jawaban`, {
        answers: this.jawaban,
      })
      .subscribe({
        next: (res) => {
          this.sedangSimpan = false;
          this.gagalBeruntun = 0;
          this.keadaanSimpan = this.kotor ? 'menunggu' : 'tersimpan';
          // Sisa waktu diselaraskan ke server setiap kali menyimpan.
          //
          // Hitungan di layar melenceng bila tabnya sempat tidak aktif —
          // peramban memperlambat pewaktu pada tab latar belakang.
          if (typeof res?.sisaDetik === 'number') {
            this.sisaDetik = res.sisaDetik;
          }
        },
        error: () => {
          this.sedangSimpan = false;
          // Gagal berarti jawabannya BELUM sampai — dikotorkan kembali
          // supaya percobaan berikutnya benar-benar mengirimnya.
          this.kotor = true;
          this.keadaanSimpan = 'gagal';
          this.jadwalkanUlang();
        },
      });
  }

  /**
   * Coba lagi setelah gagal, dengan jeda yang memanjang.
   *
   * Sebelumnya kegagalan hanya mengubah penanda menjadi "gagal" dan berhenti
   * di situ: begitu sinyal pelamar putus sebentar, autosave berhenti bekerja
   * sampai ia mengetik lagi — dan yang sudah selesai mengetik tidak akan
   * mengetik lagi.
   *
   * Jedanya memanjang supaya sambungan yang benar-benar mati tidak dihujani
   * permintaan, tetapi tidak pernah menyerah: detak berkala tetap jalan di
   * belakangnya sebagai jaring terakhir.
   */
  private jadwalkanUlang(): void {
    const jeda =
      ExamWorkComponent.JEDA_ULANG_MS[
        Math.min(this.gagalBeruntun, ExamWorkComponent.JEDA_ULANG_MS.length - 1)
      ];
    this.gagalBeruntun++;
    setTimeout(() => this.simpan(), jeda);
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
          this.kotor = false;
          if (this.jam) clearInterval(this.jam);
          if (this.detak) clearInterval(this.detak);
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
