import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from 'src/environments/environment';

/**
 * Halaman depan ujian rekrutmen.
 *
 * Dibuka pelamar TANPA masuk: yang menandai pesertanya adalah tokennya. Dapat
 * dicapai dua jalan — `/exam` lalu mengetik tokennya, atau `/exam/{token}`
 * langsung dari tautan.
 *
 * Keduanya diperlukan: tautan panjang kerap terpotong saat disalin dari
 * WhatsApp, dan yang mengalaminya perlu jalan lain selain meminta tautan baru.
 */
@Component({
  selector: 'app-exam-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './exam-landing.component.html',
  styleUrl: './exam-landing.component.scss',
})
export class ExamLandingComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  isChecking = false;

  /** Token diketik sendiri; terisi otomatis bila datang dari tautan. */
  token = '';

  /** Persiapan yang harus diakui lebih dulu. */
  siapPerangkat = false;
  siapInternet = false;


  /** Keterangan ujian, muncul setelah tokennya dikenali. */
  ujian: any = null;
  galat = '';

  bahasa = 'id';

  ngOnInit(): void {
    this.bahasa = this.translate.currentLang || 'id';

    const dariTautan = this.route.snapshot.paramMap.get('token');
    if (dariTautan) {
      this.token = dariTautan;
      // Diperiksa langsung; yang datang dari tautan tidak perlu menekan apa
      // pun untuk tahu tautannya masih berlaku.
      this.periksa();
    }
  }

  gantiBahasa(kode: string): void {
    this.bahasa = kode;
    this.translate.use(kode);
  }

  get bolehMulai(): boolean {
    return !!this.ujian && this.siapPerangkat && this.siapInternet;
  }

  periksa(): void {
    const t = this.token.trim();
    if (!t || this.isChecking) return;

    this.isChecking = true;
    this.galat = '';
    this.ujian = null;

    this.http.get<any>(`${environment.url}hr/exam/${t}`).subscribe({
      next: (res) => {
        this.ujian = res;
        this.isChecking = false;
      },
      error: (err) => {
        // Tidak dikenal, dicabut, dan kedaluwarsa dijawab SAMA — sebagaimana
        // server menjawabnya. Membedakannya memberi tahu penebak bahwa
        // tokennya pernah ada.
        this.galat =
          err?.status === 429
            ? this.translate.instant('exam.terlaluSering')
            : this.translate.instant('exam.tokenTidakBerlaku');
        this.isChecking = false;
      },
    });
  }

  /**
   * Sapaan sesuai jenis kelamin.
   *
   * Kosong bila tidak diketahui — menebaknya dari nama lebih buruk daripada
   * menyapa tanpa sebutan.
   */
  get sapaan(): string {
    if (this.ujian?.gender === 'L') return 'Bapak';
    if (this.ujian?.gender === 'P') return 'Ibu';
    return '';
  }

  /**
   * Halaman pengerjaan BELUM ada.
   *
   * Tombolnya sengaja tetap ditampilkan supaya alur sampai titik ini dapat
   * diuji, tetapi menekannya tidak boleh menuju rute yang tidak terdaftar —
   * itu menghasilkan NG04002 dan halaman kosong, yang bagi pelamar terbaca
   * sebagai sistemnya rusak.
   *
   * Ganti isi metode ini dengan `router.navigate` begitu halaman
   * pengerjaannya dibuat.
   */
  mulai(): void {
    if (!this.bolehMulai) return;
    this.router.navigate(['/exam', this.token.trim(), 'start']);
  }
}
